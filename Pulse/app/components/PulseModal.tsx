import React, { useState, useRef } from 'react';
import {
    View, Text, Modal, TouchableOpacity, StyleSheet,
    useColorScheme, ActivityIndicator, Animated, Dimensions, Platform,
} from 'react-native';
import { Moon, Smile } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { triggerHaptic } from '../utils/haptics';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: { sleepDuration: number; moodLevel: number; moodLabel: string; moodEmoji: string }) => Promise<void>;
}

export default function DailyPulseCheckModal({ visible, onClose, onSubmit }: Props) {
    const [sleepDuration, setSleepDuration] = useState(7);
    const [moodLevel, setMoodLevel] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const moodLabels = ['Very Bad', 'Bad', 'Okay', 'Good', 'Great'];
    const moodEmojis = ['😞', '😕', '😐', '🙂', '😄'];

    // Scale animations for each mood button
    const moodScales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

    const handleMoodSelect = (level: number) => {
        triggerHaptic('selection');
        const idx = level - 1;
        Animated.sequence([
            Animated.spring(moodScales[idx], { toValue: 1.18, useNativeDriver: true, tension: 200, friction: 5 }),
            Animated.spring(moodScales[idx], { toValue: 1, useNativeDriver: true, tension: 200, friction: 7 }),
        ]).start();
        setMoodLevel(level);
    };

    const handleSubmit = async () => {
        triggerHaptic('medium');
        setIsSubmitting(true);
        await onSubmit({
            sleepDuration,
            moodLevel,
            moodLabel: moodLabels[moodLevel - 1],
            moodEmoji: moodEmojis[moodLevel - 1],
        });
        setIsSubmitting(false);
        triggerHaptic('success');
        onClose();
    };

    const styles = isDark ? darkStyles : lightStyles;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Drag handle */}
                    <View style={styles.dragHandle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Daily Pulse Check</Text>
                        <Text style={styles.subtitle}>Take a moment to reflect on your day.</Text>
                    </View>

                    {/* Sleep Duration */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconBox}>
                                <Moon size={s(16)} color="#0ea5e9" />
                            </View>
                            <Text style={styles.sectionTitle}>Sleep Duration</Text>
                            <View style={styles.valuePill}>
                                <Text style={styles.valueText}>{sleepDuration.toFixed(1)}h</Text>
                            </View>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={12}
                            step={0.5}
                            value={sleepDuration}
                            onValueChange={setSleepDuration}
                            onSlidingComplete={() => triggerHaptic('selection')}
                            minimumTrackTintColor="#0ea5e9"
                            maximumTrackTintColor={isDark ? '#334155' : '#e2e8f0'}
                            thumbTintColor="#0ea5e9"
                        />
                        <View style={styles.sliderLabels}>
                            <Text style={styles.sliderLabel}>0h</Text>
                            <Text style={styles.sliderLabel}>6h</Text>
                            <Text style={styles.sliderLabel}>12h+</Text>
                        </View>
                    </View>

                    {/* Mood Level */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconBox}>
                                <Smile size={s(16)} color="#0ea5e9" />
                            </View>
                            <Text style={styles.sectionTitle}>How are you feeling?</Text>
                            <View style={styles.moodPill}>
                                <Text style={styles.moodPillText}>{moodLabels[moodLevel - 1]}</Text>
                            </View>
                        </View>
                        <View style={styles.moodButtons}>
                            {[1, 2, 3, 4, 5].map((level) => {
                                const isSelected = moodLevel === level;
                                return (
                                    <Animated.View
                                        key={level}
                                        style={{ transform: [{ scale: moodScales[level - 1] }], flex: 1 }}
                                    >
                                        <TouchableOpacity
                                            onPress={() => handleMoodSelect(level)}
                                            style={[styles.moodButton, isSelected && styles.moodButtonActive]}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.moodEmoji}>{moodEmojis[level - 1]}</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
                        disabled={isSubmitting}
                        activeOpacity={0.85}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Pulse</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const lightStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: s(28),
        borderTopRightRadius: s(28),
        paddingHorizontal: s(24),
        paddingBottom: Platform.OS === 'ios' ? s(40) : s(28),
        paddingTop: s(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 24,
    },
    dragHandle: {
        width: s(40),
        height: s(4),
        backgroundColor: '#e2e8f0',
        borderRadius: s(2),
        alignSelf: 'center',
        marginBottom: s(20),
    },
    header: {
        alignItems: 'center',
        marginBottom: s(24),
    },
    title: {
        fontSize: s(22),
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: s(4),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: s(14),
        color: '#64748b',
        textAlign: 'center',
        lineHeight: s(20),
    },
    section: {
        marginBottom: s(24),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: s(14),
        gap: s(8),
    },
    sectionIconBox: {
        width: s(30),
        height: s(30),
        borderRadius: s(9),
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: s(15),
        fontWeight: '600',
        color: '#0f172a',
        flex: 1,
    },
    valuePill: {
        backgroundColor: '#f0f9ff',
        borderRadius: s(20),
        paddingHorizontal: s(10),
        paddingVertical: s(3),
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    valueText: {
        fontSize: s(15),
        fontWeight: '700',
        color: '#0284c7',
    },
    moodPill: {
        backgroundColor: '#f0f9ff',
        paddingHorizontal: s(10),
        paddingVertical: s(3),
        borderRadius: s(20),
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    moodPillText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#0284c7',
    },
    slider: {
        width: '100%',
        height: s(40),
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: s(4),
    },
    sliderLabel: {
        fontSize: s(12),
        color: '#94a3b8',
    },
    moodButtons: {
        flexDirection: 'row',
        gap: s(8),
    },
    moodButton: {
        aspectRatio: 1,
        backgroundColor: '#f8fafc',
        borderRadius: s(16),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    moodButtonActive: {
        borderColor: '#0ea5e9',
        backgroundColor: '#f0f9ff',
    },
    moodEmoji: {
        fontSize: s(28),
    },
    submitButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: s(16),
        height: s(54),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: s(16),
        fontWeight: '700',
    },
});

const darkStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#1e293b',
        borderTopLeftRadius: s(28),
        borderTopRightRadius: s(28),
        paddingHorizontal: s(24),
        paddingBottom: Platform.OS === 'ios' ? s(40) : s(28),
        paddingTop: s(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 24,
    },
    dragHandle: {
        width: s(40),
        height: s(4),
        backgroundColor: '#334155',
        borderRadius: s(2),
        alignSelf: 'center',
        marginBottom: s(20),
    },
    header: {
        alignItems: 'center',
        marginBottom: s(24),
    },
    title: {
        fontSize: s(22),
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: s(4),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: s(14),
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: s(20),
    },
    section: {
        marginBottom: s(24),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: s(14),
        gap: s(8),
    },
    sectionIconBox: {
        width: s(30),
        height: s(30),
        borderRadius: s(9),
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: s(15),
        fontWeight: '600',
        color: '#f8fafc',
        flex: 1,
    },
    valuePill: {
        backgroundColor: '#1e3a5f',
        borderRadius: s(20),
        paddingHorizontal: s(10),
        paddingVertical: s(3),
        borderWidth: 1,
        borderColor: '#1d4ed8',
    },
    valueText: {
        fontSize: s(15),
        fontWeight: '700',
        color: '#38bdf8',
    },
    moodPill: {
        backgroundColor: '#1e3a5f',
        paddingHorizontal: s(10),
        paddingVertical: s(3),
        borderRadius: s(20),
        borderWidth: 1,
        borderColor: '#1d4ed8',
    },
    moodPillText: {
        fontSize: s(13),
        fontWeight: '600',
        color: '#38bdf8',
    },
    slider: {
        width: '100%',
        height: s(40),
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: s(4),
    },
    sliderLabel: {
        fontSize: s(12),
        color: '#64748b',
    },
    moodButtons: {
        flexDirection: 'row',
        gap: s(8),
    },
    moodButton: {
        aspectRatio: 1,
        backgroundColor: '#334155',
        borderRadius: s(16),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#334155',
    },
    moodButtonActive: {
        borderColor: '#0ea5e9',
        backgroundColor: '#1e3a5f',
    },
    moodEmoji: {
        fontSize: s(28),
    },
    submitButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: s(16),
        height: s(54),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0ea5e9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: s(16),
        fontWeight: '700',
    },
});
