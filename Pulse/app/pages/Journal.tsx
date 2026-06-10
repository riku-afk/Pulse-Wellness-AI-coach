import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Pressable,
    StyleSheet, ActivityIndicator, useColorScheme,
    TextInput, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { BookOpen, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';
import { getJournalEntries, searchJournalEntries, JournalEntry } from '../services/journal';
import { getCache, setCache } from '../utils/cache';

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
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
}

function moodColor(tag: number): string {
    if (tag >= 8) return '#10b981';
    if (tag >= 5) return '#f59e0b';
    return '#ef4444';
}

// Renders text with matching keyword highlighted
function HighlightedText({ text, query, style, highlightStyle, numberOfLines }: {
    text: string;
    query: string;
    style: any;
    highlightStyle: any;
    numberOfLines?: number;
}) {
    if (!query.trim()) {
        return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <Text style={style} numberOfLines={numberOfLines}>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <Text key={i} style={highlightStyle}>{part}</Text>
                    : part
            )}
        </Text>
    );
}

export default function Journal() {
    const isDark = useColorScheme() === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token } = useAppStore(s => ({ userId: s.userId, token: s.token }));

    // Paginated browse
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);

    // Search
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<JournalEntry[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<TextInput>(null);

    const isSearchActive = showSearch && searchQuery.trim().length > 0;

    const fetchPage = useCallback(async (p: number) => {
        if (!userId || !token) return;
        const key = `journal_${userId}_p${p}`;
        const cached = p === 1
            ? getCache<{ entries: JournalEntry[]; hasMore: boolean; page: number }>(key)
            : null;
        if (cached) {
            setEntries(cached.entries);
            setHasMore(cached.hasMore);
            setPage(cached.page);
        } else {
            setLoading(true);
        }
        try {
            const result = await getJournalEntries(userId, token, p);
            setEntries(result.entries);
            setHasMore(result.hasMore);
            setPage(result.page);
            if (p === 1) setCache(key, result);
        } catch (e) {
            console.error('Failed to fetch journal entries:', e);
        } finally {
            setLoading(false);
        }
    }, [userId, token]);

    useFocusEffect(useCallback(() => {
        fetchPage(1);
    }, [fetchPage]));

    // Debounced search — fires 350ms after the user stops typing
    useEffect(() => {
        if (!showSearch) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!searchQuery.trim()) {
            setSearchResults([]);
            setSearchError(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            if (!userId || !token) return;
            setSearchLoading(true);
            setSearchError(false);
            try {
                const results = await searchJournalEntries(userId, token, searchQuery.trim());
                setSearchResults(results);
            } catch {
                setSearchError(true);
            } finally {
                setSearchLoading(false);
            }
        }, 350);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, showSearch, userId, token]);

    const openSearch = () => {
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    const closeSearch = () => {
        Keyboard.dismiss();
        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        setSearchError(false);
    };

    const openEntry = (date: string) => {
        router.push({ pathname: '/pages/JournalEntry', params: { date } });
    };

    const highlightStyle = {
        backgroundColor: isDark ? '#854d0e' : '#fef08a',
        color: isDark ? '#fef9c3' : '#0f172a',
        fontWeight: '700' as const,
    };

    const displayedEntries = isSearchActive ? searchResults : entries;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
                <TouchableOpacity
                    onPress={showSearch ? closeSearch : () => router.back()}
                    style={styles.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronLeft size={s(24)} color={isDark ? '#f8fafc' : '#0f172a'} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Journal</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={showSearch ? closeSearch : openSearch}
                        style={styles.iconBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {showSearch
                            ? <X size={s(18)} color={isDark ? '#f8fafc' : '#0f172a'} />
                            : <Search size={s(18)} color={isDark ? '#f8fafc' : '#0f172a'} />
                        }
                    </TouchableOpacity>
                    {!showSearch && (
                        <TouchableOpacity
                            onPress={() => openEntry(todayDateString())}
                            style={styles.addBtn}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Plus size={s(20)} color="#0ea5e9" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Search bar */}
            {showSearch && (
                <View style={styles.searchBarRow}>
                    <Search size={s(16)} color="#64748b" style={{ marginRight: s(8) }} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Search entries…"
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={s(16)} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Content */}
            {loading && !showSearch && entries.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingHorizontal: s(20), paddingBottom: insets.bottom + s(100) }}
                >
                    {/* Search status row */}
                    {isSearchActive && (
                        <View style={styles.searchStatusRow}>
                            {searchLoading
                                ? <ActivityIndicator size="small" color="#0ea5e9" />
                                : <Text style={styles.searchStatusText}>
                                    {searchError
                                        ? 'Search failed — try again'
                                        : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery.trim()}"`
                                    }
                                </Text>
                            }
                        </View>
                    )}

                    {/* Empty states */}
                    {!searchLoading && displayedEntries.length === 0 && (
                        <View style={styles.emptyContainer}>
                            {isSearchActive ? (
                                <>
                                    <Search size={s(48)} color={isDark ? '#334155' : '#e2e8f0'} />
                                    <Text style={styles.emptyText}>No results found</Text>
                                    <Text style={styles.emptySubText}>Try a different keyword.</Text>
                                </>
                            ) : (
                                <>
                                    <BookOpen size={s(48)} color={isDark ? '#334155' : '#e2e8f0'} />
                                    <Text style={styles.emptyText}>No journal entries yet.</Text>
                                    <Text style={styles.emptySubText}>Tap the + button to write your first entry.</Text>
                                </>
                            )}
                        </View>
                    )}

                    {/* Entry cards */}
                    {displayedEntries.map((entry, i) => (
                        <Pressable
                            key={i}
                            style={({ pressed }) => [
                                styles.card,
                                pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                            ]}
                            onPress={() => openEntry(entry.date)}
                        >
                            <Text style={styles.dateLabel}>{formatDate(entry.date)}</Text>

                            {entry.moodTag != null && (
                                <View style={styles.moodRow}>
                                    <View style={[styles.moodBadge, { backgroundColor: moodColor(entry.moodTag) + '22', borderColor: moodColor(entry.moodTag) }]}>
                                        <Text style={[styles.moodBadgeText, { color: moodColor(entry.moodTag) }]}>
                                            Mood {entry.moodTag}/10
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <HighlightedText
                                text={entry.content}
                                query={isSearchActive ? searchQuery.trim() : ''}
                                style={styles.preview}
                                highlightStyle={highlightStyle}
                                numberOfLines={3}
                            />

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
                        </Pressable>
                    ))}

                    {/* Pagination — hidden during search */}
                    {!isSearchActive && (page > 1 || hasMore) && (
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
    backBtn: {
        width: s(40), height: s(40), borderRadius: s(20),
        backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
    },
    iconBtn: {
        width: s(40), height: s(40), borderRadius: s(20),
        backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
    },
    addBtn: {
        width: s(40), height: s(40), borderRadius: s(20),
        backgroundColor: '#e0f2fe', justifyContent: 'center', alignItems: 'center',
    },
    pageTitle: { fontSize: s(20), fontWeight: '700', color: '#0f172a' },
    searchBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: s(16),
        marginBottom: s(12),
        backgroundColor: '#ffffff',
        borderRadius: s(14),
        paddingHorizontal: s(14),
        paddingVertical: s(10),
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchInput: { flex: 1, fontSize: s(15), color: '#0f172a', padding: 0 },
    searchStatusRow: { paddingVertical: s(8), paddingBottom: s(4) },
    searchStatusText: { fontSize: s(13), color: '#64748b', fontWeight: '500' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { paddingTop: s(72), alignItems: 'center', gap: s(12) },
    emptyText: { fontSize: s(17), fontWeight: '700', color: '#0f172a' },
    emptySubText: { fontSize: s(13), color: '#94a3b8', textAlign: 'center' },
    card: {
        backgroundColor: '#ffffff', borderRadius: s(20),
        padding: s(18), marginBottom: s(14),
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    dateLabel: { fontSize: s(13), fontWeight: '700', color: '#0ea5e9', marginBottom: s(8) },
    moodRow: { marginBottom: s(8) },
    moodBadge: {
        alignSelf: 'flex-start', paddingHorizontal: s(10),
        paddingVertical: s(3), borderRadius: s(20), borderWidth: 1,
    },
    moodBadgeText: { fontSize: s(12), fontWeight: '600' },
    preview: { fontSize: s(14), color: '#334155', lineHeight: s(22), marginBottom: s(12) },
    reflectionBox: {
        backgroundColor: '#f0f9ff', borderLeftWidth: 3,
        borderLeftColor: '#0ea5e9', borderRadius: s(8),
        padding: s(10), marginBottom: s(12),
    },
    reflectionLabel: {
        fontSize: s(11), fontWeight: '700', color: '#0ea5e9',
        marginBottom: s(3), textTransform: 'uppercase', letterSpacing: 0.5,
    },
    reflectionText: { fontSize: s(13), color: '#0369a1', lineHeight: s(20), fontStyle: 'italic' },
    viewRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
    viewText: { fontSize: s(13), fontWeight: '600', color: '#0ea5e9' },
    pagination: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginTop: s(8), marginBottom: s(8),
    },
    pageBtn: {
        flexDirection: 'row', alignItems: 'center', gap: s(4),
        paddingHorizontal: s(14), paddingVertical: s(10),
        backgroundColor: '#ffffff', borderRadius: s(12), borderWidth: 1, borderColor: '#e2e8f0',
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { fontSize: s(13), fontWeight: '600', color: '#0ea5e9' },
    pageBtnTextDisabled: { color: '#94a3b8' },
    pageIndicator: { fontSize: s(13), fontWeight: '600', color: '#64748b' },
});

const darkStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: s(16), paddingBottom: s(16),
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
    backBtn: {
        width: s(40), height: s(40), borderRadius: s(20),
        backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
    },
    iconBtn: {
        width: s(40), height: s(40), borderRadius: s(20),
        backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
    },
    addBtn: {
        width: s(40), height: s(40), borderRadius: s(20),
        backgroundColor: '#0c2a3f', justifyContent: 'center', alignItems: 'center',
    },
    pageTitle: { fontSize: s(20), fontWeight: '700', color: '#f8fafc' },
    searchBarRow: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: s(16), marginBottom: s(12),
        backgroundColor: '#1e293b', borderRadius: s(14),
        paddingHorizontal: s(14), paddingVertical: s(10),
        borderWidth: 1, borderColor: '#334155',
    },
    searchInput: { flex: 1, fontSize: s(15), color: '#f8fafc', padding: 0 },
    searchStatusRow: { paddingVertical: s(8), paddingBottom: s(4) },
    searchStatusText: { fontSize: s(13), color: '#64748b', fontWeight: '500' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { paddingTop: s(72), alignItems: 'center', gap: s(12) },
    emptyText: { fontSize: s(17), fontWeight: '700', color: '#f8fafc' },
    emptySubText: { fontSize: s(13), color: '#64748b', textAlign: 'center' },
    card: {
        backgroundColor: '#1e293b', borderRadius: s(20),
        padding: s(18), marginBottom: s(14),
    },
    dateLabel: { fontSize: s(13), fontWeight: '700', color: '#38bdf8', marginBottom: s(8) },
    moodRow: { marginBottom: s(8) },
    moodBadge: {
        alignSelf: 'flex-start', paddingHorizontal: s(10),
        paddingVertical: s(3), borderRadius: s(20), borderWidth: 1,
    },
    moodBadgeText: { fontSize: s(12), fontWeight: '600' },
    preview: { fontSize: s(14), color: '#94a3b8', lineHeight: s(22), marginBottom: s(12) },
    reflectionBox: {
        backgroundColor: '#0c2233', borderLeftWidth: 3,
        borderLeftColor: '#38bdf8', borderRadius: s(8),
        padding: s(10), marginBottom: s(12),
    },
    reflectionLabel: {
        fontSize: s(11), fontWeight: '700', color: '#38bdf8',
        marginBottom: s(3), textTransform: 'uppercase', letterSpacing: 0.5,
    },
    reflectionText: { fontSize: s(13), color: '#7dd3fc', lineHeight: s(20), fontStyle: 'italic' },
    viewRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
    viewText: { fontSize: s(13), fontWeight: '600', color: '#38bdf8' },
    pagination: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginTop: s(8), marginBottom: s(8),
    },
    pageBtn: {
        flexDirection: 'row', alignItems: 'center', gap: s(4),
        paddingHorizontal: s(14), paddingVertical: s(10),
        backgroundColor: '#1e293b', borderRadius: s(12), borderWidth: 1, borderColor: '#334155',
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { fontSize: s(13), fontWeight: '600', color: '#38bdf8' },
    pageBtnTextDisabled: { color: '#64748b' },
    pageIndicator: { fontSize: s(13), fontWeight: '600', color: '#64748b' },
});
