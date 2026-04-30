import React, { useEffect, useRef, useState } from 'react';
import {
    Modal, View, Text, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { streamAIResponse, PulseData } from '../services/PulseAi';

export interface PulseSubmitData {
    sleepDuration: number;
    moodLevel: number;
    moodLabel: string;
    moodEmoji: string;
}

interface Props {
    visible: boolean;
    /** 'stream' auto-triggers AI after pulse submit; 'view' shows a saved suggestion */
    mode: 'stream' | 'view';
    pulseData?: PulseSubmitData;
    existingText?: string;
    /** Called when modal closes. In stream mode, passes generated text so caller can save it. */
    onClose: (aiText?: string) => void;
}

const INITIAL_PROMPT =
    'Based on my pulse data today, give me a brief personalized wellness insight and one actionable tip. Be warm and concise (3-4 sentences max).';

export default function PulseAiFloatingModal({ visible, mode, pulseData, existingText, onClose }: Props) {
    const isDark = useColorScheme() === 'dark';
    const [streamedText, setStreamedText] = useState('');
    const [isDone, setIsDone] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const accumulatedRef = useRef('');
    const charQueueRef = useRef('');      // pending chars waiting to be rendered
    const networkDoneRef = useRef(false); // true once the SSE stream signals [DONE]
    const abortRef = useRef<AbortController | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    // Typewriter — runs at 30 ms/tick, 4 chars per tick (~130 chars/sec).
    // Drains charQueueRef regardless of how many SSE chunks arrived,
    // then finalises once the network stream is also done.
    useEffect(() => {
        if (!isStreaming) return;
        const id = setInterval(() => {
            if (charQueueRef.current.length > 0) {
                const chars = charQueueRef.current.slice(0, 4);
                charQueueRef.current = charQueueRef.current.slice(4);
                setStreamedText(prev => prev + chars);
                scrollRef.current?.scrollToEnd({ animated: false });
            } else if (networkDoneRef.current) {
                networkDoneRef.current = false;
                setIsDone(true);
                setIsStreaming(false);
            }
        }, 30);
        return () => clearInterval(id);
    }, [isStreaming]);

    // Reset and start stream whenever modal opens in stream mode
    useEffect(() => {
        if (!visible) return;

        if (mode === 'view') {
            setStreamedText(existingText ?? '');
            setIsDone(true);
            return;
        }

        // stream mode — reset all refs before starting
        accumulatedRef.current = '';
        charQueueRef.current = '';
        networkDoneRef.current = false;
        setStreamedText('');
        setIsDone(false);
        setIsStreaming(true);

        const controller = new AbortController();
        abortRef.current = controller;

        const apiPulseData: PulseData | undefined = pulseData
            ? {
                sleepDuration: pulseData.sleepDuration,
                moodLevel: pulseData.moodLevel,
                moodLabel: pulseData.moodLabel,
                moodEmojis: pulseData.moodEmoji,
            }
            : undefined;

        streamAIResponse(
            INITIAL_PROMPT,
            apiPulseData,
            [],
            (chunk) => {
                accumulatedRef.current += chunk;
                charQueueRef.current += chunk; // typewriter drains this
            },
            () => {
                networkDoneRef.current = true; // interval finalises once queue is empty
            },
            controller.signal
        ).catch((err) => {
            if (err?.name !== 'AbortError') {
                setStreamedText('Sorry, I couldn\'t generate an insight right now. Try again later.');
            }
            charQueueRef.current = '';
            networkDoneRef.current = false;
            setIsDone(true);
            setIsStreaming(false);
        });

        return () => {
            controller.abort();
        };
    }, [visible, mode]);

    const handleClose = () => {
        abortRef.current?.abort();
        onClose(mode === 'stream' ? accumulatedRef.current : undefined);
    };

    const moodColor = pulseData
        ? pulseData.moodLevel >= 4 ? '#10b981' : pulseData.moodLevel === 3 ? '#f59e0b' : '#ef4444'
        : '#0ea5e9';

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
            {/* Darkened blurred backdrop */}
            <View style={styles.backdrop}>
                <View style={isDark ? styles.cardDark : styles.cardLight}>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconWrap}>
                            <Sparkles size={20} color="#0ea5e9" />
                        </View>
                        <Text style={isDark ? styles.titleDark : styles.titleLight}>AI Insight</Text>
                        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <X size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Pulse snapshot */}
                    {pulseData && (
                        <View style={styles.snapshot}>
                            <Text style={styles.snapshotEmoji}>{pulseData.moodEmoji}</Text>
                            <View style={styles.snapshotDetails}>
                                <Text style={[styles.snapshotMood, { color: moodColor }]}>
                                    {pulseData.moodLabel} mood
                                </Text>
                                <Text style={styles.snapshotSleep}>
                                    {pulseData.sleepDuration.toFixed(1)}h sleep
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Divider */}
                    <View style={isDark ? styles.dividerDark : styles.dividerLight} />

                    {/* AI text area */}
                    <ScrollView
                        ref={scrollRef}
                        style={styles.textArea}
                        showsVerticalScrollIndicator={false}
                    >
                        {isStreaming && streamedText === '' ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#0ea5e9" />
                                <Text style={styles.loadingText}>Generating your insight…</Text>
                            </View>
                        ) : (
                            <Text style={isDark ? styles.aiTextDark : styles.aiTextLight}>
                                {streamedText}
                                {isStreaming ? <Text style={styles.cursor}>▌</Text> : null}
                            </Text>
                        )}
                    </ScrollView>

                    {/* Got it button — only shown when done */}
                    {isDone && (
                        <TouchableOpacity style={styles.doneButton} onPress={handleClose} activeOpacity={0.8}>
                            <Text style={styles.doneButtonText}>Got it</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    cardLight: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    cardDark: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleLight: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#0f172a',
    },
    titleDark: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#f8fafc',
    },
    snapshot: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        backgroundColor: 'rgba(14,165,233,0.08)',
        borderRadius: 12,
        padding: 12,
    },
    snapshotEmoji: {
        fontSize: 32,
    },
    snapshotDetails: {
        flex: 1,
    },
    snapshotMood: {
        fontSize: 15,
        fontWeight: '700',
    },
    snapshotSleep: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    dividerLight: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginBottom: 16,
    },
    dividerDark: {
        height: 1,
        backgroundColor: '#334155',
        marginBottom: 16,
    },
    textArea: {
        maxHeight: 200,
        marginBottom: 20,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    loadingText: {
        fontSize: 14,
        color: '#64748b',
    },
    aiTextLight: {
        fontSize: 15,
        lineHeight: 24,
        color: '#334155',
    },
    aiTextDark: {
        fontSize: 15,
        lineHeight: 24,
        color: '#cbd5e1',
    },
    cursor: {
        color: '#0ea5e9',
    },
    doneButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
