import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';
import { updateUserPrefs } from '../services/auth';

export default function Landing() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const { userId, token, hasSeenLanding, setHasSeenLanding } = useAppStore(s => ({
        userId: s.userId,
        token: s.token,
        hasSeenLanding: s.hasSeenLanding,
        setHasSeenLanding: s.setHasSeenLanding,
    }));

    // Safety net: if prefs were loaded before navigation and already true, skip landing
    useEffect(() => {
        if (hasSeenLanding) {
            router.replace('/(tabs)/home');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleBeginJourney = () => {
        setHasSeenLanding(true);
        // Persist to Firestore so the next login for this user skips landing
        if (userId && token) {
            updateUserPrefs(userId, token, { hasSeenLanding: true })
                .catch(e => console.warn('Failed to save hasSeenLanding:', e));
        }
        router.replace('/(tabs)/home');
    };

    const styles = isDark ? darkStyles : lightStyles;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Waveform Image Container */}
                <View style={styles.imageContainer}>
                    <View style={styles.imagePlaceholder}>
                        {/* Waveform visualization placeholder */}
                        <View style={styles.waveformContainer}>
                            <View style={styles.horizontalLine} />
                            <View style={styles.waveform}>
                                <View style={[styles.wave, { height: 40 }]} />
                                <View style={[styles.wave, { height: 60 }]} />
                                <View style={[styles.wave, { height: 45 }]} />
                                <View style={[styles.wave, { height: 80 }]} />
                                <View style={[styles.wave, { height: 70 }]} />
                                <View style={[styles.wave, { height: 90 }]} />
                                <View style={[styles.wave, { height: 65 }]} />
                                <View style={[styles.wave, { height: 85 }]} />
                                <View style={[styles.wave, { height: 55 }]} />
                                <View style={[styles.wave, { height: 75 }]} />
                                <View style={[styles.wave, { height: 50 }]} />
                                <View style={[styles.wave, { height: 70 }]} />
                                <View style={[styles.wave, { height: 60 }]} />
                                <View style={[styles.wave, { height: 45 }]} />
                                <View style={[styles.wave, { height: 35 }]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Pulse</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    AI-powered daily check-ins for a clearer{'\n'}mind.
                </Text>

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* Begin Journey Button */}
                <TouchableOpacity
                    onPress={handleBeginJourney}
                    style={styles.beginButton}
                >
                    <Text style={styles.beginButtonText}>Begin Journey</Text>
                    <ArrowRight size={20} color="#ffffff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Light Theme Styles
const lightStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 600,
        alignItems: 'center',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        maxWidth: 520,
        maxHeight: 520,
        marginBottom: 48,
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    waveformContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    horizontalLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        backgroundColor: '#94a3b8',
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    wave: {
        width: 3,
        backgroundColor: '#64748b',
        borderRadius: 2,
    },
    title: {
        fontSize: 48,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 16,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 17,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 24,
    },
    spacer: {
        height: 40,
    },
    beginButton: {
        width: '100%',
        maxWidth: 600,
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    beginButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        fontSize: 15,
        color: '#94a3b8',
    },
    signInLink: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

// Dark Theme Styles
const darkStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 600,
        alignItems: 'center',
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        maxWidth: 520,
        maxHeight: 520,
        marginBottom: 48,
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    waveformContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    horizontalLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        backgroundColor: '#94a3b8',
    },
    waveform: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    wave: {
        width: 3,
        backgroundColor: '#64748b',
        borderRadius: 2,
    },
    title: {
        fontSize: 48,
        fontWeight: '700',
        color: '#f8fafc',
        marginBottom: 16,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 17,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 24,
    },
    spacer: {
        height: 40,
    },
    beginButton: {
        width: '100%',
        maxWidth: 600,
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    beginButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        fontSize: 15,
        color: '#94a3b8',
    },
    signInLink: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

export { Landing };