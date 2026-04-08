import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, useColorScheme, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Bell, TrendingUp, Moon, Activity, Sparkles, ChevronRight, BookOpen } from 'lucide-react-native';
import DailyPulseCheckModal from '../components/PulseModal';
import PulseAiFloatingModal, { PulseSubmitData } from '../components/PulseAiFloatingModal';
import { router } from 'expo-router';
import { getProfile, getUserPrefs, updateUserPrefs } from '../services/auth';
import UserAvatar from '../components/UserAvatar';
import { logDailyPulse, getPulseSummary, getRecentPulse, saveAiSuggestion, PulseSummary, RecentPulseEntry } from '../services/pulse';

import { useAppStore } from '../store/appStore';

// ─── Responsive scale ────────────────────────────────────────────────────────
// 375 = iPhone SE / base design width
const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

// ─── UI constants (not mock data) ─────────────────────────────────────────────
const PULSE_GOAL = 85;
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Compute pulse score from mood (0–50) + sleep (0–50), capped to 0–100
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

// Normalize data values so chart items never overflow their container
const normalize = (data: number[], containerHeight: number) => {
    const max = Math.max(...data);
    return data.map(v => Math.round((v / max) * containerHeight));
};

const CHART_SLEEP_H = s(40);
const CHART_MOOD_H = s(60);
const CHART_DEBT_H = s(80);


// ─── Component ───────────────────────────────────────────────────────────────
export default function Dashboard() {
    const [showPulseModal, setShowPulseModal] = useState(false);
    const [pulseSummary, setPulseSummary] = useState<PulseSummary | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);
    const [pendingPulseData, setPendingPulseData] = useState<PulseSubmitData | null>(null);
    const [viewingPulse, setViewingPulse] = useState<RecentPulseEntry | null>(null);
    const [recentPulse, setRecentPulse] = useState<RecentPulseEntry[]>([]);
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

    // Returns the UTC timestamp of 12:00 AM today in Philippine time (UTC+8)
    const getPHMidnightUTC = (): number => {
        const phOffsetMs = 8 * 60 * 60 * 1000;
        const phNow = new Date(Date.now() + phOffsetMs);
        return Date.UTC(phNow.getUTCFullYear(), phNow.getUTCMonth(), phNow.getUTCDate()) - phOffsetMs;
    };

    // Always reflects the latest lastPulseCheckedAt so timer callbacks don't close over stale values.
    const lastPulseCheckedAtRef = useRef(lastPulseCheckedAt);
    useEffect(() => {
        lastPulseCheckedAtRef.current = lastPulseCheckedAt;
    }, [lastPulseCheckedAt]);

    // On mount, fetch this user's prefs from Firestore.
    // This covers app-restarts where no re-login happens and the store has no cached value.
    const [prefsReady, setPrefsReady] = useState(false);
    const hasMountedRef = useRef(false); // distinguishes first focus from subsequent ones

    useEffect(() => {
        if (!userId || !token) { setPrefsReady(true); return; }
        getUserPrefs(userId, token)
            .then(prefs => setLastPulseCheckedAt(prefs.lastPulseCheckedAt))
            .catch(() => { }) // graceful: keep whatever is already in the store
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
                // Persist the timestamp to Firestore so it's tied to this user account,
                // not the device — fire-and-forget, failure doesn't block the UX
                updateUserPrefs(userId, token, { lastPulseCheckedAt: now })
                    .catch(e => console.warn('Failed to save lastPulseCheckedAt:', e));
                // Refresh both so the dashboard reflects the newly logged entry immediately
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
        // Always refresh recent pulse when AI modal closes, with or without a suggestion
        if (userId && token) {
            await fetchRecentPulse();
        }
        setPendingPulseData(null);
    };

    // Helper used by both effects below
    const checkAndShowPulseModal = (delayMs = 500) => {
        const ts = lastPulseCheckedAtRef.current;
        if (ts !== null && ts >= getPHMidnightUTC()) return undefined;
        const timer = setTimeout(() => {
            const latest = lastPulseCheckedAtRef.current;
            if (latest === null || latest < getPHMidnightUTC()) setShowPulseModal(true);
        }, delayMs);
        return timer;
    };

    // Initial check — runs once after server prefs are loaded on mount
    useEffect(() => {
        if (!prefsReady) return;
        const timer = checkAndShowPulseModal(500);
        return () => { if (timer) clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefsReady]);

    // Subsequent-focus check — app from background, tab switch (skip initial mount)
    useFocusEffect(useCallback(() => {
        if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
        const timer = checkAndShowPulseModal(1000);
        return () => { if (timer) clearTimeout(timer); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []));

    // Fetch profile if not in store yet
    useEffect(() => {
        if (!userId || !token || profile) return;
        getProfile(userId, token)
            .then(setProfile)
            .catch(e => console.error('Failed to fetch profile:', e));
    }, [userId, token, profile]);

    // Refresh summary + recent pulse every time this screen comes into focus
    useFocusEffect(useCallback(() => {
        fetchSummary();
        fetchRecentPulse();
    }, [fetchSummary, fetchRecentPulse]));

    const displayName = profile
        ? `${profile.firstName} ${profile.lastName}`
        : getGreeting();

    // Only use real data — no mock fallbacks
    const hasStats = pulseSummary?.hasData ?? false;
    const moodBars = hasStats ? pulseSummary!.moodBars : [];
    const sleepBars = hasStats ? pulseSummary!.sleepBars : [];
    const debtDots = hasStats ? pulseSummary!.debtDots : [];
    const avgSleep: number | null = hasStats ? pulseSummary!.avgSleep : null;
    const moodLabel: string | null = hasStats ? pulseSummary!.moodStability : null;
    const sleepDebt: number | null = hasStats ? -pulseSummary!.totalSleepDebt : null;

    const normalizedMoodBars = normalize(moodBars.length ? moodBars : [1], CHART_MOOD_H);
    const normalizedSleepBars = normalize(sleepBars.length ? sleepBars : [1], CHART_SLEEP_H);
    const normalizedDebtDots = normalize(debtDots.length ? debtDots : [1], CHART_DEBT_H);

    // ── Pulse Score — read from stored logged data ──
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
                            onPress={() => router.push('/pages/Settings')}
                            activeOpacity={0.7}
                        >
                            <UserAvatar size={s(40)} />
                            <View style={styles.statusDot} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.dashboardLabel}>DASHBOARD</Text>
                            <Text style={styles.greeting}>
                                {displayName}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                            <Bell size={s(22)} color={isDark ? '#f8fafc' : '#0f172a'} />
                        </TouchableOpacity>
                    </View>
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

                {/* ── AI Insight ── */}
                <TouchableOpacity
                    style={styles.insightCard}
                    activeOpacity={0.75}
                    onPress={() => router.push('/pages/DailyPulseAi')}
                >
                    <View style={styles.insightHeader}>
                        <View style={styles.insightIconBox}>
                            <Sparkles size={s(18)} color="#0ea5e9" />
                        </View>
                        <Text style={styles.insightTitle}>AI Insight</Text>
                        {recentPulse.length > 0 && recentPulse[0].aiSuggestion ? (
                            <TouchableOpacity
                                onPress={() => setViewingPulse(recentPulse[0])}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.viewTipText}>View Tip</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <Text style={styles.insightBody}>
                        {recentPulse.length > 0 && recentPulse[0].aiSuggestion
                            ? recentPulse[0].aiSuggestion.slice(0, 120) + (recentPulse[0].aiSuggestion.length > 120 ? '…' : '')
                            : 'Log your first pulse check-in to receive personalized AI insights.'}
                    </Text>
                </TouchableOpacity>

                {/* ── Journal ── */}
                <TouchableOpacity
                    style={styles.journalCard}
                    activeOpacity={0.75}
                    onPress={() => router.push('/pages/Journal')}
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

                {/* ── Recent Pulse ── */}
                {recentPulse.length > 0 && (
                    <View style={styles.recentSection}>
                        <View style={styles.recentHeader}>
                            <Text style={styles.recentTitle}>Recent Pulse</Text>
                            {recentPulse.length > 1 && (
                                <TouchableOpacity
                                    onPress={() => router.push('/pages/RecentPulse')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.viewAllText}>View All</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {recentPulse.slice(0, 3).map((entry, i) => {
                                const EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
                                const emoji = EMOJIS[Math.min(Math.max(entry.moodLevel - 1, 0), 4)];
                                const moodColor = entry.moodLevel >= 4 ? '#10b981' : entry.moodLevel === 3 ? '#f59e0b' : '#ef4444';
                                const dateObj = new Date(entry.date + 'T00:00:00');
                                const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.recentCard}
                                        activeOpacity={0.75}
                                        onPress={() => setViewingPulse(entry)}
                                    >
                                        <Text style={styles.recentDate}>{dateLabel}</Text>
                                        <View style={styles.recentScoreRow}>
                                            <Text style={styles.recentEmoji}>{emoji}</Text>
                                            {entry.pulseScore > 0 && (
                                                <View style={styles.recentScoreBadge}>
                                                    <Text style={styles.recentScoreText}>{entry.pulseScore}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={[styles.recentMood, { color: moodColor }]}>{entry.moodLabel}</Text>
                                        <View style={styles.recentSleepRow}>
                                            <Moon size={s(12)} color="#64748b" />
                                            <Text style={styles.recentSleepText}>{entry.sleepDuration.toFixed(1)}h sleep</Text>
                                        </View>
                                        {entry.aiSuggestion ? (
                                            <Text style={styles.recentSnippet} numberOfLines={2}>
                                                {entry.aiSuggestion}
                                            </Text>
                                        ) : (
                                            <Text style={styles.recentSnippetEmpty}>No insight yet</Text>
                                        )}
                                        <View style={styles.recentViewRow}>
                                            <Text style={styles.recentViewText}>View insight</Text>
                                            <ChevronRight size={s(12)} color="#0ea5e9" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
                <View style={styles.recentSection}>
                    <Text style={styles.recentHeader}>
                        <Text style={styles.recentTitle}> Stats</Text>
                    </Text>
                </View>
                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>

                    {/* Avg Sleep */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Moon size={s(18)} color="#64748b" />
                            <Text style={styles.statLabel}>Avg Sleep</Text>
                        </View>
                        <Text style={styles.statValue}>{avgSleep !== null ? `${avgSleep}h` : '—'}</Text>
                        <View style={[styles.miniLineChart, { height: CHART_SLEEP_H }]}>
                            {normalizedSleepBars.map((h, i) => (
                                <View key={i} style={[styles.lineBar, { height: h }]} />
                            ))}
                        </View>
                    </View>

                    {/* Mood Stability */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Activity size={s(18)} color="#64748b" />
                            <Text style={styles.statLabel}>Mood Stability</Text>
                        </View>
                        <View style={styles.moodLabelRow}>
                            <Text style={styles.statValue}>{moodLabel ?? '—'}</Text>
                            {moodLabel !== null && (
                                <View style={[styles.moodBadge, {
                                    backgroundColor: moodLabel === 'High' ? '#dcfce7' : moodLabel === 'Medium' ? '#fef9c3' : '#fee2e2',
                                }]}>
                                    <Text style={[styles.moodBadgeText, {
                                        color: moodLabel === 'High' ? '#16a34a' : moodLabel === 'Medium' ? '#ca8a04' : '#dc2626',
                                    }]}>
                                        {moodLabel === 'High' ? '↑' : moodLabel === 'Medium' ? '→' : '↓'}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={[styles.barChart, { height: CHART_MOOD_H }]}>
                            {moodBars.length > 0 ? normalizedMoodBars.map((h, i) => {
                                const pct = moodBars[i] / Math.max(...moodBars);
                                const barColor = pct > 0.7 ? '#10b981' : pct > 0.4 ? '#f59e0b' : '#ef4444';
                                return (
                                    <View key={i} style={[styles.bar, { height: h, backgroundColor: barColor }]} />
                                );
                            }) : null}
                        </View>
                        <View style={styles.weekMiniLabels}>
                            {WEEK_LABELS.map((d, i) => (
                                <Text key={i} style={styles.weekMiniLabel}>{d[0]}</Text>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── Sleep Debt ── */}
                <View style={styles.card}>
                    <View style={styles.sleepDebtHeader}>
                        <View>
                            <Text style={styles.sleepDebtTitle}>Sleep Debt</Text>
                            <Text style={styles.sleepDebtSubtitle}>Last 7 Days</Text>
                        </View>
                        <View style={styles.sleepDebtValueBox}>
                            {sleepDebt !== null ? (
                                <>
                                    <Text style={[styles.sleepDebtValue, { color: sleepDebt < 0 ? '#ef4444' : '#10b981' }]}>
                                        {sleepDebt < 0 ? '' : '+'}{sleepDebt}m
                                    </Text>
                                    <Text style={[styles.sleepDebtTag, { color: sleepDebt < 0 ? '#ef4444' : '#10b981' }]}>
                                        {sleepDebt < 0 ? 'deficit' : 'surplus'}
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.sleepDebtValue}>—</Text>
                            )}
                        </View>
                    </View>
                    {/* Diverging bar chart: bars grow up (surplus) or down (deficit) from center line */}
                    <View style={[styles.divergingChart, { height: CHART_DEBT_H }]}>
                        <View style={[styles.debtCenterLine, { top: CHART_DEBT_H / 2 }]} />
                        {normalizedDebtDots.map((h, i) => {
                            const mid = CHART_DEBT_H / 2;
                            const isSurplus = h >= mid;
                            const barH = Math.max(Math.abs(h - mid), s(4));
                            const color = isSurplus ? '#10b981' : '#ef4444';
                            return (
                                <View key={i} style={styles.debtBarColumn}>
                                    {isSurplus ? (
                                        <View style={[styles.debtBarSurplus, {
                                            height: barH,
                                            backgroundColor: color,
                                            bottom: mid,
                                        }]} />
                                    ) : (
                                        <View style={[styles.debtBarDeficit, {
                                            height: barH,
                                            backgroundColor: color,
                                            top: mid,
                                        }]} />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                    <View style={styles.weekLabels}>
                        {WEEK_LABELS.map((day, i) => (
                            <Text key={i} style={styles.weekLabel}>{day}</Text>
                        ))}
                    </View>
                    <View style={styles.sleepDebtLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                            <Text style={styles.legendText}>Surplus</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                            <Text style={styles.legendText}>Deficit</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: insets.bottom + s(100) }} />
            </ScrollView>

            <DailyPulseCheckModal
                visible={showPulseModal}
                onClose={() => setShowPulseModal(false)}
                onSubmit={handlePulseSubmit}
            />

            {/* Floating AI modal — stream after pulse submit */}
            <PulseAiFloatingModal
                visible={showAiModal}
                mode="stream"
                pulseData={pendingPulseData ?? undefined}
                onClose={handleAiModalClose}
            />

            {/* Floating AI modal — view saved suggestion from Recent Pulse */}
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
        </View>
    );
}

// ─── Light styles ─────────────────────────────────────────────────────────────

const lightStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
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
    headerActions: {
        flexDirection: 'row',
        gap: s(8),
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: s(48),
        height: s(48),
        borderRadius: s(24),
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: s(22),
    },
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
    greeting: {
        fontSize: s(18),
        fontWeight: '700',
        color: '#0f172a',
    },
    iconButton: {
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    cardTitle: {
        fontSize: s(15),
        fontWeight: '600',
        color: '#475569',
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingHorizontal: s(8),
        paddingVertical: s(4),
        borderRadius: s(8),
        gap: s(4),
    },
    changeBadgeText: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#10b981',
    },
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
    vsYesterday: {
        fontSize: s(13),
        color: '#94a3b8',
    },
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
    conditionText: {
        fontSize: s(14),
        fontWeight: '600',
        color: '#0f172a',
    },
    goalText: {
        fontSize: s(13),
        color: '#94a3b8',
    },
    insightCard: {
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
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: s(10),
    },
    insightIconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: s(10),
    },
    insightTitle: {
        fontSize: s(16),
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
    },
    viewTipText: {
        fontSize: s(14),
        fontWeight: '600',
        color: '#0ea5e9',
    },
    insightBody: {
        fontSize: s(13),
        lineHeight: s(20),
        color: '#64748b',
    },
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
    journalTitle: {
        fontSize: s(15),
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: s(2),
    },
    journalBody: {
        fontSize: s(12),
        color: '#64748b',
        lineHeight: s(18),
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: s(20),
        marginBottom: s(16),
        gap: s(12),
    },
    statCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: s(20),
        padding: s(16),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(8),
    },
    statLabel: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#94a3b8',
        flexShrink: 1,
    },
    statValue: {
        fontSize: s(26),
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: s(12),
    },
    miniLineChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    lineBar: {
        flex: 1,
        backgroundColor: '#0ea5e9',
        borderRadius: s(2),
    },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    bar: {
        flex: 1,
        borderRadius: s(3),
    },
    sleepDebtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: s(16),
    },
    sleepDebtTitle: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: s(3),
    },
    sleepDebtSubtitle: {
        fontSize: s(12),
        color: '#94a3b8',
    },
    sleepDebtValue: {
        fontSize: s(24),
        fontWeight: '700',
        color: '#ef4444',
    },
    divergingChart: {
        flexDirection: 'row',
        position: 'relative',
        gap: s(5),
        marginBottom: s(4),
    },
    debtCenterLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: '#e2e8f0',
        zIndex: 1,
    },
    debtBarColumn: {
        flex: 1,
        position: 'relative',
    },
    debtBarSurplus: {
        position: 'absolute',
        left: '15%',
        right: '15%',
        borderTopLeftRadius: s(4),
        borderTopRightRadius: s(4),
    },
    debtBarDeficit: {
        position: 'absolute',
        left: '15%',
        right: '15%',
        borderBottomLeftRadius: s(4),
        borderBottomRightRadius: s(4),
    },
    weekLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(8),
    },
    weekLabel: {
        fontSize: s(11),
        color: '#94a3b8',
        flex: 1,
        textAlign: 'center',
    },
    moodLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(12),
    },
    moodBadge: {
        paddingHorizontal: s(6),
        paddingVertical: s(2),
        borderRadius: s(6),
    },
    moodBadgeText: {
        fontSize: s(13),
        fontWeight: '700',
    },
    weekMiniLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(6),
    },
    weekMiniLabel: {
        fontSize: s(10),
        color: '#94a3b8',
        flex: 1,
        textAlign: 'center',
    },
    sleepDebtValueBox: {
        alignItems: 'flex-end',
    },
    sleepDebtTag: {
        fontSize: s(11),
        fontWeight: '600',
        marginTop: s(2),
    },
    debtReferenceLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    sleepDebtLegend: {
        flexDirection: 'row',
        gap: s(16),
        marginTop: s(10),
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
    },
    legendDot: {
        width: s(8),
        height: s(8),
        borderRadius: s(4),
    },
    legendText: {
        fontSize: s(11),
        color: '#94a3b8',
    },
    recentSection: {
        marginHorizontal: s(20),
        marginBottom: s(16),
    },
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(12),
    },
    recentTitle: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#0f172a',
    },
    viewAllText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#0ea5e9',
    },
    recentScroll: {
        flexDirection: 'row',
    },
    recentCard: {
        width: s(148),
        backgroundColor: '#ffffff',
        borderRadius: s(16),
        padding: s(14),
        marginRight: s(12),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    recentDate: {
        fontSize: s(11),
        color: '#94a3b8',
        fontWeight: '600',
        marginBottom: s(6),
    },
    recentScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(4),
    },
    recentEmoji: {
        fontSize: s(28),
    },
    recentScoreBadge: {
        backgroundColor: '#e0f2fe',
        paddingHorizontal: s(6),
        paddingVertical: s(2),
        borderRadius: s(8),
    },
    recentScoreText: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#0284c7',
    },
    recentMood: {
        fontSize: s(13),
        fontWeight: '700',
        marginBottom: s(4),
    },
    recentSleepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
        marginBottom: s(8),
    },
    recentSleepText: {
        fontSize: s(12),
        color: '#64748b',
    },
    recentSnippet: {
        fontSize: s(11),
        color: '#64748b',
        lineHeight: s(16),
        marginBottom: s(8),
    },
    recentSnippetEmpty: {
        fontSize: s(11),
        color: '#cbd5e1',
        fontStyle: 'italic',
        marginBottom: s(8),
    },
    recentViewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(2),
    },
    recentViewText: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

// ─── Dark styles ──────────────────────────────────────────────────────────────

const darkStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollView: {
        flex: 1,
    },
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
    headerActions: {
        flexDirection: 'row',
        gap: s(8),
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: s(48),
        height: s(48),
        borderRadius: s(24),
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: s(22),
    },
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
    greeting: {
        fontSize: s(18),
        fontWeight: '700',
        color: '#f8fafc',
    },
    iconButton: {
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    cardTitle: {
        fontSize: s(15),
        fontWeight: '600',
        color: '#94a3b8',
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#064e3b',
        paddingHorizontal: s(8),
        paddingVertical: s(4),
        borderRadius: s(8),
        gap: s(4),
    },
    changeBadgeText: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#10b981',
    },
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
    vsYesterday: {
        fontSize: s(13),
        color: '#64748b',
    },
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
    conditionText: {
        fontSize: s(14),
        fontWeight: '600',
        color: '#f8fafc',
    },
    goalText: {
        fontSize: s(13),
        color: '#64748b',
    },
    insightCard: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(20),
        borderWidth: 1,
        borderColor: '#334155',
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: s(10),
    },
    insightIconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: s(10),
    },
    insightTitle: {
        fontSize: s(16),
        fontWeight: '700',
        color: '#f8fafc',
        flex: 1,
    },
    viewTipText: {
        fontSize: s(14),
        fontWeight: '600',
        color: '#0ea5e9',
    },
    insightBody: {
        fontSize: s(13),
        lineHeight: s(20),
        color: '#94a3b8',
    },
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
    journalTitle: {
        fontSize: s(15),
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: s(2),
    },
    journalBody: {
        fontSize: s(12),
        color: '#64748b',
        lineHeight: s(18),
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: s(20),
        marginBottom: s(16),
        gap: s(12),
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(16),
        borderWidth: 1,
        borderColor: '#334155',
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(8),
    },
    statLabel: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#64748b',
        flexShrink: 1,
    },
    statValue: {
        fontSize: s(26),
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: s(12),
    },
    miniLineChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    lineBar: {
        flex: 1,
        backgroundColor: '#0ea5e9',
        borderRadius: s(2),
    },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    bar: {
        flex: 1,
        borderRadius: s(3),
    },
    sleepDebtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: s(16),
    },
    sleepDebtTitle: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: s(3),
    },
    sleepDebtSubtitle: {
        fontSize: s(12),
        color: '#64748b',
    },
    sleepDebtValue: {
        fontSize: s(24),
        fontWeight: '700',
        color: '#ef4444',
    },
    divergingChart: {
        flexDirection: 'row',
        position: 'relative',
        gap: s(5),
        marginBottom: s(4),
    },
    debtCenterLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: '#334155',
        zIndex: 1,
    },
    debtBarColumn: {
        flex: 1,
        position: 'relative',
    },
    debtBarSurplus: {
        position: 'absolute',
        left: '15%',
        right: '15%',
        borderTopLeftRadius: s(4),
        borderTopRightRadius: s(4),
    },
    debtBarDeficit: {
        position: 'absolute',
        left: '15%',
        right: '15%',
        borderBottomLeftRadius: s(4),
        borderBottomRightRadius: s(4),
    },
    weekLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(8),
    },
    weekLabel: {
        fontSize: s(11),
        color: '#64748b',
        flex: 1,
        textAlign: 'center',
    },
    moodLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(12),
    },
    moodBadge: {
        paddingHorizontal: s(6),
        paddingVertical: s(2),
        borderRadius: s(6),
    },
    moodBadgeText: {
        fontSize: s(13),
        fontWeight: '700',
    },
    weekMiniLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(6),
    },
    weekMiniLabel: {
        fontSize: s(10),
        color: '#64748b',
        flex: 1,
        textAlign: 'center',
    },
    sleepDebtValueBox: {
        alignItems: 'flex-end',
    },
    sleepDebtTag: {
        fontSize: s(11),
        fontWeight: '600',
        marginTop: s(2),
    },
    debtReferenceLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#334155',
    },
    sleepDebtLegend: {
        flexDirection: 'row',
        gap: s(16),
        marginTop: s(10),
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
    },
    legendDot: {
        width: s(8),
        height: s(8),
        borderRadius: s(4),
    },
    legendText: {
        fontSize: s(11),
        color: '#64748b',
    },
    recentSection: {
        marginHorizontal: s(20),
        marginBottom: s(16),
    },
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(12),
    },
    recentTitle: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#f8fafc',
    },
    viewAllText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#0ea5e9',
    },
    recentScroll: {
        flexDirection: 'row',
    },
    recentCard: {
        width: s(148),
        backgroundColor: '#1e293b',
        borderRadius: s(16),
        padding: s(14),
        marginRight: s(12),
        borderWidth: 1,
        borderColor: '#334155',
    },
    recentDate: {
        fontSize: s(11),
        color: '#64748b',
        fontWeight: '600',
        marginBottom: s(6),
    },
    recentScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(4),
    },
    recentEmoji: {
        fontSize: s(28),
    },
    recentScoreBadge: {
        backgroundColor: '#1e3a5f',
        paddingHorizontal: s(6),
        paddingVertical: s(2),
        borderRadius: s(8),
    },
    recentScoreText: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#38bdf8',
    },
    recentMood: {
        fontSize: s(13),
        fontWeight: '700',
        marginBottom: s(4),
    },
    recentSleepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
        marginBottom: s(8),
    },
    recentSleepText: {
        fontSize: s(12),
        color: '#64748b',
    },
    recentSnippet: {
        fontSize: s(11),
        color: '#94a3b8',
        lineHeight: s(16),
        marginBottom: s(8),
    },
    recentSnippetEmpty: {
        fontSize: s(11),
        color: '#475569',
        fontStyle: 'italic',
        marginBottom: s(8),
    },
    recentViewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(2),
    },
    recentViewText: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

export { Dashboard };
