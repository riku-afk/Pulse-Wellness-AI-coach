import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { BookOpen, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';
import { getJournalEntries, JournalEntry } from '../services/journal';

const { width: SW } = require('react-native').Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

function todayDateString(): string {
    const phOffset = 8 * 60 * 60 * 1000;
    const phNow = new Date(Date.now() + phOffset);
    return phNow.toISOString().split('T')[0];
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

function moodColor(tag: number): string {
    if (tag >= 8) return '#10b981';
    if (tag >= 5) return '#f59e0b';
    return '#ef4444';
}

export default function Journal() {
    const isDark = useColorScheme() === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token } = useAppStore(s => ({ userId: s.userId, token: s.token }));

    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchPage = useCallback(async (p: number) => {
        if (!userId || !token) return;
        setLoading(true);
        try {
            const result = await getJournalEntries(userId, token, p);
            setEntries(result.entries);
            setHasMore(result.hasMore);
            setPage(result.page);
        } catch (e) {
            console.error('Failed to fetch journal entries:', e);
        } finally {
            setLoading(false);
        }
    }, [userId, token]);

    useFocusEffect(useCallback(() => {
        fetchPage(1);
    }, [fetchPage]));

    const openEntry = (date: string) => {
        router.push({ pathname: '/pages/JournalEntry', params: { date } });
    };

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
                <Text style={styles.pageTitle}>Journal</Text>
                <TouchableOpacity
                    onPress={() => openEntry(todayDateString())}
                    style={styles.addBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Plus size={s(20)} color="#0ea5e9" />
                </TouchableOpacity>
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
                            <BookOpen size={s(48)} color={isDark ? '#334155' : '#e2e8f0'} />
                            <Text style={styles.emptyText}>No journal entries yet.</Text>
                            <Text style={styles.emptySubText}>Tap the + button to write your first entry.</Text>
                        </View>
                    ) : (
                        entries.map((entry, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.card}
                                activeOpacity={0.75}
                                onPress={() => openEntry(entry.date)}
                            >
                                {/* Date */}
                                <Text style={styles.dateLabel}>{formatDate(entry.date)}</Text>

                                {/* Mood tag */}
                                {entry.moodTag != null && (
                                    <View style={styles.moodRow}>
                                        <View style={[styles.moodBadge, { backgroundColor: moodColor(entry.moodTag) + '22', borderColor: moodColor(entry.moodTag) }]}>
                                            <Text style={[styles.moodBadgeText, { color: moodColor(entry.moodTag) }]}>
                                                Mood {entry.moodTag}/10
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Content preview */}
                                <Text style={styles.preview} numberOfLines={3}>
                                    {entry.content}
                                </Text>

                                {/* AI reflection */}
                                {entry.aiReflection ? (
                                    <View style={styles.reflectionBox}>
                                        <Text style={styles.reflectionLabel}>AI reflection</Text>
                                        <Text style={styles.reflectionText}>{entry.aiReflection}</Text>
                                    </View>
                                ) : null}

                                <View style={styles.viewRow}>
                                    <Text style={styles.viewText}>Open entry</Text>
                                    <ChevronRight size={s(13)} color="#0ea5e9" />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}

                    {/* Pagination */}
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
    addBtn: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: s(20),
        fontWeight: '700',
        color: '#0f172a',
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: {
        paddingTop: s(72),
        alignItems: 'center',
        gap: s(12),
    },
    emptyText: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#0f172a',
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
        marginBottom: s(8),
    },
    moodRow: {
        marginBottom: s(8),
    },
    moodBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: s(10),
        paddingVertical: s(3),
        borderRadius: s(20),
        borderWidth: 1,
    },
    moodBadgeText: {
        fontSize: s(12),
        fontWeight: '600',
    },
    preview: {
        fontSize: s(14),
        color: '#334155',
        lineHeight: s(22),
        marginBottom: s(12),
    },
    reflectionBox: {
        backgroundColor: '#f0f9ff',
        borderLeftWidth: 3,
        borderLeftColor: '#0ea5e9',
        borderRadius: s(8),
        padding: s(10),
        marginBottom: s(12),
    },
    reflectionLabel: {
        fontSize: s(11),
        fontWeight: '700',
        color: '#0ea5e9',
        marginBottom: s(3),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reflectionText: {
        fontSize: s(13),
        color: '#0369a1',
        lineHeight: s(20),
        fontStyle: 'italic',
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
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { fontSize: s(13), fontWeight: '600', color: '#0ea5e9' },
    pageBtnTextDisabled: { color: '#94a3b8' },
    pageIndicator: { fontSize: s(13), fontWeight: '600', color: '#64748b' },
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
    addBtn: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#0c2a3f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: s(20),
        fontWeight: '700',
        color: '#f8fafc',
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: {
        paddingTop: s(72),
        alignItems: 'center',
        gap: s(12),
    },
    emptyText: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#f8fafc',
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
        marginBottom: s(8),
    },
    moodRow: {
        marginBottom: s(8),
    },
    moodBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: s(10),
        paddingVertical: s(3),
        borderRadius: s(20),
        borderWidth: 1,
    },
    moodBadgeText: {
        fontSize: s(12),
        fontWeight: '600',
    },
    preview: {
        fontSize: s(14),
        color: '#94a3b8',
        lineHeight: s(22),
        marginBottom: s(12),
    },
    reflectionBox: {
        backgroundColor: '#0c2233',
        borderLeftWidth: 3,
        borderLeftColor: '#38bdf8',
        borderRadius: s(8),
        padding: s(10),
        marginBottom: s(12),
    },
    reflectionLabel: {
        fontSize: s(11),
        fontWeight: '700',
        color: '#38bdf8',
        marginBottom: s(3),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reflectionText: {
        fontSize: s(13),
        color: '#7dd3fc',
        lineHeight: s(20),
        fontStyle: 'italic',
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
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { fontSize: s(13), fontWeight: '600', color: '#38bdf8' },
    pageBtnTextDisabled: { color: '#64748b' },
    pageIndicator: { fontSize: s(13), fontWeight: '600', color: '#64748b' },
});
