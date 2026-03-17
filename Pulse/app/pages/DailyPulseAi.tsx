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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ThumbsUp, ThumbsDown, Copy, MoreHorizontal, Plus, ArrowUp, Moon, Sparkles } from 'lucide-react-native';
import { streamAIResponse, PulseData, ConversationMessage } from '../services/PulseAi';

interface Message {
    type: 'ai' | 'user';
    content: string;
    timestamp: string;
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

    const [messages, setMessages] = useState<Message[]>([]);
    const [streamedMessage, setStreamedMessage] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [followUpQuestion, setFollowUpQuestion] = useState('');
    const [streamError, setStreamError] = useState<string | null>(null);

    const streamedRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);

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
                    setMessages((prev) => [
                        ...prev,
                        { type: 'ai', content: finalContent, timestamp: new Date().toISOString() },
                    ]);
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

    useEffect(() => {
        const initialMessage = pulseData
            ? 'Please give me a wellness check-in based on my health data.'
            : 'Hello, I need some wellness guidance today.';
        runStream(initialMessage, []);
        return () => {
            abortControllerRef.current?.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendFollowUp = async () => {
        const text = followUpQuestion.trim();
        if (!text || isStreaming) return;

        const userMsg: Message = {
            type: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
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
                <TouchableOpacity style={styles.moreButton}>
                    <MoreHorizontal size={24} color="#f8fafc" />
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
                    <View
                        key={index}
                        style={msg.type === 'user' ? styles.userMessageContainer : styles.messageContainer}
                    >
                        {msg.type === 'ai' && (
                            <View style={styles.aiAvatar}>
                                <Sparkles size={20} color="#0ea5e9" />
                            </View>
                        )}
                        <View style={styles.messageContent}>
                            <View style={styles.messageHeader}>
                                <Text style={styles.messageSender}>
                                    {msg.type === 'user' ? 'You' : 'Pulse AI'}
                                </Text>
                                <Text style={styles.messageTime}>Just now</Text>
                            </View>
                            <View style={msg.type === 'user' ? styles.userMessageBubble : styles.messageBubble}>
                                <Text style={msg.type === 'user' ? styles.userMessageText : styles.messageText}>
                                    {msg.content}
                                </Text>
                                {msg.type === 'ai' && (
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
                                )}
                            </View>
                        </View>
                        {msg.type === 'user' && (
                            <View style={styles.userAvatar}>
                                <Text style={styles.userAvatarText}>You</Text>
                            </View>
                        )}
                    </View>
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
                                <Text style={styles.messageTime}>Just now</Text>
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
                                <Text style={styles.messageTime}>Just now</Text>
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
                <TouchableOpacity style={styles.addButton}>
                    <Plus size={24} color="#64748b" />
                </TouchableOpacity>
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
        flexDirection: 'row-reverse',
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
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#0284c7',
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        gap: 12,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
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
});

const darkStyles = StyleSheet.create({
    ...lightStyles,
});

export { DailyPulseAI };
