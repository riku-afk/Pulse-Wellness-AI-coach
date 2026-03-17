import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, useColorScheme, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Bell, TrendingUp, Moon, Activity, Sparkles, LogOut } from 'lucide-react-native';
import DailyPulseCheckModal from '../components/PulseModal';
import { router } from 'expo-router';
import { logout, getProfile } from '../services/auth';
import { logDailyPulse, getPulseSummary, PulseSummary } from '../services/pulse';
import { useAppStore } from '../store/appStore';

// ─── Responsive scale ────────────────────────────────────────────────────────
// 375 = iPhone SE / base design width
const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

// ─── Placeholder data ────────────────────────────────────────────────────────
const PULSE_SCORE = 82;
const PULSE_CHANGE = 4;
const PULSE_GOAL = 85;
const CONDITION = 'Excellent Condition';
const AVG_SLEEP = 7.2;
const MOOD_LABEL = 'High';
const SLEEP_DEBT = -45;
const AI_INSIGHT =
    'Your mood improves significantly when you sleep >7 hours. Consider starting your wind-down routine at 10 PM tonight.';
const MOOD_BARS = [40, 50, 45, 55, 50, 85, 60];
const SLEEP_BARS = [30, 35, 40, 38, 42, 37, 40];
const DEBT_DOTS = [30, 60, 45, 35, 50, 40, 65];
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token, profile, setProfile, clearSession } = useAppStore(s => ({
        userId: s.userId,
        token: s.token,
        profile: s.profile,
        setProfile: s.setProfile,
        clearSession: s.clearSession,
    }));

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const handleLogout = async () => {
        await logout();
        clearSession();
        router.replace('/auth/login');
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

    const handlePulseSubmit = async (data: any) => {
        if (userId && token) {
            try {
                await logDailyPulse(userId, token, {
                    moodLevel: data.moodLevel,
                    moodLabel: data.moodLabel,
                    sleepDuration: data.sleepDuration,
                });
                await fetchSummary();
            } catch (e) {
                console.error('Failed to log daily pulse:', e);
            }
        }
        router.push({
            pathname: '/pages/DailyPulseAi',
            params: {
                sleepDuration: data.sleepDuration.toString(),
                moodLevel: data.moodLevel.toString(),
                moodLabel: data.moodLabel,
                moodEmoji: data.moodEmoji,
            },
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => setShowPulseModal(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Fetch profile if not in store yet
    useEffect(() => {
        if (!userId || !token || profile) return;
        getProfile(userId, token)
            .then(setProfile)
            .catch(e => console.error('Failed to fetch profile:', e));
    }, [userId, token, profile]);

    // Refresh pulse summary every time this screen comes into focus
    useFocusEffect(useCallback(() => {
        fetchSummary();
    }, [fetchSummary]));

    const displayName = profile
        ? `${profile.firstName} ${profile.lastName}`
        : getGreeting();

    // Use real data if available, else fall back to placeholders
    const moodBars = pulseSummary?.hasData ? pulseSummary.moodBars : MOOD_BARS;
    const sleepBars = pulseSummary?.hasData ? pulseSummary.sleepBars : SLEEP_BARS;
    const debtDots = pulseSummary?.hasData ? pulseSummary.debtDots : DEBT_DOTS;
    const avgSleep = pulseSummary?.hasData ? pulseSummary.avgSleep : AVG_SLEEP;
    const moodLabel = pulseSummary?.hasData ? pulseSummary.moodStability : MOOD_LABEL;
    const sleepDebt = pulseSummary?.hasData ? -pulseSummary.totalSleepDebt : SLEEP_DEBT;

    const normalizedMoodBars = normalize(moodBars.length ? moodBars : [1], CHART_MOOD_H);
    const normalizedSleepBars = normalize(sleepBars.length ? sleepBars : [1], CHART_SLEEP_H);
    const normalizedDebtDots = normalize(debtDots.length ? debtDots : [1], CHART_DEBT_H);

    const progressWidth = `${(PULSE_SCORE / PULSE_GOAL) * 100}%` as any;

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
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>👤</Text>
                            </View>
                            <View style={styles.statusDot} />
                        </View>
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
                        <TouchableOpacity style={styles.iconButton} onPress={handleLogout} activeOpacity={0.7}>
                            <LogOut size={s(22)} color={isDark ? '#f8fafc' : '#0f172a'} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Daily Pulse Score ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Daily Pulse Score</Text>
                        <View style={styles.changeBadge}>
                            <TrendingUp size={s(14)} color="#10b981" />
                            <Text style={styles.changeBadgeText}>+{PULSE_CHANGE}%</Text>
                        </View>
                    </View>
                    <View style={styles.scoreRow}>
                        <Text style={styles.pulseScore}>{PULSE_SCORE}</Text>
                        <Text style={styles.vsYesterday}>vs. yesterday</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: progressWidth }]} />
                    </View>
                    <View style={styles.conditionRow}>
                        <Text style={styles.conditionText}>{CONDITION}</Text>
                        <Text style={styles.goalText}>Goal: {PULSE_GOAL}</Text>
                    </View>
                </View>

                {/* ── AI Insight ── */}
                <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                        <View style={styles.insightIconBox}>
                            <Sparkles size={s(18)} color="#0ea5e9" />
                        </View>
                        <Text style={styles.insightTitle}>AI Insight</Text>
                        <TouchableOpacity onPress={() => router.push('/pages/DailyPulseAi')} activeOpacity={0.7}>
                            <Text style={styles.viewTipText}>View Tip</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.insightBody}>{AI_INSIGHT}</Text>
                </View>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>

                    {/* Avg Sleep */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Moon size={s(18)} color="#64748b" />
                            <Text style={styles.statLabel}>Avg Sleep</Text>
                        </View>
                        <Text style={styles.statValue}>{avgSleep}h</Text>
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
                        <Text style={styles.statValue}>{moodLabel}</Text>
                        <View style={[styles.barChart, { height: CHART_MOOD_H }]}>
                            {normalizedMoodBars.map((h, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.bar,
                                        { height: h, backgroundColor: i === 5 ? '#0ea5e9' : '#334155' },
                                    ]}
                                />
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
                        <Text style={styles.sleepDebtValue}>{sleepDebt}m</Text>
                    </View>
                    <View style={[styles.dotChart, { height: CHART_DEBT_H }]}>
                        {normalizedDebtDots.map((h, i) => (
                            <View key={i} style={styles.dotColumn}>
                                <View style={[styles.dot, { bottom: h }]} />
                            </View>
                        ))}
                    </View>
                    <View style={styles.weekLabels}>
                        {WEEK_LABELS.map((day, i) => (
                            <Text key={i} style={styles.weekLabel}>{day}</Text>
                        ))}
                    </View>
                </View>

                <View style={{ height: insets.bottom + s(100) }} />
            </ScrollView>

            <DailyPulseCheckModal
                visible={showPulseModal}
                onClose={() => setShowPulseModal(false)}
                onSubmit={handlePulseSubmit}
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
    dotChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        position: 'relative',
    },
    dotColumn: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        position: 'relative',
    },
    dot: {
        width: s(8),
        height: s(8),
        borderRadius: s(4),
        backgroundColor: '#0ea5e9',
        position: 'absolute',
    },
    weekLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(10),
    },
    weekLabel: {
        fontSize: s(11),
        color: '#94a3b8',
        flex: 1,
        textAlign: 'center',
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
    dotChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        position: 'relative',
    },
    dotColumn: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        position: 'relative',
    },
    dot: {
        width: s(8),
        height: s(8),
        borderRadius: s(4),
        backgroundColor: '#0ea5e9',
        position: 'absolute',
    },
    weekLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(10),
    },
    weekLabel: {
        fontSize: s(11),
        color: '#64748b',
        flex: 1,
        textAlign: 'center',
    },
});

export { Dashboard };
