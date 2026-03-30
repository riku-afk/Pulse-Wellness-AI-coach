import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    useColorScheme,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ThumbsUp, ThumbsDown, Copy, Trash2, ArrowUp, Moon, Sparkles } from 'lucide-react-native';
import { streamAIResponse, PulseData, ConversationMessage } from '../services/PulseAi';
import { useAppStore, StoredChatMessage } from '../store/appStore';
import UserAvatar from '../components/UserAvatar';

interface Message {
    type: 'ai' | 'user';
    content: string;
    timestamp: string;
}

// Returns today's date string in Philippine time (UTC+8), e.g. "2026-03-27"
function getPHDateString(): string {
    const phOffset = 8 * 60 * 60 * 1000;
    const phNow = new Date(Date.now() + phOffset);
    return phNow.toISOString().split('T')[0];
}

// Formats an ISO timestamp to a readable time, e.g. "2:30 PM"
function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function DailyPulseAI() {
    const params = useLocalSearchParams();
    const handleBack = () => router.back();

    const rawSleep = params.sleepDuration ? String(params.sleepDuration) : undefined;
    const rawMood = params.moodLevel ? String(params.moodLevel) : undefined;
    const rawMoodLabel = params.moodLabel ? String(params.moodLabel) : undefined;
    const rawMoodEmoji = params.moodEmoji ? String(params.moodEmoji) : undefined;

    const pulseData: PulseData | undefined =
        rawSleep && rawMood && rawMoodLabel && rawMoodEmoji
            ? {
                sleepDuration: parseFloat(rawSleep),
                moodLevel: parseInt(rawMood, 10),
                moodLabel: rawMoodLabel,
                moodEmojis: rawMoodEmoji,
            }
            : undefined;

    const { aiChatHistory, aiChatDate, saveChatHistory, clearChatHistory } = useAppStore(s => ({
        aiChatHistory: s.aiChatHistory,
        aiChatDate: s.aiChatDate,
        saveChatHistory: s.saveChatHistory,
        clearChatHistory: s.clearChatHistory,
    }));

    // Check if stored history is from today (PH time) — if not, treat as fresh
    const todayPH = getPHDateString();
    const historyIsValid = aiChatDate === todayPH && aiChatHistory.length > 0;

    const [messages, setMessages] = useState<Message[]>(
        historyIsValid ? (aiChatHistory as Message[]) : []
    );
    const [streamedMessage, setStreamedMessage] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [followUpQuestion, setFollowUpQuestion] = useState('');
    const [streamError, setStreamError] = useState<string | null>(null);
    const [showClearModal, setShowClearModal] = useState(false);

    // Tracks whether the initial render loaded from history (so we don't re-stream)
    const loadedFromHistory = useRef(historyIsValid);
    const streamedRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);
    // Always-current mirror of messages state — safe to read inside async callbacks
    const messagesRef = useRef<Message[]>(historyIsValid ? (aiChatHistory as Message[]) : []);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const runStream = async (
        userMessage: string,
        history: ConversationMessage[]
    ) => {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        streamedRef.current = '';
        setStreamedMessage('');
        setIsStreaming(true);
        setStreamError(null);

        try {
            await streamAIResponse(
                userMessage,
                pulseData,
                history,
                (chunk) => {
                    streamedRef.current += chunk;
                    setStreamedMessage((prev) => prev + chunk);
                },
                () => {
                    const finalContent = streamedRef.current;
                    const newMsg: Message = {
                        type: 'ai',
                        content: finalContent,
                        timestamp: new Date().toISOString(),
                    };
                    const updated = [...messagesRef.current, newMsg];
                    messagesRef.current = updated;
                    setMessages(updated);
                    saveChatHistory(updated as StoredChatMessage[], getPHDateString());
                    streamedRef.current = '';
                    setStreamedMessage('');
                    setIsStreaming(false);
                },
                controller.signal
            );
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            console.error('Streaming error:', err);
            setStreamError("I'm having trouble connecting right now. Please try again.");
            setIsStreaming(false);
        }
    };

    // Keep messagesRef in sync so async callbacks always see the latest messages
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        if (loadedFromHistory.current) return;
        if (aiChatDate !== null && aiChatDate !== todayPH) {
            clearChatHistory();
        }
        const initialMessage = pulseData
            ? 'Please give me a wellness check-in based on my health data.'
            : 'Hello, I need some wellness guidance today.';
        runStream(initialMessage, []);
        return () => { abortControllerRef.current?.abort(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const clearChat = () => setShowClearModal(true);

    const confirmClear = () => {
        setShowClearModal(false);
        clearChatHistory();
        setMessages([]);
        messagesRef.current = [];
        loadedFromHistory.current = false;
        const initialMessage = pulseData
            ? 'Please give me a wellness check-in based on my health data.'
            : 'Hello, I need some wellness guidance today.';
        runStream(initialMessage, []);
    };

    const handleSendFollowUp = async () => {
        const text = followUpQuestion.trim();
        if (!text || isStreaming) return;

        const userMsg: Message = {
            type: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...messagesRef.current, userMsg];
        messagesRef.current = updatedMessages;
        setMessages(updatedMessages);
        saveChatHistory(updatedMessages as StoredChatMessage[], getPHDateString());
        setFollowUpQuestion('');

        const history: ConversationMessage[] = updatedMessages.map((m) => ({
            type: m.type,
            content: m.content,
        }));

        await runStream(text, history);
    };

    const styles = isDark ? darkStyles : lightStyles;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft size={24} color="#f8fafc" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Daily Pulse</Text>
                <TouchableOpacity style={styles.moreButton} onPress={clearChat}>
                    <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Yesterday's Context — only shown when real pulse data was passed */}
                {pulseData && (
                    <View style={styles.contextContainer}>
                        <Text style={styles.contextTitle}>YESTERDAY'S CONTEXT</Text>
                        <View style={styles.contextBadges}>
                            <View style={styles.badge}>
                                <Moon size={16} color="#f8fafc" />
                                <Text style={styles.badgeText}>{pulseData.sleepDuration}h Sleep</Text>
                            </View>
                            <Text style={styles.contextDot}>•</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeEmoji}>{pulseData.moodEmojis}</Text>
                                <Text style={styles.badgeText}>{pulseData.moodLabel}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.trendButton}>
                            <Sparkles size={20} color="#0ea5e9" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Completed messages */}
                {messages.map((msg, index) => (
                    msg.type === 'user' ? (
                        /* ── User bubble: compact, right-aligned ── */
                        <View key={index} style={styles.userMessageContainer}>
                            <View style={styles.userMessageBubble}>
                                <Text style={styles.userMessageText}>{msg.content}</Text>
                            </View>
                            <View style={styles.userAvatar}>
                                <UserAvatar size={44} />
                            </View>
                        </View>
                    ) : (
                        /* ── AI bubble: avatar + full-width content ── */
                        <View key={index} style={styles.messageContainer}>
                            <View style={styles.aiAvatar}>
                                <Sparkles size={20} color="#0ea5e9" />
                            </View>
                            <View style={styles.messageContent}>
                                <View style={styles.messageHeader}>
                                    <Text style={styles.messageSender}>Pulse AI</Text>
                                    <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
                                </View>
                                <View style={styles.messageBubble}>
                                    <Text style={styles.messageText}>{msg.content}</Text>
                                    <View style={styles.feedbackContainer}>
                                        <TouchableOpacity style={styles.feedbackButton}>
                                            <ThumbsUp size={18} color="#64748b" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.feedbackButton}>
                                            <ThumbsDown size={18} color="#64748b" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.feedbackButton}>
                                            <Copy size={18} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )
                ))}

                {/* In-progress streaming message */}
                {isStreaming && (
                    <View style={styles.messageContainer}>
                        <View style={styles.aiAvatar}>
                            <Sparkles size={20} color="#0ea5e9" />
                        </View>
                        <View style={styles.messageContent}>
                            <View style={styles.messageHeader}>
                                <Text style={styles.messageSender}>Pulse AI</Text>
                                <Text style={styles.messageTime}>{formatTime(new Date().toISOString())}</Text>
                            </View>
                            <View style={styles.messageBubble}>
                                {streamedMessage.length === 0 ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#0ea5e9" />
                                        <Text style={styles.loadingText}>Thinking...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.messageText}>{streamedMessage}▌</Text>
                                )}
                            </View>
                        </View>
                    </View>
                )}

                {/* Stream error */}
                {streamError && !isStreaming && (
                    <View style={styles.messageContainer}>
                        <View style={styles.aiAvatar}>
                            <Sparkles size={20} color="#0ea5e9" />
                        </View>
                        <View style={styles.messageContent}>
                            <View style={styles.messageHeader}>
                                <Text style={styles.messageSender}>Pulse AI</Text>
                                <Text style={styles.messageTime}>{formatTime(new Date().toISOString())}</Text>
                            </View>
                            <View style={styles.messageBubble}>
                                <Text style={styles.messageText}>{streamError}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Suggested Actions */}
                <View style={styles.suggestedActionsContainer}>
                    <Text style={styles.suggestedActionsTitle}>Suggested actions</Text>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask a follow up question..."
                    placeholderTextColor="#64748b"
                    value={followUpQuestion}
                    onChangeText={setFollowUpQuestion}
                    multiline
                />
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        followUpQuestion.trim() && !isStreaming && styles.sendButtonActive,
                    ]}
                    onPress={handleSendFollowUp}
                    disabled={!followUpQuestion.trim() || isStreaming}
                >
                    <ArrowUp
                        size={20}
                        color={followUpQuestion.trim() && !isStreaming ? '#ffffff' : '#64748b'}
                    />
                </TouchableOpacity>
            </View>

            {/* Clear conversation confirmation modal */}
            <Modal visible={showClearModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Clear Conversation</Text>
                        <Text style={styles.modalBody}>
                            Are you sure you want to delete today's conversation? This cannot be undone.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalBtnCancel}
                                onPress={() => setShowClearModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnCancelText}>No</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnConfirm}
                                onPress={confirmClear}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalBtnConfirmText}>Yes, Clear</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const lightStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f8fafc',
    },
    moreButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    contextContainer: {
        paddingHorizontal: 20,
        marginBottom: 24,
        position: 'relative',
    },
    contextTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0ea5e9',
        letterSpacing: 1,
        marginBottom: 12,
    },
    contextBadges: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f8fafc',
    },
    badgeEmoji: {
        fontSize: 18,
    },
    contextDot: {
        fontSize: 18,
        color: '#64748b',
        marginHorizontal: 8,
    },
    trendButton: {
        position: 'absolute',
        right: 20,
        top: 30,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    messageContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    userMessageContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    aiAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    userAvatarText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    messageContent: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    messageSender: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f8fafc',
    },
    messageTime: {
        fontSize: 12,
        color: '#64748b',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    messageBubble: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    userMessageBubble: {
        backgroundColor: '#0ea5e9',
        borderRadius: 18,
        borderBottomRightRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxWidth: '75%',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#e2e8f0',
    },
    userMessageText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#ffffff',
    },
    feedbackContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    feedbackButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestedActionsContainer: {
        paddingHorizontal: 20,
    },
    suggestedActionsTitle: {
        fontSize: 14,
        color: '#64748b',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: '#f8fafc',
        maxHeight: 100,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonActive: {
        backgroundColor: '#0ea5e9',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    modalBox: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: '#334155',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 10,
    },
    modalBody: {
        fontSize: 14,
        color: '#94a3b8',
        lineHeight: 22,
        marginBottom: 24,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtnCancel: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#334155',
        alignItems: 'center',
    },
    modalBtnCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#f8fafc',
    },
    modalBtnConfirm: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#ef4444',
        alignItems: 'center',
    },
    modalBtnConfirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
    },
});

const darkStyles = StyleSheet.create({
    ...lightStyles,
});

export { DailyPulseAI };
