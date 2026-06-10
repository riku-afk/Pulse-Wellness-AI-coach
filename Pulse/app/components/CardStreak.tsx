import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Flame } from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

interface Props {
    streakDays: number;
    isDark: boolean;
}

function streakMessage(days: number): string {
    if (days === 0) return 'Log today to start your streak!';
    if (days === 1) return 'Great start — come back tomorrow!';
    if (days < 7) return 'Keep it going!';
    if (days < 14) return 'One week strong!';
    if (days < 30) return "You're on fire!";
    return 'Unstoppable!';
}

const MILESTONE = 7;

export default function CardStreak({ streakDays, isDark }: Props) {
    const progress = (streakDays % MILESTONE) / MILESTONE;
    const nextMilestone = Math.ceil((streakDays + 1) / MILESTONE) * MILESTONE;
    const daysToNext = nextMilestone - streakDays;
    const flameColor = streakDays === 0 ? '#94a3b8' : '#f97316';

    const c = isDark ? dark : light;

    return (
        <View style={[styles.card, c.card]}>
            <View style={[styles.iconBox, { backgroundColor: streakDays === 0 ? (isDark ? '#1e293b' : '#f1f5f9') : '#fff7ed' }]}>
                <Flame size={s(22)} color={flameColor} />
            </View>

            <View style={styles.middle}>
                <Text style={[styles.label, c.label]}>Current Streak</Text>
                <View style={styles.countRow}>
                    <Text style={[styles.count, { color: flameColor }]}>{streakDays}</Text>
                    <Text style={[styles.unit, c.unit]}> {streakDays === 1 ? 'day' : 'days'}</Text>
                </View>
                <View style={[styles.progressTrack, c.track]}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: flameColor }]} />
                </View>
                <Text style={[styles.milestone, c.milestone]}>
                    {streakDays === 0 ? `${MILESTONE} day goal` : `${daysToNext} day${daysToNext === 1 ? '' : 's'} to ${nextMilestone}`}
                </Text>
            </View>

            <Text style={[styles.message, c.message]}>{streakMessage(streakDays)}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: s(20),
        marginBottom: s(16),
        borderRadius: s(20),
        padding: s(16),
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(14),
    },
    iconBox: {
        width: s(48),
        height: s(48),
        borderRadius: s(14),
        justifyContent: 'center',
        alignItems: 'center',
    },
    middle: {
        flex: 1,
    },
    label: {
        fontSize: s(11),
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: s(2),
    },
    countRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: s(6),
    },
    count: {
        fontSize: s(30),
        fontWeight: '800',
        lineHeight: s(34),
    },
    unit: {
        fontSize: s(14),
        fontWeight: '600',
    },
    progressTrack: {
        height: s(5),
        borderRadius: s(3),
        overflow: 'hidden',
        marginBottom: s(4),
    },
    progressFill: {
        height: '100%',
        borderRadius: s(2),
    },
    milestone: {
        fontSize: s(10),
        fontWeight: '500',
    },
    message: {
        fontSize: s(11),
        fontWeight: '600',
        maxWidth: s(80),
        textAlign: 'right',
    },
});

const light = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    } as any,
    label: { color: '#94a3b8' },
    unit: { color: '#64748b' },
    track: { backgroundColor: '#f1f5f9' },
    milestone: { color: '#94a3b8' },
    message: { color: '#64748b' },
});

const dark = StyleSheet.create({
    card: {
        backgroundColor: '#1e293b',
    } as any,
    label: { color: '#64748b' },
    unit: { color: '#94a3b8' },
    track: { backgroundColor: '#334155' },
    milestone: { color: '#64748b' },
    message: { color: '#94a3b8' },
});

export { CardStreak };
