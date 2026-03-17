import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, useColorScheme, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { User, Camera } from 'lucide-react-native';
import { saveProfile } from '../services/auth';
import { useAppStore } from '../store/appStore';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function CompleteSignup() {
    const { userId, token } = useLocalSearchParams<{ userId: string; token: string }>();

    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setSession, setProfile } = useAppStore(s => ({
        setSession: s.setSession,
        setProfile: s.setProfile,
    }));

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = isDark ? darkStyles : lightStyles;

    const handleSave = async () => {
        if (!firstName.trim()) {
            Alert.alert('Error', 'First name is required');
            return;
        }
        if (!lastName.trim()) {
            Alert.alert('Error', 'Last name is required');
            return;
        }
        const parsedAge = parseInt(age, 10);
        if (!age || isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
            Alert.alert('Error', 'Please enter a valid age');
            return;
        }
        if (!gender) {
            Alert.alert('Error', 'Please select a gender');
            return;
        }
        if (!userId || !token) {
            Alert.alert('Session expired', 'Please log in again.');
            router.replace('/auth/login');
            return;
        }

        setIsLoading(true);
        try {
            const profileData = {
                firstName: firstName.trim(),
                middleName: middleName.trim(),
                lastName: lastName.trim(),
                age: parsedAge,
                gender,
            };
            await saveProfile(userId, token, profileData);
            setSession(userId, token);
            setProfile(profileData);
            router.replace('/(tabs)/landing');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
            <View style={styles.card}>

                {/* Avatar placeholder */}
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatar}>
                        <User size={48} color={isDark ? '#64748b' : '#94a3b8'} />
                    </View>
                    <View style={styles.cameraButton}>
                        <Camera size={14} color="#ffffff" />
                    </View>
                </View>
                <Text style={styles.avatarHint}>Profile photo — coming soon</Text>

                {/* Header */}
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.subtitle}>
                    Just a few more details to personalize your Pulse experience.
                </Text>

                {/* First Name */}
                <Text style={styles.label}>First Name</Text>
                <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="e.g. John"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    autoCapitalize="words"
                />

                {/* Middle Name */}
                <Text style={styles.label}>
                    Middle Name{' '}
                    <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <TextInput
                    style={styles.input}
                    value={middleName}
                    onChangeText={setMiddleName}
                    placeholder="e.g. William"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    autoCapitalize="words"
                />

                {/* Last Name */}
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="e.g. Doe"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    autoCapitalize="words"
                />

                {/* Age */}
                <Text style={styles.label}>Age</Text>
                <TextInput
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder="e.g. 25"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    keyboardType="numeric"
                    maxLength={3}
                />

                {/* Gender */}
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderGrid}>
                    {GENDER_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.genderChip,
                                gender === option && styles.genderChipSelected,
                            ]}
                            onPress={() => setGender(option)}
                        >
                            <Text
                                style={[
                                    styles.genderChipText,
                                    gender === option && styles.genderChipTextSelected,
                                ]}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.continueButtonText}>Continue</Text>
                    )}
                </TouchableOpacity>

            </View>
        </ScrollView>
    );
}

const lightStyles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingVertical: 40,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    avatarWrapper: {
        alignSelf: 'center',
        marginBottom: 8,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#cbd5e1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatarHint: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    optional: {
        fontWeight: '400',
        color: '#94a3b8',
    },
    input: {
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 16,
    },
    genderGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 28,
    },
    genderChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    genderChipSelected: {
        borderColor: '#0ea5e9',
        backgroundColor: '#e0f2fe',
    },
    genderChipText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    genderChipTextSelected: {
        color: '#0284c7',
        fontWeight: '600',
    },
    continueButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

const darkStyles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingVertical: 40,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    avatarWrapper: {
        alignSelf: 'center',
        marginBottom: 8,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#475569',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#475569',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1e293b',
    },
    avatarHint: {
        textAlign: 'center',
        fontSize: 12,
        color: '#64748b',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#f8fafc',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cbd5e1',
        marginBottom: 6,
    },
    optional: {
        fontWeight: '400',
        color: '#64748b',
    },
    input: {
        backgroundColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 15,
        color: '#f8fafc',
        marginBottom: 16,
    },
    genderGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 28,
    },
    genderChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#334155',
        backgroundColor: '#1e293b',
    },
    genderChipSelected: {
        borderColor: '#0ea5e9',
        backgroundColor: '#0c2340',
    },
    genderChipText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    genderChipTextSelected: {
        color: '#38bdf8',
        fontWeight: '600',
    },
    continueButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
