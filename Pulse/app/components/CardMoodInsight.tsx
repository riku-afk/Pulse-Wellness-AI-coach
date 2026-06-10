import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Zap } from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

type Sentiment = 'positive' | 'warning' | 'concern' | 'neutral';
type IconName = 'up' | 'down' | 'flat' | 'alert' | 'zap';

interface Insight {
    message: string;
    sentiment: Sentiment;
    icon: IconName;
    subtitle: string;
}

const SENTIMENT_COLOR: Record<Sentiment, string> = {
    positive: '#10b981',
    warning:  '#f59e0b',
    concern:  '#ef4444',
    neutral:  '#64748b',
};

const SENTIMENT_BG_LIGHT: Record<Sentiment, string> = {
    positive: '#f0fdf4',
    warning:  '#fffbeb',
    concern:  '#fef2f2',
    neutral:  '#f8fafc',
};

const SENTIMENT_BG_DARK: Record<Sentiment, string> = {
    positive: '#052e16',
    warning:  '#431407',
    concern:  '#450a0a',
    neutral:  '#1e293b',
};

function computeInsight(
    moodBars: number[],
    avgMood: number | null,
    avgMoodPrev: number | null,
    moodStability: 'High' | 'Medium' | 'Low' | null,
    todayMood: number | null,
): Insight {
    if (moodBars.length === 0 || avgMood === null) {
        return {
            message: 'Start logging your daily pulse to see mood insights here.',
            sentiment: 'neutral',
            icon: 'flat',
            subtitle: 'No data yet',
        };
    }

    const delta = avgMoodPrev !== null ? avgMood - avgMoodPrev : null;

    // Today-specific signals take priority
    if (todayMood === 1) {
        return {
            message: "Today's been rough. Even a short walk or a glass of water can help shift your energy.",
            sentiment: 'concern',
            icon: 'alert',
            subtitle: "Based on today's log",
        };
    }
    if (todayMood === 5) {
        return {
            message: "You're feeling great today! Write about what made it special in your journal — future-you will thank you.",
            sentiment: 'positive',
            icon: 'zap',
            subtitle: "Based on today's log",
        };
    }

    // Week-level signals
    if (avgMood < 2.5) {
        return {
            message: "Your mood has been consistently low this week. Try to connect with someone you trust or carve out genuine rest time.",
            sentiment: 'concern',
            icon: 'alert',
            subtitle: 'Last 7 logged days',
        };
    }
    if (delta !== null && delta < -0.5) {
        return {
            message: "Your mood has dipped compared to the previous period. Sleep and stress levels are usually the first place to look.",
            sentiment: 'warning',
            icon: 'down',
            subtitle: 'Compared to previous period',
        };
    }
    if (delta !== null && delta > 0.5) {
        return {
            message: "Your mood has been improving lately. Keep doing whatever is working — consistency is what makes it stick.",
            sentiment: 'positive',
            icon: 'up',
            subtitle: 'Compared to previous period',
        };
    }
    if (moodStability === 'Low') {
        return {
            message: "Your mood has been quite variable this week. Sleep quality, social time, and stress are common drivers — worth tracking.",
            sentiment: 'warning',
            icon: 'alert',
            subtitle: 'Last 7 logged days',
        };
    }
    if (moodStability === 'High' && avgMood >= 3.5) {
        return {
            message: "Your mood has been stable and positive. That kind of consistency is a great sign for your long-term wellbeing.",
            sentiment: 'positive',
            icon: 'flat',
            subtitle: 'Last 7 logged days',
        };
    }
    if (moodStability === 'High' && avgMood < 3.5) {
        return {
            message: "Mood has been steady but on the lower side. Small habits — morning sunlight, fewer screens before bed — can nudge it upward.",
            sentiment: 'neutral',
            icon: 'flat',
            subtitle: 'Last 7 logged days',
        };
    }

    return {
        message: `Your average mood this week is ${avgMood}/5. Keep logging to build a clearer picture of your patterns.`,
        sentiment: 'neutral',
        icon: 'flat',
        subtitle: 'Last 7 logged days',
    };
}

function InsightIcon({ name, color }: { name: IconName; color: string }) {
    const size = s(20);
    if (name === 'up')    return <TrendingUp  size={size} color={color} />;
    if (name === 'down')  return <TrendingDown size={size} color={color} />;
    if (name === 'alert') return <AlertCircle  size={size} color={color} />;
    if (name === 'zap')   return <Zap          size={size} color={color} />;
    return <Minus size={size} color={color} />;
}

interface Props {
    moodBars: number[];
    avgMood: number | null;
    avgMoodPrev: number | null;
    moodStability: 'High' | 'Medium' | 'Low' | null;
    todayMood: number | null;
    isDark: boolean;
}

export default function CardMoodInsight({ moodBars, avgMood, avgMoodPrev, moodStability, todayMood, isDark }: Props) {
    const insight = computeInsight(moodBars, avgMood, avgMoodPrev, moodStability, todayMood);
    const color = SENTIMENT_COLOR[insight.sentiment];
    const iconBg = isDark ? SENTIMENT_BG_DARK[insight.sentiment] : SENTIMENT_BG_LIGHT[insight.sentiment];

    return (
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight, { borderLeftColor: color }]}>
            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                <InsightIcon name={insight.icon} color={color} />
            </View>
            <View style={styles.body}>
                <Text style={[styles.subtitle, { color }]}>{insight.subtitle.toUpperCase()}</Text>
                <Text style={[styles.message, isDark ? styles.messageDark : styles.messageLight]}>
                    {insight.message}
                </Text>
            </View>
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
        alignItems: 'flex-start',
        gap: s(14),
        borderLeftWidth: s(4),
    },
    cardLight: {
        backgroundColor: '#ffffff',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    cardDark: {
        backgroundColor: '#1e293b',
    },
    iconBox: {
        width: s(44),
        height: s(44),
        borderRadius: s(12),
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    body: {
        flex: 1,
    },
    subtitle: {
        fontSize: s(10),
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: s(4),
    },
    message: {
        fontSize: s(13),
        lineHeight: s(20),
    },
    messageLight: { color: '#334155' },
    messageDark:  { color: '#94a3b8' },
});
