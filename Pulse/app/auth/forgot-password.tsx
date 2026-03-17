import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Alert, ActivityIndicator } from 'react-native';
import { Mail, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { resetPassword } from '../services/auth';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleResetPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Email required', 'Please enter your email address.');
            return;
        }
        setIsLoading(true);
        try {
            await resetPassword(email.trim());
            setEmailSent(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const styles = isDark ? darkStyles : lightStyles;

    if (emailSent) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconBackground, styles.successIconBackground]}>
                            <CheckCircle size={40} color="#22c55e" />
                        </View>
                    </View>
                    <Text style={styles.title}>Check your inbox</Text>
                    <Text style={styles.subtitle}>
                        We sent a password reset link to{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.replace('/auth/login')}
                        style={styles.loginButton}
                    >
                        <Text style={styles.loginButtonText}>Back to login</Text>
                        <ArrowRight size={20} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { setEmailSent(false); setEmail(''); }}
                        style={styles.resendContainer}
                    >
                        <Text style={styles.resendText}>Didn't receive it? </Text>
                        <Text style={styles.resendLink}>Try again</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconBackground}>
                        <Text style={styles.iconText}>🔑</Text>
                    </View>
                </View>

                {/* Header */}
                <Text style={styles.title}>Forgot password?</Text>
                <Text style={styles.subtitle}>No worries. Enter your email and we'll send you a reset link.</Text>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <Mail size={20} color={isDark ? '#64748b' : '#94a3b8'} style={styles.inputIcon} />
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email address"
                            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={styles.input}
                        />
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    onPress={handleResetPassword}
                    style={styles.loginButton}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <>
                            <Text style={styles.loginButtonText}>Send reset link</Text>
                            <ArrowRight size={20} color="#ffffff" />
                        </>
                    )}
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backContainer}
                >
                    <ArrowLeft size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text style={styles.backText}>Back to login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const lightStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successIconBackground: {
        backgroundColor: '#dcfce7',
    },
    iconText: {
        fontSize: 36,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
        color: '#64748b',
        lineHeight: 22,
    },
    emailHighlight: {
        fontWeight: '600',
        color: '#0ea5e9',
    },
    inputContainer: {
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        height: '100%',
    },
    loginButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    backContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    backText: {
        fontSize: 14,
        color: '#64748b',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#64748b',
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

const darkStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#1e293b',
        borderRadius: 24,
        padding: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successIconBackground: {
        backgroundColor: '#14532d',
    },
    iconText: {
        fontSize: 36,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
        color: '#f8fafc',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
        color: '#94a3b8',
        lineHeight: 22,
    },
    emailHighlight: {
        fontWeight: '600',
        color: '#38bdf8',
    },
    inputContainer: {
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#f8fafc',
        height: '100%',
    },
    loginButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    loginButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    backContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    backText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#38bdf8',
    },
});
