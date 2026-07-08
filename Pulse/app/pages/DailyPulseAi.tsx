import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { ArrowLeft, RefreshCw, ArrowUp, Moon, Smile, Calendar, Sparkles } from 'lucide-react-native';
import { streamWeeklyAssessment, WeekEntry } from '../services/PulseAi';
import { getRecentPulse, RecentPulseEntry } from '../services/pulse';
import { useAppStore } from '../store/appStore';
import { triggerHaptic } from '../utils/haptics';
import { getCache, setCache } from '../utils/cache';
import { phDateString } from '../utils/date';

interface CachedAssessment {
    text: string;
    entries: RecentPulseEntry[];
    /** Newest check-in date covered by this assessment — days up to and
     *  including it don't count toward the next cycle's streak. */
    assessedThrough?: string;
}

/**
 * Consecutive daily check-ins ending today (or yesterday, if today's isn't
 * logged yet), not counting days already consumed by the last assessment.
 * A missed day breaks the chain — the streak restarts from zero.
 */
function computeAssessmentStreak(entries: RecentPulseEntry[], assessedThrough?: string): number {
    const dates = new Set(entries.map(e => e.date));
    const DAY = 24 * 60 * 60 * 1000;
    const today = phDateString();
    const yesterday = phDateString(Date.now() - DAY);

    let cursor = dates.has(today) ? today : dates.has(yesterday) ? yesterday : null;
    if (!cursor) return 0;

    let cursorMs = Date.parse(cursor);
    let streak = 0;
    while (cursor && dates.has(cursor) && streak < 7) {
        if (assessedThrough && cursor <= assessedThrough) break;
        streak++;
        cursorMs -= DAY;
        cursor = new Date(cursorMs).toISOString().split('T')[0];
    }
    return streak;
}

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

function moodColor(level: number): string {
    if (level <= 1) return '#ef4444';
    if (level <= 2) return '#f97316';
    if (level <= 3) return '#f59e0b';
    if (level <= 4) return '#84cc16';
    return '#10b981';
}

function avgOf(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

interface FollowUpItem {
    question: string;
    answer: string;
}

export default function DailyPulseAI() {
    const { userId, token } = useAppStore(state => ({ userId: state.userId, token: state.token }));

    const [weekEntries, setWeekEntries] = useState<RecentPulseEntry[]>([]);
    const [assessment, setAssessment] = useState('');
    const [streakDays, setStreakDays] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [followUpText, setFollowUpText] = useState('');
    const [completedFollowUps, setCompletedFollowUps] = useState<FollowUpItem[]>([]);
    const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
    const [streamingAnswer, setStreamingAnswer] = useState('');
    const [isFollowUpStreaming, setIsFollowUpStreaming] = useState(false);

    const assessmentRef = useRef('');
    const charQueueRef = useRef('');
    const networkDoneRef = useRef(false);
    const followUpAnswerRef = useRef('');
    const followUpQueueRef = useRef('');
    const followUpNetworkDoneRef = useRef(false);
    const pendingQuestionRef = useRef('');
    const abortRef = useRef<AbortController | null>(null);
    const weekEntriesRef = useRef<RecentPulseEntry[]>([]);

    // Main assessment typewriter. The drain rate adapts to the queue size:
    // live generation trickles in small chunks (4 chars/tick), but a cached
    // assessment arrives as one big chunk — draining it at the base rate would
    // fake a ~8s "generation". Large queues drain in a fast cascade instead.
    useEffect(() => {
        if (!isStreaming) return;
        charQueueRef.current = '';
        const id = setInterval(() => {
            const queued = charQueueRef.current.length;
            if (queued > 0) {
                const n = Math.max(4, Math.floor(queued / 10));
                const chars = charQueueRef.current.slice(0, n);
                charQueueRef.current = charQueueRef.current.slice(n);
                setAssessment(prev => prev + chars);
            } else if (networkDoneRef.current) {
                networkDoneRef.current = false;
                setIsStreaming(false);
            }
        }, 30);
        return () => clearInterval(id);
    }, [isStreaming]);

    // Follow-up typewriter
    useEffect(() => {
        if (!isFollowUpStreaming) return;
        followUpQueueRef.current = '';
        followUpAnswerRef.current = '';
        const id = setInterval(() => {
            if (followUpQueueRef.current.length > 0) {
                const chars = followUpQueueRef.current.slice(0, 4);
                followUpQueueRef.current = followUpQueueRef.current.slice(4);
                followUpAnswerRef.current += chars;
                setStreamingAnswer(followUpAnswerRef.current);
            } else if (followUpNetworkDoneRef.current) {
                followUpNetworkDoneRef.current = false;
                const finalAnswer = followUpAnswerRef.current;
                const finalQuestion = pendingQuestionRef.current;
                setCompletedFollowUps(prev => [...prev, { question: finalQuestion, answer: finalAnswer }]);
                setPendingQuestion(null);
                setStreamingAnswer('');
                setIsFollowUpStreaming(false);
            }
        }, 30);
        return () => clearInterval(id);
    }, [isFollowUpStreaming]);

    const runAssessment = async (entries: RecentPulseEntry[]) => {
        if (entries.length === 0) {
            setIsLoading(false);
            setError('No pulse data yet. Log at least one day to get your weekly assessment.');
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        assessmentRef.current = '';
        charQueueRef.current = '';
        networkDoneRef.current = false;
        setAssessment('');
        setIsStreaming(true);
        setIsLoading(false);
        setError(null);
        setCompletedFollowUps([]);
        setPendingQuestion(null);
        setStreamingAnswer('');

        const weekHistory: WeekEntry[] = entries.map(e => ({
            date: e.date,
            moodLevel: e.moodLevel,
            moodLabel: e.moodLabel,
            sleepDuration: e.sleepDuration,
            pulseScore: e.pulseScore,
        }));

        try {
            await streamWeeklyAssessment(
                weekHistory,
                (chunk) => {
                    assessmentRef.current += chunk;
                    charQueueRef.current += chunk;
                },
                () => { networkDoneRef.current = true; },
                controller.signal,
            );
            // Persist for instant display on later visits. assessedThrough marks
            // this cycle as consumed — the streak restarts from the next day.
            if (userId && assessmentRef.current.trim()) {
                setCache(`weeklyAssessment_${userId}`, {
                    text: assessmentRef.current,
                    entries,
                    assessedThrough: entries[0]?.date,
                } satisfies CachedAssessment);
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            charQueueRef.current = '';
            networkDoneRef.current = false;
            setIsStreaming(false);
            setError("Couldn't generate your assessment. Tap refresh to try again.");
        }
    };

    /**
     * Streak-gated flow: a new assessment only generates after 7 consecutive
     * daily check-ins that aren't already covered by the previous assessment.
     * Until then the last cached assessment stays viewable and the screen
     * shows streak progress. `forceLive` (refresh button) regenerates when
     * the streak is complete, even if this cycle was already assessed.
     */
    const loadAndAssess = async (forceLive = false) => {
        if (!userId || !token) return;

        const cached = getCache<CachedAssessment>(`weeklyAssessment_${userId}`);
        // Show the cached assessment immediately while we check the streak.
        if (cached?.text) {
            assessmentRef.current = cached.text;
            setAssessment(cached.text);
            if (cached.entries.length > 0) {
                setWeekEntries(cached.entries);
                weekEntriesRef.current = cached.entries;
            }
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const entries = await getRecentPulse(userId, token, 7);
            setWeekEntries(entries);
            weekEntriesRef.current = entries;

            const streak = computeAssessmentStreak(entries, cached?.assessedThrough);
            setStreakDays(streak);

            if (entries.length === 0) {
                setIsLoading(false);
                if (!cached?.text) {
                    setError('No pulse data yet. Log your first daily check-in to start your 7-day streak.');
                }
                return;
            }

            const newestDate = entries[0]?.date;
            const alreadyAssessedThisCycle = cached?.assessedThrough === newestDate;

            if (streak >= 7 && (forceLive || !alreadyAssessedThisCycle)) {
                await runAssessment(entries);
                return;
            }

            // Not due yet (or already assessed today) — cached text stays up.
            setIsLoading(false);
        } catch {
            setIsLoading(false);
            if (!cached?.text) {
                setError("Couldn't load your data. Check your connection and try again.");
            }
        }
    };

    useEffect(() => {
        loadAndAssess();
        return () => { abortRef.current?.abort(); };
    }, []);

    const handleSendFollowUp = async () => {
        const question = followUpText.trim();
        if (!question || isFollowUpStreaming || isStreaming) return;

        triggerHaptic('light');
        setFollowUpText('');
        setPendingQuestion(question);
        pendingQuestionRef.current = question;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        followUpQueueRef.current = '';
        followUpAnswerRef.current = '';
        followUpNetworkDoneRef.current = false;
        setStreamingAnswer('');
        setIsFollowUpStreaming(true);

        const weekHistory: WeekEntry[] = weekEntriesRef.current.map(e => ({
            date: e.date,
            moodLevel: e.moodLevel,
            moodLabel: e.moodLabel,
            sleepDuration: e.sleepDuration,
            pulseScore: e.pulseScore,
        }));

        try {
            await streamWeeklyAssessment(
                weekHistory,
                (chunk) => { followUpQueueRef.current += chunk; },
                () => { followUpNetworkDoneRef.current = true; },
                controller.signal,
                question,
                assessmentRef.current,
            );
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            followUpQueueRef.current = '';
            followUpNetworkDoneRef.current = false;
            setIsFollowUpStreaming(false);
            setCompletedFollowUps(prev => [...prev, {
                question,
                answer: "I'm having trouble right now. Please try again.",
            }]);
            setPendingQuestion(null);
            setStreamingAnswer('');
        }
    };

    const avgMood = weekEntries.length > 0 ? avgOf(weekEntries.map(e => e.moodLevel)) : null;
    const avgSleep = weekEntries.length > 0 ? avgOf(weekEntries.map(e => e.sleepDuration)) : null;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                    <ArrowLeft size={s(22)} color="#f8fafc" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Weekly Pulse</Text>
                    <Text style={styles.headerSub}>AI Wellness Assessment</Text>
                </View>
                <TouchableOpacity
                    style={styles.headerBtn}
                    onPress={() => { triggerHaptic('light'); loadAndAssess(true); }}
                    disabled={isLoading || isStreaming}
                >
                    <RefreshCw size={s(20)} color={isLoading || isStreaming ? '#334155' : '#64748b'} />
                </TouchableOpacity>
            </View>

            {/* Week Stats Strip */}
            {weekEntries.length > 0 && (
                <Animated.View entering={FadeInDown.duration(380)} style={styles.statsStrip}>
                    <View style={styles.statItem}>
                        <Smile size={s(13)} color="#0ea5e9" />
                        <Text style={styles.statValue}>
                            {avgMood!.toFixed(1)}<Text style={styles.statUnit}>/5</Text>
                        </Text>
                        <Text style={styles.statLabel}>Avg Mood</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Moon size={s(13)} color="#818cf8" />
                        <Text style={styles.statValue}>
                            {avgSleep!.toFixed(1)}<Text style={styles.statUnit}>h</Text>
                        </Text>
                        <Text style={styles.statLabel}>Avg Sleep</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Calendar size={s(13)} color="#34d399" />
                        <Text style={styles.statValue}>
                            {weekEntries.length}<Text style={styles.statUnit}>/7</Text>
                        </Text>
                        <Text style={styles.statLabel}>Days</Text>
                    </View>
                    <View style={styles.moodDotsWrap}>
                        {[...weekEntries].reverse().map((e, i) => (
                            <View key={i} style={[styles.moodDot, { backgroundColor: moodColor(e.moodLevel) }]} />
                        ))}
                    </View>
                </Animated.View>
            )}

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Streak progress — a new assessment unlocks at 7 consecutive check-ins */}
                {streakDays !== null && streakDays < 7 && !isLoading && !isStreaming && (
                    <View style={{
                        backgroundColor: '#1e293b', borderRadius: s(16),
                        padding: s(14), marginBottom: s(14),
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: s(8) }}>
                            <Text style={{ color: '#f8fafc', fontSize: s(13), fontWeight: '700' }}>
                                Next weekly assessment
                            </Text>
                            <Text style={{ color: '#0ea5e9', fontSize: s(13), fontWeight: '700' }}>
                                {streakDays}/7 days
                            </Text>
                        </View>
                        <View style={{ height: s(6), borderRadius: s(3), backgroundColor: '#334155', overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${(streakDays / 7) * 100}%`, backgroundColor: '#0ea5e9' }} />
                        </View>
                        <Text style={{ color: '#94a3b8', fontSize: s(11.5), marginTop: s(8), lineHeight: s(16) }}>
                            Check in every day — 7 in a row unlocks a fresh assessment. Missing a day restarts the streak.
                        </Text>
                    </View>
                )}

                {/* Loading */}
                {isLoading && (
                    <View style={styles.centerBox}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                        <Text style={styles.loadingText}>Analyzing your week...</Text>
                    </View>
                )}

                {/* Error */}
                {error && !isLoading && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Assessment card */}
                {(assessment.length > 0 || isStreaming) && !error && (
                    <Animated.View entering={FadeInUp.duration(380)} style={styles.aiCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.aiAvatar}>
                                <Sparkles size={s(16)} color="#0ea5e9" />
                            </View>
                            <Text style={styles.cardLabel}>Pulse AI</Text>
                        </View>
                        {assessment.length === 0 ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#0ea5e9" />
                                <Text style={styles.loadingText}>Thinking...</Text>
                            </View>
                        ) : (
                            <Text style={styles.aiText}>
                                {assessment}{isStreaming ? '▌' : ''}
                            </Text>
                        )}
                    </Animated.View>
                )}

                {/* Completed follow-ups */}
                {completedFollowUps.map((fu, i) => (
                    <View key={i}>
                        <Animated.View entering={FadeInUp.duration(320)} style={styles.userBubble}>
                            <Text style={styles.userBubbleText}>{fu.question}</Text>
                        </Animated.View>
                        <View style={styles.aiCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.aiAvatar}>
                                    <Sparkles size={s(16)} color="#0ea5e9" />
                                </View>
                                <Text style={styles.cardLabel}>Pulse AI</Text>
                            </View>
                            <Text style={styles.aiText}>{fu.answer}</Text>
                        </View>
                    </View>
                ))}

                {/* Currently streaming follow-up */}
                {pendingQuestion && (
                    <>
                        <Animated.View entering={FadeInUp.duration(320)} style={styles.userBubble}>
                            <Text style={styles.userBubbleText}>{pendingQuestion}</Text>
                        </Animated.View>
                        <Animated.View entering={FadeInUp.duration(320).delay(120)} style={styles.aiCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.aiAvatar}>
                                    <Sparkles size={s(16)} color="#0ea5e9" />
                                </View>
                                <Text style={styles.cardLabel}>Pulse AI</Text>
                            </View>
                            {streamingAnswer.length === 0 ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator size="small" color="#0ea5e9" />
                                    <Text style={styles.loadingText}>Thinking...</Text>
                                </View>
                            ) : (
                                <Text style={styles.aiText}>
                                    {streamingAnswer}{isFollowUpStreaming ? '▌' : ''}
                                </Text>
                            )}
                        </Animated.View>
                    </>
                )}

                <View style={{ height: s(100) }} />
            </ScrollView>

            {/* Follow-up input */}
            {!isLoading && !error && assessment.length > 0 && (
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask a follow-up question..."
                        placeholderTextColor="#475569"
                        value={followUpText}
                        onChangeText={setFollowUpText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            followUpText.trim() && !isFollowUpStreaming && !isStreaming && styles.sendBtnActive,
                        ]}
                        onPress={handleSendFollowUp}
                        disabled={!followUpText.trim() || isFollowUpStreaming || isStreaming}
                    >
                        <ArrowUp
                            size={s(18)}
                            color={followUpText.trim() && !isFollowUpStreaming && !isStreaming ? '#fff' : '#475569'}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(20),
        paddingTop: s(60),
        paddingBottom: s(16),
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    headerBtn: {
        width: s(40),
        height: s(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: s(18),
        fontWeight: '700',
        color: '#f8fafc',
    },
    headerSub: {
        fontSize: s(11),
        color: '#64748b',
        marginTop: 2,
    },
    statsStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(20),
        paddingVertical: s(12),
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        gap: s(12),
    },
    statItem: {
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: s(15),
        fontWeight: '700',
        color: '#f8fafc',
    },
    statUnit: {
        fontSize: s(10),
        color: '#64748b',
        fontWeight: '400',
    },
    statLabel: {
        fontSize: s(10),
        color: '#64748b',
    },
    statDivider: {
        width: 1,
        height: s(28),
        backgroundColor: '#334155',
    },
    moodDotsWrap: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: s(4),
    },
    moodDot: {
        width: s(10),
        height: s(10),
        borderRadius: s(5),
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: s(20),
    },
    centerBox: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: s(16),
        paddingVertical: s(60),
    },
    loadingText: {
        fontSize: s(14),
        color: '#64748b',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(10),
        paddingVertical: s(4),
    },
    errorBox: {
        backgroundColor: '#450a0a',
        borderRadius: s(16),
        padding: s(20),
        borderWidth: 1,
        borderColor: '#7f1d1d',
    },
    errorText: {
        fontSize: s(14),
        color: '#fca5a5',
        lineHeight: s(22),
    },
    aiCard: {
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(20),
        marginBottom: s(16),
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(10),
        marginBottom: s(14),
    },
    aiAvatar: {
        width: s(32),
        height: s(32),
        borderRadius: s(16),
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#94a3b8',
    },
    aiText: {
        fontSize: s(14),
        lineHeight: s(24),
        color: '#e2e8f0',
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#0ea5e9',
        borderRadius: s(18),
        borderBottomRightRadius: s(4),
        paddingHorizontal: s(16),
        paddingVertical: s(12),
        maxWidth: '80%',
        marginBottom: s(12),
    },
    userBubbleText: {
        fontSize: s(14),
        color: '#fff',
        lineHeight: s(22),
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(16),
        paddingVertical: s(12),
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        gap: s(10),
    },
    input: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        paddingHorizontal: s(16),
        paddingVertical: s(10),
        fontSize: s(14),
        color: '#f8fafc',
        maxHeight: s(100),
        borderWidth: 1,
        borderColor: '#334155',
    },
    sendBtn: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnActive: {
        backgroundColor: '#0ea5e9',
    },
});

export { DailyPulseAI };
