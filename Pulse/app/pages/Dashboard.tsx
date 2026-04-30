import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, useColorScheme, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Bell, TrendingUp, Sparkles, ChevronRight, BookOpen } from 'lucide-react-native';
import DailyPulseCheckModal from '../components/PulseModal';
import PulseAiFloatingModal, { PulseSubmitData } from '../components/PulseAiFloatingModal';
import NotificationModal from '../components/NotificationModal';
import { router } from 'expo-router';
import { getProfile, getUserPrefs, updateUserPrefs } from '../services/auth';
import UserAvatar from '../components/UserAvatar';
import { logDailyPulse, getPulseSummary, getRecentPulse, saveAiSuggestion, PulseSummary, RecentPulseEntry } from '../services/pulse';
import CardStreak from '../components/CardStreak';
import CardWeeklySummary from '../components/CardWeeklySummary';
import CardMoodInsight from '../components/CardMoodInsight';
import { getNotifications } from '../services/notifications';
import { useAppStore } from '../store/appStore';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

const PULSE_GOAL = 85;

function computePulseScore(moodLevel: number, sleepDuration: number): number {
    const moodScore = (moodLevel / 5) * 50;
    const sleepScore = Math.min(sleepDuration / 7, 1) * 50;
    return Math.round(moodScore + sleepScore);
}

function conditionLabel(score: number): string {
    if (score >= 80) return 'Excellent Condition';
    if (score >= 60) return 'Good Condition';
    if (score >= 40) return 'Fair Condition';
    return 'Needs Rest';
}

export default function Dashboard() {
    const [showPulseModal, setShowPulseModal] = useState(false);
    const [pulseSummary, setPulseSummary] = useState<PulseSummary | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);
    const [pendingPulseData, setPendingPulseData] = useState<PulseSubmitData | null>(null);
    const [viewingPulse, setViewingPulse] = useState<RecentPulseEntry | null>(null);
    const [recentPulse, setRecentPulse] = useState<RecentPulseEntry[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token, profile, setProfile, lastPulseCheckedAt, setLastPulseCheckedAt } = useAppStore(s => ({
        userId: s.userId,
        token: s.token,
        profile: s.profile,
        setProfile: s.setProfile,
        lastPulseCheckedAt: s.lastPulseCheckedAt,
        setLastPulseCheckedAt: s.setLastPulseCheckedAt,
    }));

    const getPHMidnightUTC = (): number => {
        const phOffsetMs = 8 * 60 * 60 * 1000;
        const phNow = new Date(Date.now() + phOffsetMs);
        return Date.UTC(phNow.getUTCFullYear(), phNow.getUTCMonth(), phNow.getUTCDate()) - phOffsetMs;
    };

    const lastPulseCheckedAtRef = useRef(lastPulseCheckedAt);
    useEffect(() => {
        lastPulseCheckedAtRef.current = lastPulseCheckedAt;
    }, [lastPulseCheckedAt]);

    const [prefsReady, setPrefsReady] = useState(false);
    const hasMountedRef = useRef(false);

    useEffect(() => {
        if (!userId || !token) { setPrefsReady(true); return; }
        getUserPrefs(userId, token)
            .then(prefs => setLastPulseCheckedAt(prefs.lastPulseCheckedAt))
            .catch(() => {})
            .finally(() => setPrefsReady(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const fetchSummary = useCallback(async () => {
        if (!userId || !token) return;
        try {
            const summary = await getPulseSummary(userId, token);
            setPulseSummary(summary);
        } catch (e) {
            console.error('Failed to fetch pulse summary:', e);
        }
    }, [userId, token]);

    const fetchRecentPulse = useCallback(async () => {
        if (!userId || !token) return;
        try {
            const entries = await getRecentPulse(userId, token);
            setRecentPulse(entries);
        } catch (e) {
            console.error('Failed to fetch recent pulse:', e);
        }
    }, [userId, token]);

    const handlePulseSubmit = async (data: any) => {
        const now = Date.now();
        setLastPulseCheckedAt(now);
        if (userId && token) {
            try {
                const pulseScore = computePulseScore(data.moodLevel, data.sleepDuration);
                await logDailyPulse(userId, token, {
                    moodLevel: data.moodLevel,
                    moodLabel: data.moodLabel,
                    sleepDuration: data.sleepDuration,
                    pulseScore,
                });
                updateUserPrefs(userId, token, { lastPulseCheckedAt: now })
                    .catch(e => console.warn('Failed to save lastPulseCheckedAt:', e));
                await Promise.all([fetchSummary(), fetchRecentPulse()]);
            } catch (e) {
                console.error('Failed to log daily pulse:', e);
            }
        }
        setPendingPulseData({
            sleepDuration: data.sleepDuration,
            moodLevel: data.moodLevel,
            moodLabel: data.moodLabel,
            moodEmoji: data.moodEmoji,
        });
        setShowAiModal(true);
    };

    const handleAiModalClose = async (aiText?: string) => {
        setShowAiModal(false);
        if (aiText && userId && token) {
            const date = new Date().toISOString().split('T')[0];
            try {
                await saveAiSuggestion(userId, token, date, aiText);
            } catch (e) {
                console.error('Failed to save AI suggestion:', e);
            }
        }
        if (userId && token) await fetchRecentPulse();
        setPendingPulseData(null);
    };

    const checkAndShowPulseModal = (delayMs = 500) => {
        const ts = lastPulseCheckedAtRef.current;
        if (ts !== null && ts >= getPHMidnightUTC()) return undefined;
        const timer = setTimeout(() => {
            const latest = lastPulseCheckedAtRef.current;
            if (latest === null || latest < getPHMidnightUTC()) setShowPulseModal(true);
        }, delayMs);
        return timer;
    };

    useEffect(() => {
        if (!prefsReady) return;
        const timer = checkAndShowPulseModal(500);
        return () => { if (timer) clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefsReady]);

    useFocusEffect(useCallback(() => {
        if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
        const timer = checkAndShowPulseModal(1000);
        return () => { if (timer) clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []));

    useEffect(() => {
        if (!userId || !token || profile) return;
        getProfile(userId, token)
            .then(setProfile)
            .catch(e => console.error('Failed to fetch profile:', e));
    }, [userId, token, profile]);

    const fetchUnreadCount = useCallback(async () => {
        if (!userId || !token) return;
        try {
            const result = await getNotifications(userId, token);
            setUnreadCount(result.unreadCount);
        } catch { /* silent */ }
    }, [userId, token]);

    useFocusEffect(useCallback(() => {
        fetchSummary();
        fetchRecentPulse();
        fetchUnreadCount();
    }, [fetchSummary, fetchRecentPulse, fetchUnreadCount]));

    const displayName = profile
        ? `${profile.firstName} ${profile.lastName}`
        : getGreeting();

    const hasStats = pulseSummary?.hasData ?? false;
    const moodBars = hasStats ? pulseSummary!.moodBars : [];
    const moodLabel: string | null = hasStats ? pulseSummary!.moodStability : null;

    const todayEntry = recentPulse[0] ?? null;
    const yesterdayEntry = recentPulse[1] ?? null;
    const pulseScore = todayEntry?.pulseScore ?? null;
    const yesterdayScore = yesterdayEntry?.pulseScore ?? null;
    const pulseChange = pulseScore !== null && yesterdayScore !== null
        ? pulseScore - yesterdayScore
        : null;
    const condition = pulseScore !== null ? conditionLabel(pulseScore) : null;
    const progressWidth = `${Math.min(((pulseScore ?? 0) / PULSE_GOAL) * 100, 100)}%` as any;

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: insets.top + s(12) }}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => router.push('/(tabs)/profile')}
                            activeOpacity={0.7}
                        >
                            <UserAvatar size={s(40)} />
                            <View style={styles.statusDot} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.dashboardLabel}>DASHBOARD</Text>
                            <Text style={styles.greeting}>{displayName}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        onPress={() => setShowNotifications(true)}
                    >
                        <Bell size={s(22)} color={isDark ? '#f8fafc' : '#0f172a'} />
                        {unreadCount > 0 && (
                            <View style={styles.badgeDot}>
                                <Text style={styles.badgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Daily Pulse Score ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Daily Pulse Score</Text>
                        {pulseChange !== null ? (
                            <View style={[styles.changeBadge, { backgroundColor: pulseChange >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                                <TrendingUp size={s(14)} color={pulseChange >= 0 ? '#10b981' : '#ef4444'} />
                                <Text style={[styles.changeBadgeText, { color: pulseChange >= 0 ? '#10b981' : '#ef4444' }]}>
                                    {pulseChange >= 0 ? '+' : ''}{pulseChange}pts
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={styles.scoreRow}>
                        <Text style={styles.pulseScore}>
                            {pulseScore !== null ? pulseScore : '—'}
                        </Text>
                        <Text style={styles.vsYesterday}>
                            {pulseScore !== null ? 'vs. yesterday' : 'No data yet'}
                        </Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: progressWidth }]} />
                    </View>
                    <View style={styles.conditionRow}>
                        <Text style={styles.conditionText}>
                            {condition ?? 'Log your first pulse'}
                        </Text>
                        <Text style={styles.goalText}>Goal: {PULSE_GOAL}</Text>
                    </View>
                </View>

                {/* ── Streak ── */}
                <CardStreak
                    streakDays={pulseSummary?.streakDays ?? 0}
                    isDark={isDark}
                />

                {/* ── Weekly Summary ── */}
                <CardWeeklySummary
                    avgMood={pulseSummary?.avgMood ?? null}
                    avgSleep={hasStats ? pulseSummary!.avgSleep : null}
                    daysLogged={pulseSummary?.daysLogged ?? 0}
                    avgMoodPrev={pulseSummary?.avgMoodPrev ?? null}
                    avgSleepPrev={pulseSummary?.avgSleepPrev ?? null}
                    isDark={isDark}
                />

                {/* ── Mood Trend Insight ── */}
                <CardMoodInsight
                    moodBars={moodBars}
                    avgMood={pulseSummary?.avgMood ?? null}
                    avgMoodPrev={pulseSummary?.avgMoodPrev ?? null}
                    moodStability={moodLabel as 'High' | 'Medium' | 'Low' | null}
                    todayMood={todayEntry?.moodLevel ?? null}
                    isDark={isDark}
                />

                {/* ── Weekly Assessment (AI) ── */}
                <TouchableOpacity
                    style={styles.aiCard}
                    activeOpacity={0.75}
                    onPress={() => router.push('/pages/DailyPulseAi')}
                >
                    <View style={styles.aiCardHeader}>
                        <View style={styles.aiIconBox}>
                            <Sparkles size={s(18)} color="#0ea5e9" />
                        </View>
                        <Text style={styles.aiCardTitle}>Weekly Assessment</Text>
                        {todayEntry?.aiSuggestion ? (
                            <TouchableOpacity onPress={() => setViewingPulse(todayEntry)} activeOpacity={0.7}>
                                <Text style={styles.viewTipText}>View Tip</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <Text style={styles.aiCardBody}>
                        {todayEntry?.aiSuggestion
                            ? todayEntry.aiSuggestion.slice(0, 120) + (todayEntry.aiSuggestion.length > 120 ? '…' : '')
                            : 'Get a personalized weekly wellness report — mood patterns, sleep analysis, and one focused improvement goal.'}
                    </Text>
                    <View style={styles.aiCardFooter}>
                        <Text style={styles.aiCardCta}>View my assessment</Text>
                        <ChevronRight size={s(14)} color="#0ea5e9" />
                    </View>
                </TouchableOpacity>

                {/* ── Journal ── */}
                <TouchableOpacity
                    style={styles.journalCard}
                    activeOpacity={0.75}
                    onPress={() => router.push('/(tabs)/journal')}
                >
                    <View style={styles.journalLeft}>
                        <View style={styles.journalIconBox}>
                            <BookOpen size={s(18)} color="#0ea5e9" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.journalTitle}>Daily Journal</Text>
                            <Text style={styles.journalBody}>Write today's entry and get an AI reflection.</Text>
                        </View>
                    </View>
                    <ChevronRight size={s(18)} color="#0ea5e9" />
                </TouchableOpacity>

                <View style={{ height: insets.bottom + s(100) }} />
            </ScrollView>

            <DailyPulseCheckModal
                visible={showPulseModal}
                onClose={() => setShowPulseModal(false)}
                onSubmit={handlePulseSubmit}
            />

            <PulseAiFloatingModal
                visible={showAiModal}
                mode="stream"
                pulseData={pendingPulseData ?? undefined}
                onClose={handleAiModalClose}
            />

            <PulseAiFloatingModal
                visible={viewingPulse !== null}
                mode="view"
                existingText={viewingPulse?.aiSuggestion}
                pulseData={viewingPulse ? {
                    sleepDuration: viewingPulse.sleepDuration,
                    moodLevel: viewingPulse.moodLevel,
                    moodLabel: viewingPulse.moodLabel,
                    moodEmoji: ['😞', '😕', '😐', '🙂', '😄'][Math.min(Math.max(viewingPulse.moodLevel - 1, 0), 4)],
                } : undefined}
                onClose={() => setViewingPulse(null)}
            />

            <NotificationModal
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
                onUnreadCountChange={setUnreadCount}
            />
        </View>
    );
}

const lightStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scrollView: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: s(20),
        paddingBottom: s(20),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
        flex: 1,
    },
    avatarContainer: { position: 'relative' },
    statusDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: s(12),
        height: s(12),
        borderRadius: s(6),
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#f8fafc',
    },
    dashboardLabel: {
        fontSize: s(11),
        fontWeight: '600',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: s(2),
    },
    greeting: { fontSize: s(18), fontWeight: '700', color: '#0f172a' },
    iconButton: {
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeDot: {
        position: 'absolute',
        top: s(4),
        right: s(4),
        minWidth: s(16),
        height: s(16),
        borderRadius: s(8),
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: s(3),
    },
    badgeText: { fontSize: s(9), fontWeight: '700', color: '#ffffff' },
    card: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#ffffff',
        borderRadius: s(20),
        padding: s(20),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: s(14),
    },
    cardTitle: { fontSize: s(15), fontWeight: '600', color: '#475569' },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(8),
        paddingVertical: s(4),
        borderRadius: s(8),
        gap: s(4),
    },
    changeBadgeText: { fontSize: s(12), fontWeight: '600' },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: s(14),
        gap: s(10),
    },
    pulseScore: {
        fontSize: s(56),
        fontWeight: '700',
        color: '#0f172a',
        lineHeight: s(64),
    },
    vsYesterday: { fontSize: s(13), color: '#94a3b8' },
    progressTrack: {
        height: s(8),
        backgroundColor: '#e2e8f0',
        borderRadius: s(4),
        marginBottom: s(10),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#0ea5e9',
        borderRadius: s(4),
    },
    conditionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    conditionText: { fontSize: s(14), fontWeight: '600', color: '#0f172a' },
    goalText: { fontSize: s(13), color: '#94a3b8' },
    aiCard: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#ffffff',
        borderRadius: s(20),
        padding: s(20),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    aiCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: s(10),
    },
    aiIconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: s(10),
    },
    aiCardTitle: {
        fontSize: s(16),
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
    },
    viewTipText: { fontSize: s(14), fontWeight: '600', color: '#0ea5e9' },
    aiCardBody: {
        fontSize: s(13),
        lineHeight: s(20),
        color: '#64748b',
        marginBottom: s(12),
    },
    aiCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
    },
    aiCardCta: { fontSize: s(13), fontWeight: '600', color: '#0ea5e9' },
    journalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#ffffff',
        borderRadius: s(16),
        paddingHorizontal: s(16),
        paddingVertical: s(14),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    journalLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
    },
    journalIconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    journalTitle: { fontSize: s(15), fontWeight: '700', color: '#0f172a', marginBottom: s(2) },
    journalBody: { fontSize: s(12), color: '#64748b', lineHeight: s(18) },
});

const darkStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollView: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: s(20),
        paddingBottom: s(20),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
        flex: 1,
    },
    avatarContainer: { position: 'relative' },
    statusDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: s(12),
        height: s(12),
        borderRadius: s(6),
        backgroundColor: '#10b981',
        borderWidth: 2,
        borderColor: '#0f172a',
    },
    dashboardLabel: {
        fontSize: s(11),
        fontWeight: '600',
        color: '#64748b',
        letterSpacing: 1,
        marginBottom: s(2),
    },
    greeting: { fontSize: s(18), fontWeight: '700', color: '#f8fafc' },
    iconButton: {
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeDot: {
        position: 'absolute',
        top: s(4),
        right: s(4),
        minWidth: s(16),
        height: s(16),
        borderRadius: s(8),
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: s(3),
    },
    badgeText: { fontSize: s(9), fontWeight: '700', color: '#ffffff' },
    card: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(20),
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: s(14),
    },
    cardTitle: { fontSize: s(15), fontWeight: '600', color: '#94a3b8' },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(8),
        paddingVertical: s(4),
        borderRadius: s(8),
        gap: s(4),
    },
    changeBadgeText: { fontSize: s(12), fontWeight: '600' },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: s(14),
        gap: s(10),
    },
    pulseScore: {
        fontSize: s(56),
        fontWeight: '700',
        color: '#f8fafc',
        lineHeight: s(64),
    },
    vsYesterday: { fontSize: s(13), color: '#64748b' },
    progressTrack: {
        height: s(8),
        backgroundColor: '#334155',
        borderRadius: s(4),
        marginBottom: s(10),
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#0ea5e9',
        borderRadius: s(4),
    },
    conditionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    conditionText: { fontSize: s(14), fontWeight: '600', color: '#f8fafc' },
    goalText: { fontSize: s(13), color: '#64748b' },
    aiCard: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(20),
        borderWidth: 1,
        borderColor: '#334155',
    },
    aiCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: s(10),
    },
    aiIconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: s(10),
    },
    aiCardTitle: {
        fontSize: s(16),
        fontWeight: '700',
        color: '#f8fafc',
        flex: 1,
    },
    viewTipText: { fontSize: s(14), fontWeight: '600', color: '#0ea5e9' },
    aiCardBody: {
        fontSize: s(13),
        lineHeight: s(20),
        color: '#94a3b8',
        marginBottom: s(12),
    },
    aiCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
    },
    aiCardCta: { fontSize: s(13), fontWeight: '600', color: '#0ea5e9' },
    journalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#1e293b',
        borderRadius: s(16),
        paddingHorizontal: s(16),
        paddingVertical: s(14),
        borderWidth: 1,
        borderColor: '#334155',
    },
    journalLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
    },
    journalIconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    journalTitle: { fontSize: s(15), fontWeight: '700', color: '#f8fafc', marginBottom: s(2) },
    journalBody: { fontSize: s(12), color: '#64748b', lineHeight: s(18) },
});

export { Dashboard };
