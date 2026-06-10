import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, Pressable, ScrollView,
    StyleSheet, ActivityIndicator, useColorScheme, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';
import { saveJournalEntry, getJournalEntry } from '../services/journal';
import { clearCacheByPrefix } from '../utils/cache';

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

const MOOD_TAGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function moodColor(tag: number): string {
    if (tag >= 8) return '#10b981';
    if (tag >= 5) return '#f59e0b';
    return '#ef4444';
}

export default function JournalEntry() {
    const isDark = useColorScheme() === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token } = useAppStore(s => ({ userId: s.userId, token: s.token }));
    const params = useLocalSearchParams<{ date?: string }>();
    const date = params.date ?? todayDateString();

    const [content, setContent] = useState('');
    const [moodTag, setMoodTag] = useState<number | null>(null);
    const [aiReflection, setAiReflection] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [inputFocused, setInputFocused] = useState(false);

    const pageAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(pageAnim, { toValue: 1, duration: 440, delay: 60, useNativeDriver: true }).start();
    }, []);
    const enterStyle = useRef({
        opacity: pageAnim,
        transform: [{ translateY: pageAnim.interpolate({ inputRange: [0, 1], outputRange: [s(16), 0] }) }],
    }).current;

    useFocusEffect(useCallback(() => {
        let cancelled = false;

        async function load() {
            if (!userId || !token) return;
            setIsLoading(true);
            setSaveSuccess(false);
            try {
                const existing = await getJournalEntry(userId, token, date);
                if (!cancelled && existing) {
                    setContent(existing.content);
                    setMoodTag(existing.moodTag);
                    setAiReflection(existing.aiReflection);
                    setSaveSuccess(true);
                }
            } catch (e) {
                console.error('Failed to load journal entry:', e);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [userId, token, date]));

    const handleSave = async () => {
        if (!userId || !token || !content.trim()) return;
        setIsSaving(true);
        setSaveSuccess(false);
        setAiReflection(null);
        try {
            const result = await saveJournalEntry(userId, token, {
                content: content.trim(),
                moodTag,
                date,
            });
            setAiReflection(result.aiReflection);
            setSaveSuccess(true);
            clearCacheByPrefix(`journal_${userId}`);
        } catch (e) {
            console.error('Failed to save journal entry:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const isToday = date === todayDateString();

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.container}>
            <Animated.View style={[{ flex: 1 }, enterStyle]}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ChevronLeft size={s(24)} color={isDark ? '#f8fafc' : '#0f172a'} />
                    </Pressable>
                    <View style={{ flex: 1, paddingHorizontal: s(12) }}>
                        <Text style={styles.dateHeader}>{formatDate(date)}</Text>
                        {isToday && <Text style={styles.todayLabel}>Today</Text>}
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingHorizontal: s(20), paddingBottom: insets.bottom + s(40) }}
                    >
                        {/* Text input */}
                        <TextInput
                            style={[styles.textInput, inputFocused && styles.textInputFocused]}
                            value={content}
                            onChangeText={setContent}
                            multiline
                            placeholder="How are you feeling today? Write anything on your mind..."
                            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                            textAlignVertical="top"
                            scrollEnabled={false}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                        />

                        {/* Mood tag selector */}
                        <Text style={styles.sectionLabel}>Mood (optional)</Text>
                        <View style={styles.moodGrid}>
                            {MOOD_TAGS.map(tag => {
                                const selected = moodTag === tag;
                                const color = moodColor(tag);
                                return (
                                    <Pressable
                                        key={tag}
                                        style={({ pressed }) => [
                                            styles.moodBtn,
                                            selected && { backgroundColor: color, borderColor: color },
                                            !selected && { borderColor: isDark ? '#334155' : '#e2e8f0' },
                                            pressed && { opacity: 0.72, transform: [{ scale: 0.91 }] },
                                        ]}
                                        onPress={() => setMoodTag(selected ? null : tag)}
                                    >
                                        <Text style={[
                                            styles.moodBtnText,
                                            selected && { color: '#ffffff' },
                                            !selected && { color: color },
                                        ]}>
                                            {tag}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                        <View style={styles.moodScaleRow}>
                            <Text style={styles.moodScaleLabel}>1 = very low</Text>
                            <Text style={styles.moodScaleLabel}>10 = excellent</Text>
                        </View>

                        {/* Save button */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.saveBtn,
                                (!content.trim() || isSaving) && styles.saveBtnDisabled,
                                pressed && { opacity: 0.85 },
                            ]}
                            onPress={handleSave}
                            disabled={!content.trim() || isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.saveBtnText}>
                                    {saveSuccess ? 'Update Entry' : 'Save Entry'}
                                </Text>
                            )}
                        </Pressable>

                        {/* AI Reflection */}
                        {isSaving && (
                            <View style={styles.reflectionLoading}>
                                <ActivityIndicator size="small" color="#0ea5e9" />
                                <Text style={styles.reflectionLoadingText}>Generating reflection…</Text>
                            </View>
                        )}

                        {aiReflection && !isSaving && (
                            <View style={styles.reflectionCard}>
                                <View style={styles.reflectionHeader}>
                                    <Sparkles size={s(15)} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                                    <Text style={styles.reflectionTitle}>AI Reflection</Text>
                                </View>
                                <Text style={styles.reflectionText}>{aiReflection}</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </Animated.View>
            </View>
        </KeyboardAvoidingView>
    );
}

const lightStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
        marginTop: s(2),
    },
    dateHeader: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#0f172a',
    },
    todayLabel: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#0ea5e9',
        marginTop: s(2),
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    textInput: {
        backgroundColor: '#ffffff',
        borderRadius: s(16),
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        padding: s(16),
        fontSize: s(15),
        color: '#0f172a',
        lineHeight: s(24),
        minHeight: s(200),
        marginBottom: s(24),
    },
    textInputFocused: {
        borderColor: '#0ea5e9',
        backgroundColor: '#f0f9ff',
    },
    sectionLabel: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#64748b',
        marginBottom: s(12),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: s(8),
        marginBottom: s(8),
    },
    moodBtn: {
        width: s(46),
        height: s(46),
        borderRadius: s(12),
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    moodBtnText: {
        fontSize: s(15),
        fontWeight: '700',
    },
    moodScaleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: s(28),
    },
    moodScaleLabel: {
        fontSize: s(11),
        color: '#94a3b8',
    },
    saveBtn: {
        backgroundColor: '#0ea5e9',
        borderRadius: s(14),
        height: s(52),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: s(20),
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: s(16),
        fontWeight: '700',
        color: '#ffffff',
    },
    reflectionLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(10),
        justifyContent: 'center',
        paddingVertical: s(16),
    },
    reflectionLoadingText: {
        fontSize: s(13),
        color: '#64748b',
    },
    reflectionCard: {
        backgroundColor: '#f0f9ff',
        borderRadius: s(16),
        padding: s(16),
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    reflectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(8),
    },
    reflectionTitle: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#0ea5e9',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reflectionText: {
        fontSize: s(15),
        color: '#0369a1',
        lineHeight: s(24),
        fontStyle: 'italic',
    },
});

const darkStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
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
        marginTop: s(2),
    },
    dateHeader: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#f8fafc',
    },
    todayLabel: {
        fontSize: s(12),
        fontWeight: '600',
        color: '#38bdf8',
        marginTop: s(2),
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    textInput: {
        backgroundColor: '#1e293b',
        borderRadius: s(16),
        borderWidth: 1.5,
        borderColor: '#334155',
        padding: s(16),
        fontSize: s(15),
        color: '#f8fafc',
        lineHeight: s(24),
        minHeight: s(200),
        marginBottom: s(24),
    },
    textInputFocused: {
        borderColor: '#0ea5e9',
        backgroundColor: '#0c2233',
    },
    sectionLabel: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#64748b',
        marginBottom: s(12),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: s(8),
        marginBottom: s(8),
    },
    moodBtn: {
        width: s(46),
        height: s(46),
        borderRadius: s(12),
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1e293b',
    },
    moodBtnText: {
        fontSize: s(15),
        fontWeight: '700',
    },
    moodScaleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: s(28),
    },
    moodScaleLabel: {
        fontSize: s(11),
        color: '#475569',
    },
    saveBtn: {
        backgroundColor: '#0ea5e9',
        borderRadius: s(14),
        height: s(52),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: s(20),
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: s(16),
        fontWeight: '700',
        color: '#ffffff',
    },
    reflectionLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(10),
        justifyContent: 'center',
        paddingVertical: s(16),
    },
    reflectionLoadingText: {
        fontSize: s(13),
        color: '#64748b',
    },
    reflectionCard: {
        backgroundColor: '#0c2233',
        borderRadius: s(16),
        padding: s(16),
        borderWidth: 1,
        borderColor: '#0c4a6e',
    },
    reflectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(6),
        marginBottom: s(8),
    },
    reflectionTitle: {
        fontSize: s(13),
        fontWeight: '700',
        color: '#38bdf8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reflectionText: {
        fontSize: s(15),
        color: '#7dd3fc',
        lineHeight: s(24),
        fontStyle: 'italic',
    },
});
