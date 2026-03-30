import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Moon, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';
import { getPulseHistory, RecentPulseEntry } from '../services/pulse';
import PulseAiFloatingModal from '../components/PulseAiFloatingModal';
import { router } from 'expo-router';

const { width: SW } = require('react-native').Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

const EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];

function moodEmoji(level: number): string {
    return EMOJIS[Math.min(Math.max(level - 1, 0), 4)];
}

function moodColor(level: number): string {
    if (level >= 4) return '#10b981';
    if (level === 3) return '#f59e0b';
    return '#ef4444';
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function scoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
}

export default function RecentPulse() {
    const isDark = useColorScheme() === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token } = useAppStore(s => ({ userId: s.userId, token: s.token }));

    const [entries, setEntries] = useState<RecentPulseEntry[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [viewingPulse, setViewingPulse] = useState<RecentPulseEntry | null>(null);

    const fetchPage = useCallback(async (p: number) => {
        if (!userId || !token) return;
        setLoading(true);
        try {
            const result = await getPulseHistory(userId, token, p);
            setEntries(result.entries);
            setHasMore(result.hasMore);
            setPage(result.page);
        } catch (e) {
            console.error('Failed to fetch pulse history:', e);
        } finally {
            setLoading(false);
        }
    }, [userId, token]);

    useFocusEffect(useCallback(() => {
        fetchPage(1);
    }, [fetchPage]));

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronLeft size={s(24)} color={isDark ? '#f8fafc' : '#0f172a'} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Pulse History</Text>
                <View style={{ width: s(40) }} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: s(20), paddingBottom: insets.bottom + s(32) }}
                >
                    {entries.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No pulse entries yet.</Text>
                            <Text style={styles.emptySubText}>Complete your daily check-in to start tracking.</Text>
                        </View>
                    ) : (
                        entries.map((entry, i) => {
                            const emoji = moodEmoji(entry.moodLevel);
                            const color = moodColor(entry.moodLevel);
                            const sColor = scoreColor(entry.pulseScore);
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.card}
                                    activeOpacity={0.75}
                                    onPress={() => setViewingPulse(entry)}
                                >
                                    {/* Date row */}
                                    <Text style={styles.dateLabel}>{formatDate(entry.date)}</Text>

                                    {/* Score + Mood row */}
                                    <View style={styles.topRow}>
                                        <View style={styles.moodBlock}>
                                            <Text style={styles.emoji}>{emoji}</Text>
                                            <View>
                                                <Text style={[styles.moodLabel, { color }]}>{entry.moodLabel}</Text>
                                                <Text style={styles.moodSub}>mood</Text>
                                            </View>
                                        </View>
                                        {entry.pulseScore > 0 && (
                                            <View style={[styles.scoreBadge, { borderColor: sColor }]}>
                                                <Text style={[styles.scoreNumber, { color: sColor }]}>{entry.pulseScore}</Text>
                                                <Text style={[styles.scoreLabel, { color: sColor }]}>score</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Sleep row */}
                                    <View style={styles.sleepRow}>
                                        <Moon size={s(13)} color="#64748b" />
                                        <Text style={styles.sleepText}>{entry.sleepDuration.toFixed(1)}h sleep</Text>
                                        {entry.sleepDebt > 0 && (
                                            <View style={styles.debtChip}>
                                                <Text style={styles.debtChipText}>−{entry.sleepDebt}m debt</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* AI Snippet */}
                                    {entry.aiSuggestion ? (
                                        <Text style={styles.aiSnippet} numberOfLines={2}>{entry.aiSuggestion}</Text>
                                    ) : (
                                        <Text style={styles.aiSnippetEmpty}>No AI insight saved</Text>
                                    )}

                                    {/* View insight link */}
                                    <View style={styles.viewRow}>
                                        <Text style={styles.viewText}>View full insight</Text>
                                        <ChevronRight size={s(13)} color="#0ea5e9" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}

                    {/* Pagination controls */}
                    {(page > 1 || hasMore) && (
                        <View style={styles.pagination}>
                            <TouchableOpacity
                                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                                onPress={() => { if (page > 1) fetchPage(page - 1); }}
                                disabled={page <= 1}
                                activeOpacity={0.7}
                            >
                                <ChevronLeft size={s(16)} color={page <= 1 ? '#94a3b8' : '#0ea5e9'} />
                                <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Previous</Text>
                            </TouchableOpacity>

                            <Text style={styles.pageIndicator}>Page {page}</Text>

                            <TouchableOpacity
                                style={[styles.pageBtn, !hasMore && styles.pageBtnDisabled]}
                                onPress={() => { if (hasMore) fetchPage(page + 1); }}
                                disabled={!hasMore}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.pageBtnText, !hasMore && styles.pageBtnTextDisabled]}>Next</Text>
                                <ChevronRight size={s(16)} color={!hasMore ? '#94a3b8' : '#0ea5e9'} />
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* AI Insight modal */}
            <PulseAiFloatingModal
                visible={viewingPulse !== null}
                mode="view"
                existingText={viewingPulse?.aiSuggestion}
                pulseData={viewingPulse ? {
                    sleepDuration: viewingPulse.sleepDuration,
                    moodLevel: viewingPulse.moodLevel,
                    moodLabel: viewingPulse.moodLabel,
                    moodEmoji: moodEmoji(viewingPulse.moodLevel),
                } : undefined}
                onClose={() => setViewingPulse(null)}
            />
        </View>
    );
}

const lightStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(16),
        paddingBottom: s(16),
    },
    backBtn: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: s(20),
        fontWeight: '700',
        color: '#0f172a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        paddingTop: s(60),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: s(8),
    },
    emptySubText: {
        fontSize: s(13),
        color: '#94a3b8',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: s(20),
        padding: s(18),
        marginBottom: s(14),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    dateLabel: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#0ea5e9',
        marginBottom: s(12),
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(12),
    },
    moodBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(10),
    },
    emoji: {
        fontSize: s(36),
    },
    moodLabel: {
        fontSize: s(16),
        fontWeight: '700',
    },
    moodSub: {
        fontSize: s(12),
        color: '#94a3b8',
        marginTop: s(2),
    },
    scoreBadge: {
        borderWidth: 2,
        borderRadius: s(14),
        paddingHorizontal: s(12),
        paddingVertical: s(6),
        alignItems: 'center',
    },
    scoreNumber: {
        fontSize: s(22),
        fontWeight: '700',
        lineHeight: s(26),
    },
    scoreLabel: {
        fontSize: s(10),
        fontWeight: '600',
    },
    sleepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(10),
    },
    sleepText: {
        fontSize: s(13),
        color: '#64748b',
        flex: 1,
    },
    debtChip: {
        backgroundColor: '#fee2e2',
        paddingHorizontal: s(8),
        paddingVertical: s(2),
        borderRadius: s(8),
    },
    debtChipText: {
        fontSize: s(11),
        fontWeight: '600',
        color: '#ef4444',
    },
    aiSnippet: {
        fontSize: s(13),
        color: '#64748b',
        lineHeight: s(20),
        marginBottom: s(10),
    },
    aiSnippetEmpty: {
        fontSize: s(13),
        color: '#cbd5e1',
        fontStyle: 'italic',
        marginBottom: s(10),
    },
    viewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
    },
    viewText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#0ea5e9',
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: s(8),
        marginBottom: s(8),
    },
    pageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
        paddingHorizontal: s(14),
        paddingVertical: s(10),
        backgroundColor: '#ffffff',
        borderRadius: s(12),
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    pageBtnDisabled: {
        opacity: 0.4,
    },
    pageBtnText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#0ea5e9',
    },
    pageBtnTextDisabled: {
        color: '#94a3b8',
    },
    pageIndicator: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#64748b',
    },
});

const darkStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(16),
        paddingBottom: s(16),
    },
    backBtn: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: s(20),
        fontWeight: '700',
        color: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        paddingTop: s(60),
        alignItems: 'center',
    },
    emptyText: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: s(8),
    },
    emptySubText: {
        fontSize: s(13),
        color: '#64748b',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(18),
        marginBottom: s(14),
        borderWidth: 1,
        borderColor: '#334155',
    },
    dateLabel: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#38bdf8',
        marginBottom: s(12),
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s(12),
    },
    moodBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(10),
    },
    emoji: {
        fontSize: s(36),
    },
    moodLabel: {
        fontSize: s(16),
        fontWeight: '700',
    },
    moodSub: {
        fontSize: s(12),
        color: '#64748b',
        marginTop: s(2),
    },
    scoreBadge: {
        borderWidth: 2,
        borderRadius: s(14),
        paddingHorizontal: s(12),
        paddingVertical: s(6),
        alignItems: 'center',
    },
    scoreNumber: {
        fontSize: s(22),
        fontWeight: '700',
        lineHeight: s(26),
    },
    scoreLabel: {
        fontSize: s(10),
        fontWeight: '600',
    },
    sleepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(10),
    },
    sleepText: {
        fontSize: s(13),
        color: '#94a3b8',
        flex: 1,
    },
    debtChip: {
        backgroundColor: '#450a0a',
        paddingHorizontal: s(8),
        paddingVertical: s(2),
        borderRadius: s(8),
    },
    debtChipText: {
        fontSize: s(11),
        fontWeight: '600',
        color: '#f87171',
    },
    aiSnippet: {
        fontSize: s(13),
        color: '#94a3b8',
        lineHeight: s(20),
        marginBottom: s(10),
    },
    aiSnippetEmpty: {
        fontSize: s(13),
        color: '#475569',
        fontStyle: 'italic',
        marginBottom: s(10),
    },
    viewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
    },
    viewText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#38bdf8',
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: s(8),
        marginBottom: s(8),
    },
    pageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(4),
        paddingHorizontal: s(14),
        paddingVertical: s(10),
        backgroundColor: '#1e293b',
        borderRadius: s(12),
        borderWidth: 1,
        borderColor: '#334155',
    },
    pageBtnDisabled: {
        opacity: 0.4,
    },
    pageBtnText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#38bdf8',
    },
    pageBtnTextDisabled: {
        color: '#64748b',
    },
    pageIndicator: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#64748b',
    },
});
