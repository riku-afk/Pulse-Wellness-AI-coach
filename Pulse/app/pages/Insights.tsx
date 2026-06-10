import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, useColorScheme, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Moon, Activity, ChevronRight } from 'lucide-react-native';
import { getPulseSummary, getRecentPulse, PulseSummary, RecentPulseEntry } from '../services/pulse';
import PulseAiFloatingModal from '../components/PulseAiFloatingModal';
import { useAppStore } from '../store/appStore';
import { getCache, setCache } from '../utils/cache';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CHART_SLEEP_H = s(40);
const CHART_MOOD_H = s(60);
const CHART_DEBT_H = s(80);

function normalize(data: number[], containerHeight: number): number[] {
    const max = Math.max(...data);
    if (max === 0) return data.map(() => 0);
    return data.map(v => Math.round((v / max) * containerHeight));
}

export default function Insights() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token } = useAppStore(s => ({ userId: s.userId, token: s.token }));

    const [pulseSummary, setPulseSummary] = useState<PulseSummary | null>(null);
    const [recentPulse, setRecentPulse] = useState<RecentPulseEntry[]>([]);
    const [viewingPulse, setViewingPulse] = useState<RecentPulseEntry | null>(null);

    useFocusEffect(useCallback(() => {
        if (!userId || !token) return;
        const summaryKey = `pulseSummary_${userId}`;
        const recentKey = `recentPulse_${userId}`;
        const cachedSummary = getCache<PulseSummary>(summaryKey);
        const cachedRecent = getCache<RecentPulseEntry[]>(recentKey);
        if (cachedSummary) setPulseSummary(cachedSummary);
        if (cachedRecent) setRecentPulse(cachedRecent);
        getPulseSummary(userId, token)
            .then(data => { setPulseSummary(data); setCache(summaryKey, data); })
            .catch(e => console.error('Insights: summary fetch failed', e));
        getRecentPulse(userId, token)
            .then(data => { setRecentPulse(data); setCache(recentKey, data); })
            .catch(e => console.error('Insights: recent pulse fetch failed', e));
    }, [userId, token]));

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

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: insets.top + s(12), paddingBottom: insets.bottom + s(100) }}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Text style={styles.pageTitle}>Insights</Text>
                    <Text style={styles.pageSub}>Your wellness data at a glance</Text>
                </View>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>

                    {/* Avg Sleep */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <Moon size={s(16)} color="#64748b" />
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
                            <Activity size={s(16)} color="#64748b" />
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

                {/* ── Recent Pulse ── */}
                {recentPulse.length > 0 && (
                    <View style={styles.recentSection}>
                        <View style={styles.recentSectionHeader}>
                            <Text style={styles.recentTitle}>Recent Pulse</Text>
                            {recentPulse.length >= 5 && (
                                <TouchableOpacity onPress={() => router.push('/pages/RecentPulse')} activeOpacity={0.7}>
                                    <Text style={styles.viewAllText}>View All</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {recentPulse.slice(0, 5).map((entry, i) => {
                                const EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
                                const emoji = EMOJIS[Math.min(Math.max(entry.moodLevel - 1, 0), 4)];
                                const moodColor = entry.moodLevel >= 4 ? '#10b981' : entry.moodLevel === 3 ? '#f59e0b' : '#ef4444';
                                const dateObj = new Date(entry.date + 'T00:00:00');
                                const dateLabel = dateObj.toLocaleDateString('en-US', {
                                    weekday: 'short', month: 'short', day: 'numeric',
                                });
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
                                            <Text style={styles.recentSleepText}>{entry.sleepDuration.toFixed(1)}h</Text>
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
            </ScrollView>

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

const lightStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: s(20), paddingBottom: s(20) },
    pageTitle: { fontSize: s(28), fontWeight: '700', color: '#0f172a' },
    pageSub: { fontSize: s(13), color: '#94a3b8', marginTop: s(2) },
    card: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#ffffff',
        borderRadius: s(20),
        padding: s(20),
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
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
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(8),
    },
    statLabel: { fontSize: s(12), fontWeight: '600', color: '#94a3b8', flexShrink: 1 },
    statValue: { fontSize: s(26), fontWeight: '700', color: '#0f172a', marginBottom: s(12) },
    moodLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(12),
    },
    moodBadge: { paddingHorizontal: s(6), paddingVertical: s(2), borderRadius: s(6) },
    moodBadgeText: { fontSize: s(13), fontWeight: '700' },
    miniLineChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    lineBar: { flex: 1, backgroundColor: '#0ea5e9', borderRadius: s(2) },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    bar: { flex: 1, borderRadius: s(3) },
    weekMiniLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(6),
    },
    weekMiniLabel: { fontSize: s(10), color: '#94a3b8', flex: 1, textAlign: 'center' },
    sleepDebtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: s(16),
    },
    sleepDebtTitle: { fontSize: s(17), fontWeight: '700', color: '#0f172a', marginBottom: s(3) },
    sleepDebtSubtitle: { fontSize: s(12), color: '#94a3b8' },
    sleepDebtValueBox: { alignItems: 'flex-end' },
    sleepDebtValue: { fontSize: s(24), fontWeight: '700' },
    sleepDebtTag: { fontSize: s(11), fontWeight: '600', marginTop: s(2) },
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
    debtBarColumn: { flex: 1, position: 'relative' },
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
    weekLabel: { fontSize: s(11), color: '#94a3b8', flex: 1, textAlign: 'center' },
    sleepDebtLegend: { flexDirection: 'row', gap: s(16), marginTop: s(10) },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
    legendDot: { width: s(8), height: s(8), borderRadius: s(4) },
    legendText: { fontSize: s(11), color: '#94a3b8' },
    recentSection: { marginHorizontal: s(20), marginBottom: s(16) },
    recentSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(12),
    },
    recentTitle: { fontSize: s(17), fontWeight: '700', color: '#0f172a' },
    viewAllText: { fontSize: s(13), fontWeight: '600', color: '#0ea5e9' },
    recentCard: {
        width: s(148),
        backgroundColor: '#ffffff',
        borderRadius: s(16),
        padding: s(14),
        marginRight: s(12),
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    recentDate: { fontSize: s(11), color: '#94a3b8', fontWeight: '600', marginBottom: s(6) },
    recentScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(4),
    },
    recentEmoji: { fontSize: s(28) },
    recentScoreBadge: {
        backgroundColor: '#e0f2fe',
        paddingHorizontal: s(6),
        paddingVertical: s(2),
        borderRadius: s(8),
    },
    recentScoreText: { fontSize: s(13), fontWeight: '700', color: '#0284c7' },
    recentMood: { fontSize: s(13), fontWeight: '700', marginBottom: s(4) },
    recentSleepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
        marginBottom: s(8),
    },
    recentSleepText: { fontSize: s(12), color: '#64748b' },
    recentSnippet: { fontSize: s(11), color: '#64748b', lineHeight: s(16), marginBottom: s(8) },
    recentSnippetEmpty: { fontSize: s(11), color: '#cbd5e1', fontStyle: 'italic', marginBottom: s(8) },
    recentViewRow: { flexDirection: 'row', alignItems: 'center', gap: s(2) },
    recentViewText: { fontSize: s(12), fontWeight: '600', color: '#0ea5e9' },
});

const darkStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingHorizontal: s(20), paddingBottom: s(20) },
    pageTitle: { fontSize: s(28), fontWeight: '700', color: '#f8fafc' },
    pageSub: { fontSize: s(13), color: '#64748b', marginTop: s(2) },
    card: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(20),
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
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(8),
    },
    statLabel: { fontSize: s(12), fontWeight: '600', color: '#64748b', flexShrink: 1 },
    statValue: { fontSize: s(26), fontWeight: '700', color: '#f8fafc', marginBottom: s(12) },
    moodLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(12),
    },
    moodBadge: { paddingHorizontal: s(6), paddingVertical: s(2), borderRadius: s(6) },
    moodBadgeText: { fontSize: s(13), fontWeight: '700' },
    miniLineChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    lineBar: { flex: 1, backgroundColor: '#0ea5e9', borderRadius: s(2) },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: s(3),
    },
    bar: { flex: 1, borderRadius: s(3) },
    weekMiniLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: s(6),
    },
    weekMiniLabel: { fontSize: s(10), color: '#64748b', flex: 1, textAlign: 'center' },
    sleepDebtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: s(16),
    },
    sleepDebtTitle: { fontSize: s(17), fontWeight: '700', color: '#f8fafc', marginBottom: s(3) },
    sleepDebtSubtitle: { fontSize: s(12), color: '#64748b' },
    sleepDebtValueBox: { alignItems: 'flex-end' },
    sleepDebtValue: { fontSize: s(24), fontWeight: '700' },
    sleepDebtTag: { fontSize: s(11), fontWeight: '600', marginTop: s(2) },
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
    debtBarColumn: { flex: 1, position: 'relative' },
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
    weekLabel: { fontSize: s(11), color: '#64748b', flex: 1, textAlign: 'center' },
    sleepDebtLegend: { flexDirection: 'row', gap: s(16), marginTop: s(10) },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
    legendDot: { width: s(8), height: s(8), borderRadius: s(4) },
    legendText: { fontSize: s(11), color: '#64748b' },
    recentSection: { marginHorizontal: s(20), marginBottom: s(16) },
    recentSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(12),
    },
    recentTitle: { fontSize: s(17), fontWeight: '700', color: '#f8fafc' },
    viewAllText: { fontSize: s(13), fontWeight: '600', color: '#0ea5e9' },
    recentCard: {
        width: s(148),
        backgroundColor: '#1e293b',
        borderRadius: s(16),
        padding: s(14),
        marginRight: s(12),
    },
    recentDate: { fontSize: s(11), color: '#64748b', fontWeight: '600', marginBottom: s(6) },
    recentScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(4),
    },
    recentEmoji: { fontSize: s(28) },
    recentScoreBadge: {
        backgroundColor: '#1e3a5f',
        paddingHorizontal: s(6),
        paddingVertical: s(2),
        borderRadius: s(8),
    },
    recentScoreText: { fontSize: s(13), fontWeight: '700', color: '#38bdf8' },
    recentMood: { fontSize: s(13), fontWeight: '700', marginBottom: s(4) },
    recentSleepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
        marginBottom: s(8),
    },
    recentSleepText: { fontSize: s(12), color: '#64748b' },
    recentSnippet: { fontSize: s(11), color: '#94a3b8', lineHeight: s(16), marginBottom: s(8) },
    recentSnippetEmpty: { fontSize: s(11), color: '#475569', fontStyle: 'italic', marginBottom: s(8) },
    recentViewRow: { flexDirection: 'row', alignItems: 'center', gap: s(2) },
    recentViewText: { fontSize: s(12), fontWeight: '600', color: '#0ea5e9' },
});

export { Insights };
