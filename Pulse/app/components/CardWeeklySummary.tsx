import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Moon, Smile, CalendarDays } from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

interface Props {
    avgMood: number | null;
    avgSleep: number | null;
    daysLogged: number;
    avgMoodPrev: number | null;
    avgSleepPrev: number | null;
    isDark: boolean;
}

function summaryTagline(avgMood: number | null, daysLogged: number): string {
    if (daysLogged === 0) return 'No data yet — log your first pulse!';
    if (daysLogged < 3) return 'Light week on logging — try to check in daily.';
    if (avgMood === null) return 'Keep logging to see your trends.';
    if (avgMood >= 4) return 'A strong week overall. Keep it up!';
    if (avgMood >= 3) return 'A balanced week with room to grow.';
    return 'A tough week — you showed up anyway.';
}

function delta(current: number | null, prev: number | null): number | null {
    if (current === null || prev === null) return null;
    return parseFloat((current - prev).toFixed(1));
}

function TrendBadge({ value, unit, isDark }: { value: number | null; unit: string; isDark: boolean }) {
    if (value === null) return <Text style={[styles.noCompare, { color: isDark ? '#475569' : '#cbd5e1' }]}>no prev. data</Text>;
    const up = value >= 0;
    const color = up ? '#10b981' : '#ef4444';
    const bg = isDark
        ? (up ? '#052e16' : '#450a0a')
        : (up ? '#dcfce7' : '#fee2e2');
    return (
        <View style={[styles.trendBadge, { backgroundColor: bg }]}>
            <Text style={[styles.trendText, { color }]}>
                {up ? '↑' : '↓'} {Math.abs(value)}{unit} vs prev
            </Text>
        </View>
    );
}

export default function CardWeeklySummary({ avgMood, avgSleep, daysLogged, avgMoodPrev, avgSleepPrev, isDark }: Props) {
    const c = isDark ? dark : light;
    const moodDelta = delta(avgMood, avgMoodPrev);
    const sleepDelta = delta(avgSleep, avgSleepPrev);

    return (
        <View style={[styles.card, c.card]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, c.title]}>This Week</Text>
                <View style={[styles.daysBadge, { backgroundColor: isDark ? '#1e3a5f' : '#e0f2fe' }]}>
                    <CalendarDays size={s(12)} color="#0ea5e9" />
                    <Text style={styles.daysText}>{daysLogged} day{daysLogged !== 1 ? 's' : ''} logged</Text>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                {/* Avg Mood */}
                <View style={[styles.statBox, c.statBox]}>
                    <View style={styles.statHeader}>
                        <Smile size={s(14)} color="#64748b" />
                        <Text style={[styles.statLabel, c.statLabel]}>Avg Mood</Text>
                    </View>
                    <Text style={[styles.statValue, c.statValue]}>
                        {avgMood !== null ? `${avgMood}/5` : '—'}
                    </Text>
                    <TrendBadge value={moodDelta} unit="/5" isDark={isDark} />
                </View>

                {/* Avg Sleep */}
                <View style={[styles.statBox, c.statBox]}>
                    <View style={styles.statHeader}>
                        <Moon size={s(14)} color="#64748b" />
                        <Text style={[styles.statLabel, c.statLabel]}>Avg Sleep</Text>
                    </View>
                    <Text style={[styles.statValue, c.statValue]}>
                        {avgSleep !== null ? `${avgSleep}h` : '—'}
                    </Text>
                    <TrendBadge value={sleepDelta} unit="h" isDark={isDark} />
                </View>
            </View>

            {/* Tagline */}
            <Text style={[styles.tagline, c.tagline]}>{summaryTagline(avgMood, daysLogged)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        borderRadius: s(20),
        padding: s(20),
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: s(16),
    },
    title: {
        fontSize: s(17),
        fontWeight: '700',
    },
    daysBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
        paddingHorizontal: s(10),
        paddingVertical: s(4),
        borderRadius: s(20),
    },
    daysText: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#0ea5e9',
    },
    statsRow: {
        flexDirection: 'row',
        gap: s(12),
        marginBottom: s(14),
    },
    statBox: {
        flex: 1,
        borderRadius: s(14),
        padding: s(14),
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(5),
        marginBottom: s(6),
    },
    statLabel: {
        fontSize: s(11),
        fontWeight: '600',
    },
    statValue: {
        fontSize: s(24),
        fontWeight: '700',
        marginBottom: s(8),
    },
    trendBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: s(7),
        paddingVertical: s(3),
        borderRadius: s(6),
    },
    trendText: {
        fontSize: s(10),
        fontWeight: '700',
    },
    noCompare: {
        fontSize: s(10),
        fontStyle: 'italic',
    },
    tagline: {
        fontSize: s(13),
        lineHeight: s(20),
    },
});

const light = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    } as any,
    title: { color: '#0f172a' },
    statBox: { backgroundColor: '#f8fafc' } as any,
    statLabel: { color: '#94a3b8' },
    statValue: { color: '#0f172a' },
    tagline: { color: '#64748b' },
});

const dark = StyleSheet.create({
    card: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    } as any,
    title: { color: '#f8fafc' },
    statBox: { backgroundColor: '#0f172a' } as any,
    statLabel: { color: '#64748b' },
    statValue: { color: '#f8fafc' },
    tagline: { color: '#94a3b8' },
});
