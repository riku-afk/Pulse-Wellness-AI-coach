// components/DailyPulseCheckModal.jsx
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { Moon, Smile } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

export default function DailyPulseCheckModal({ visible, onClose, onSubmit }) {
    const [sleepDuration, setSleepDuration] = useState(7);
    const [moodLevel, setMoodLevel] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const moodLabels = ['Very Bad', 'Bad', 'Okay', 'Good', 'Great'];
    const moodEmojis = ['😞', '😕', '😐', '🙂', '😄'];

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await onSubmit({
            sleepDuration: sleepDuration,
            moodLevel: moodLevel,
            moodLabel: moodLabels[moodLevel - 1],
            moodEmoji: moodEmojis[moodLevel - 1],
        });
        setIsSubmitting(false);
        onClose();
    };

    const styles = isDark ? darkStyles : lightStyles;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.title}>Daily Pulse Check</Text>
                            <Text style={styles.subtitle}>Take a moment to reflect on your day.</Text>
                        </View>
                    </View>

                    {/* Sleep Duration */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Moon size={20} color="#0ea5e9" />
                            <Text style={styles.sectionTitle}>Sleep Duration</Text>
                            <Text style={styles.valueText}>{sleepDuration.toFixed(1)}h</Text>
                        </View>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={12}
                            step={0.5}
                            value={sleepDuration}
                            onValueChange={setSleepDuration}
                            minimumTrackTintColor="#0ea5e9"
                            maximumTrackTintColor={isDark ? '#334155' : '#cbd5e1'}
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
                            <Smile size={20} color="#0ea5e9" />
                            <Text style={styles.sectionTitle}>Mood Level</Text>
                            <View style={styles.moodBadge}>
                                <Text style={styles.moodBadgeText}>{moodLabels[moodLevel - 1]}</Text>
                            </View>
                        </View>
                        <View style={styles.moodButtons}>
                            {[1, 2, 3, 4, 5].map((level) => (
                                <TouchableOpacity
                                    key={level}
                                    onPress={() => setMoodLevel(level)}
                                    style={[
                                        styles.moodButton,
                                        moodLevel === level && styles.moodButtonActive
                                    ]}
                                >
                                    <Text style={styles.moodEmoji}>{moodEmojis[level - 1]}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={styles.submitButton}
                        disabled={isSubmitting}
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
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 600,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 32,
    },
    header: {
        marginBottom: 32,
    },
    headerTextContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginLeft: 8,
        flex: 1,
    },
    valueText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f8fafc',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sliderLabel: {
        fontSize: 12,
        color: '#64748b',
    },
    moodBadge: {
        backgroundColor: '#1e3a5f',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    moodBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
    moodButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    moodButton: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: '#334155',
        borderRadius: 16,
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
        fontSize: 32,
    },
    submitButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

const darkStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 600,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 32,
    },
    header: {
        marginBottom: 32,
    },
    headerTextContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginLeft: 8,
        flex: 1,
    },
    valueText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f8fafc',
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sliderLabel: {
        fontSize: 12,
        color: '#64748b',
    },
    moodBadge: {
        backgroundColor: '#1e3a5f',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    moodBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
    moodButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    moodButton: {
        flex: 1,
        aspectRatio: 1,
        backgroundColor: '#334155',
        borderRadius: 16,
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
        fontSize: 32,
    },
    submitButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});