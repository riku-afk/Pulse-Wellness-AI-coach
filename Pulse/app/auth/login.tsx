import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Alert, ActivityIndicator } from 'react-native';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { loginUser, checkProfileComplete } from '../services/auth';
import { useAppStore } from '../store/appStore';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const setSession = useAppStore(s => s.setSession);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const user = await loginUser(email, password);
            setSession(user.userId, user.token);
            const profileDone = await checkProfileComplete(user.userId, user.token);
            if (profileDone) {
                router.replace('/(tabs)/landing');
            } else {
                router.replace(`/auth/complete-signup?userId=${encodeURIComponent(user.userId)}&token=${encodeURIComponent(user.token)}`);
            }
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNavigateToSignUp = () => {
        router.push('/auth/signup');
    };

    const handleGoogleLogin = () => {
        console.log('Google login');
    };

    const handleAppleLogin = () => {
        console.log('Apple login');
    };

    const styles = isDark ? darkStyles : lightStyles;

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                {/* Logo/Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconBackground}>
                        <Text style={styles.iconText}>💙</Text>
                    </View>
                </View>

                {/* Header */}
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Please enter your credentials to sign in.</Text>

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

                {/* Password Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <Lock size={20} color={isDark ? '#64748b' : '#94a3b8'} style={styles.inputIcon} />
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                            secureTextEntry={!showPassword}
                            style={styles.input}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            {showPassword ?
                                <EyeOff size={20} color={isDark ? '#64748b' : '#94a3b8'} /> :
                                <Eye size={20} color={isDark ? '#64748b' : '#94a3b8'} />
                            }
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={() => router.push('/auth/forgot-password')}
                >
                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                    onPress={handleLogin}
                    style={styles.loginButton}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <>
                            <Text style={styles.loginButtonText}>Log in</Text>
                            <ArrowRight size={20} color="#ffffff" />
                        </>
                    )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>Or continue with</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Social Login Buttons */}
                <View style={styles.socialButtonsContainer}>
                    <TouchableOpacity
                        onPress={handleGoogleLogin}
                        style={styles.socialButton}
                        disabled
                    >
                        <Text style={styles.socialIcon}>G</Text>
                        <Text style={styles.socialButtonText}>Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handleAppleLogin}
                        style={styles.socialButton}
                        disabled
                    >
                        <Text style={styles.socialIcon}>🍎</Text>
                        <Text style={styles.socialButtonText}>Apple</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Up Link */}
                <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={handleNavigateToSignUp}>
                        <Text style={styles.signupLink}>Sign up</Text>
                    </TouchableOpacity>
                </View>
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
    inputContainer: {
        marginBottom: 16,
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
        outlineWidth: 0,
    },
    eyeIcon: {
        padding: 4,
    },
    forgotPassword: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#64748b',
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
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 13,
        color: '#94a3b8',
    },
    socialButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
    },
    socialIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    socialButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        fontSize: 14,
        color: '#64748b',
    },
    signupLink: {
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
    inputContainer: {
        marginBottom: 16,
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
        outlineWidth: 0,
    },
    eyeIcon: {
        padding: 4,
    },
    forgotPassword: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        fontSize: 14,
        color: '#94a3b8',
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
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#334155',
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 13,
        color: '#64748b',
    },
    socialButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    socialButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#334155',
        borderWidth: 1,
        borderColor: '#475569',
        borderRadius: 12,
        height: 52,
        paddingHorizontal: 16,
        opacity: 0.3,
    },
    socialIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    socialButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#f8fafc',
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    signupLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

export { Login };