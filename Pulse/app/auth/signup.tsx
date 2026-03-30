import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, useColorScheme, Alert, ActivityIndicator } from 'react-native';
import { Mail, Lock, Eye, EyeOff, X, ArrowRight, ArrowLeft, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { registerUser } from '../services/auth';

export default function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handleSignUp = async () => {
        if (!termsAccepted) {
            Alert.alert('Error', 'Please accept the Terms and Conditions');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        setIsLoading(true);
        try {
            await registerUser(email, password);
            Alert.alert('Success', 'Account created! Please log in.', [
                { text: 'OK', onPress: () => router.push('/auth/login') },
            ]);
            router.push('/auth/login');
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNavigateToLogin = () => {
        router.push('/auth/login');
    };

    const handleBack = () => {
        router.back();
    };

    const handleGoogleSignUp = () => {
        console.log('Google signup');
    };

    const handleAppleSignUp = () => {
        console.log('Apple signup');
    };

    const styles = isDark ? darkStyles : lightStyles;
    const modalStyles = isDark ? darkModalStyles : lightModalStyles;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Back Button */}
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
                </TouchableOpacity>

                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoIcon}>💙</Text>
                    <Text style={styles.logoText}>PULSE</Text>
                </View>

                <View style={styles.card}>
                    {/* Header */}
                    <Text style={styles.title}>Create your account</Text>
                    <Text style={styles.subtitle}>
                        Start your daily wellness check-in{'\n'}and track your peace of mind.
                    </Text>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="name@example.com"
                                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={styles.input}
                            />
                            <Mail size={20} color={isDark ? '#64748b' : '#94a3b8'} style={styles.inputIconRight} />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Min 8 characters"
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

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Retype password"
                                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                                secureTextEntry={!showConfirmPassword}
                                style={styles.input}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={styles.eyeIcon}
                            >
                                {showConfirmPassword ?
                                    <EyeOff size={20} color={isDark ? '#64748b' : '#94a3b8'} /> :
                                    <Lock size={20} color={isDark ? '#64748b' : '#94a3b8'} />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Terms Checkbox */}
                    <View style={styles.termsContainer}>
                        <TouchableOpacity
                            onPress={() => setTermsAccepted(!termsAccepted)}
                            style={[
                                styles.checkbox,
                                termsAccepted && styles.checkboxChecked
                            ]}
                        >
                            {termsAccepted && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                        <View style={styles.termsTextContainer}>
                            <Text style={styles.termsText}>I agree to the </Text>
                            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                                <Text style={styles.termsLink}>Terms of Service</Text>
                            </TouchableOpacity>
                            <Text style={styles.termsText}> and </Text>
                            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                                <Text style={styles.termsLink}>Privacy Policy</Text>
                            </TouchableOpacity>
                            <Text style={styles.termsText}>.</Text>
                        </View>
                    </View>

                    {/* Sign Up Button */}
                    <TouchableOpacity
                        onPress={handleSignUp}
                        style={styles.signUpButton}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <>
                                <Text style={styles.signUpButtonText}>Sign Up</Text>
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

                    {/* Social Buttons */}
                    <View style={styles.socialButtonsContainer}>
                        <TouchableOpacity
                            onPress={handleGoogleSignUp}
                            style={styles.socialButton}
                        >
                            <View style={styles.socialIconCircle}>
                                <Text style={styles.socialIcon}>G</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleAppleSignUp}
                            style={styles.socialButton}
                        >
                            <View style={styles.socialIconCircle}>
                                <Text style={styles.socialIcon}>🍎</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Login Link */}
                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already a member? </Text>
                        <TouchableOpacity onPress={handleNavigateToLogin}>
                            <Text style={styles.loginLink}>Log In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Terms Modal */}
            <Modal
                visible={showTermsModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTermsModal(false)}
            >
                <View style={modalStyles.modalOverlay}>
                    <View style={modalStyles.modalContent}>
                        <View style={modalStyles.modalHeader}>
                            <Text style={modalStyles.modalTitle}>Terms and Conditions</Text>
                            <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                                <X size={24} color={isDark ? '#94a3b8' : '#64748b'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={modalStyles.modalBody}>
                            <Text style={modalStyles.modalText}>
                                Welcome to Pulse! By creating an account, you agree to the following terms and conditions:
                            </Text>

                            <Text style={modalStyles.modalSectionTitle}>1. Account Usage</Text>
                            <Text style={modalStyles.modalText}>
                                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                            </Text>

                            <Text style={modalStyles.modalSectionTitle}>2. User Conduct</Text>
                            <Text style={modalStyles.modalText}>
                                You agree to use Pulse in accordance with all applicable laws and regulations. You will not use the service for any unlawful or harmful purposes.
                            </Text>

                            <Text style={modalStyles.modalSectionTitle}>3. Privacy</Text>
                            <Text style={modalStyles.modalText}>
                                We respect your privacy and are committed to protecting your personal information. Please review our Privacy Policy for details on how we collect and use your data.
                            </Text>

                            <Text style={modalStyles.modalSectionTitle}>4. Termination</Text>
                            <Text style={modalStyles.modalText}>
                                We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our discretion.
                            </Text>

                            <Text style={modalStyles.modalText}>
                                By clicking "Sign Up", you acknowledge that you have read and agree to these Terms and Conditions.
                            </Text>
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setShowTermsModal(false)}
                            style={modalStyles.modalButton}
                        >
                            <Text style={modalStyles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Light Theme Styles
const lightStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 60,
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    logoIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    logoText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: 2,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
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
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#0f172a',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        height: '100%',
    },
    inputIconRight: {
        marginLeft: 12,
    },
    eyeIcon: {
        padding: 4,
        marginLeft: 8,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        borderRadius: 4,
        marginRight: 12,
        marginTop: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#0ea5e9',
        borderColor: '#0ea5e9',
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    termsTextContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    termsText: {
        fontSize: 14,
        color: '#64748b',
    },
    termsLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
    signUpButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    signUpButtonText: {
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
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
    },
    socialButton: {
        width: 56,
        height: 56,
    },
    socialIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialIcon: {
        fontSize: 20,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    loginText: {
        fontSize: 14,
        color: '#64748b',
    },
    loginLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

// Dark Theme Styles
const darkStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        paddingTop: 60,
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    logoIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    logoText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f8fafc',
        letterSpacing: 2,
    },
    card: {
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
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
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#f8fafc',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#f8fafc',
        height: '100%',
    },
    inputIconRight: {
        marginLeft: 12,
    },
    eyeIcon: {
        padding: 4,
        marginLeft: 8,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderColor: '#475569',
        borderRadius: 4,
        marginRight: 12,
        marginTop: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#0ea5e9',
        borderColor: '#0ea5e9',
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    termsTextContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    termsText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    termsLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
    signUpButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    signUpButtonText: {
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
        justifyContent: 'center',
        gap: 16,
        marginBottom: 24,
    },
    socialButton: {
        width: 56,
        height: 56,
    },
    socialIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialIcon: {
        fontSize: 20,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    loginText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    loginLink: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0ea5e9',
    },
});

// Light Modal Styles
const lightModalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },
    modalBody: {
        marginBottom: 20,
    },
    modalText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#64748b',
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 8,
    },
    modalButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

// Dark Modal Styles
const darkModalStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#f8fafc',
    },
    modalBody: {
        marginBottom: 20,
    },
    modalText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#94a3b8',
        marginBottom: 16,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: 8,
    },
    modalButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export { SignUp };