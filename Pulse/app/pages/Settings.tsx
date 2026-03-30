import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    useColorScheme, Switch, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, Bell, User, ChevronRight, Shield } from 'lucide-react-native';
import { logout } from '../services/auth';
import { useAppStore } from '../store/appStore';
import BackButton from '../components/BackButton';
import UserAvatar from '../components/UserAvatar';

const { width: SW } = require('react-native').Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

export default function Settings() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const { profile, clearSession, showToast } = useAppStore(s => ({
        profile: s.profile,
        clearSession: s.clearSession,
        showToast: s.showToast,
    }));

    const handleLogout = async () => {
        try {
            await logout();
        } catch (e) {
            // Server-side logout failed (e.g. offline) — still clear local session
            console.warn('Server logout failed, clearing session locally:', e);
        } finally {
            clearSession();
            showToast('Logged out successfully');
            router.replace('/auth/login');
        }
    };

    const displayName = profile
        ? `${profile.firstName} ${profile.lastName}`
        : 'User';

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: insets.top + s(12), paddingBottom: insets.bottom + s(32) }}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <BackButton />
                    <Text style={styles.pageTitle}>Settings</Text>
                </View>

                {/* ── Account Card ── */}
                <View style={styles.accountCard}>
                    <View style={styles.avatarCircle}>
                        <UserAvatar size={s(56)} />
                    </View>
                    <View style={styles.accountInfo}>
                        <Text style={styles.accountName}>{displayName}</Text>
                        <Text style={styles.accountSub}>Pulse Member</Text>
                    </View>
                </View>

                {/* ── Account Settings ── */}
                <Text style={styles.sectionLabel}>ACCOUNT</Text>
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.row}
                        activeOpacity={0.7}
                        onPress={() => router.push('/pages/EditProfile')}
                    >
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                                <User size={s(18)} color="#0ea5e9" />
                            </View>
                            <Text style={styles.rowLabel}>Edit Profile</Text>
                        </View>
                        <ChevronRight size={s(18)} color="#94a3b8" />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#fef9c3' }]}>
                                <Shield size={s(18)} color="#ca8a04" />
                            </View>
                            <Text style={styles.rowLabel}>Privacy & Security</Text>
                        </View>
                        <ChevronRight size={s(18)} color="#94a3b8" />
                    </View>
                </View>

                {/* ── Preferences ── */}
                <Text style={styles.sectionLabel}>PREFERENCES</Text>
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}>
                                <Bell size={s(18)} color="#16a34a" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Notifications</Text>
                                <Text style={styles.rowSub}>Daily check-in reminders</Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#cbd5e1', true: '#0ea5e9' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                </View>

                {/* ── Logout ── */}
                <Text style={styles.sectionLabel}>SESSION</Text>
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
                        <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                            <LogOut size={s(18)} color="#ef4444" />
                        </View>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const lightStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingHorizontal: s(20),
        paddingBottom: s(20),
    },
    pageTitle: {
        fontSize: s(28),
        fontWeight: '700',
        color: '#0f172a',
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: s(20),
        marginBottom: s(28),
        backgroundColor: '#ffffff',
        borderRadius: s(20),
        padding: s(16),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: s(14),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarCircle: {
        width: s(56),
        height: s(56),
        borderRadius: s(28),
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: s(26),
    },
    accountInfo: {
        flex: 1,
    },
    accountName: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#0f172a',
    },
    accountSub: {
        fontSize: s(13),
        color: '#94a3b8',
        marginTop: s(2),
    },
    sectionLabel: {
        fontSize: s(11),
        fontWeight: '700',
        color: '#94a3b8',
        letterSpacing: 1,
        marginHorizontal: s(20),
        marginBottom: s(8),
    },
    section: {
        marginHorizontal: s(20),
        marginBottom: s(24),
        backgroundColor: '#ffffff',
        borderRadius: s(16),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(16),
        paddingVertical: s(14),
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
        flex: 1,
    },
    iconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowLabel: {
        fontSize: s(15),
        fontWeight: '500',
        color: '#0f172a',
    },
    rowSub: {
        fontSize: s(12),
        color: '#94a3b8',
        marginTop: s(1),
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginLeft: s(64),
    },
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(16),
        paddingVertical: s(14),
        gap: s(12),
    },
    logoutText: {
        fontSize: s(15),
        fontWeight: '600',
        color: '#ef4444',
    },
});

const darkStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        paddingHorizontal: s(20),
        paddingBottom: s(20),
    },
    pageTitle: {
        fontSize: s(28),
        fontWeight: '700',
        color: '#f8fafc',
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: s(20),
        marginBottom: s(28),
        backgroundColor: '#1e293b',
        borderRadius: s(20),
        padding: s(16),
        borderWidth: 1,
        borderColor: '#334155',
        gap: s(14),
    },
    avatarCircle: {
        width: s(56),
        height: s(56),
        borderRadius: s(28),
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: s(26),
    },
    accountInfo: {
        flex: 1,
    },
    accountName: {
        fontSize: s(17),
        fontWeight: '700',
        color: '#f8fafc',
    },
    accountSub: {
        fontSize: s(13),
        color: '#64748b',
        marginTop: s(2),
    },
    sectionLabel: {
        fontSize: s(11),
        fontWeight: '700',
        color: '#64748b',
        letterSpacing: 1,
        marginHorizontal: s(20),
        marginBottom: s(8),
    },
    section: {
        marginHorizontal: s(20),
        marginBottom: s(24),
        backgroundColor: '#1e293b',
        borderRadius: s(16),
        borderWidth: 1,
        borderColor: '#334155',
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(16),
        paddingVertical: s(14),
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: s(12),
        flex: 1,
    },
    iconBox: {
        width: s(36),
        height: s(36),
        borderRadius: s(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowLabel: {
        fontSize: s(15),
        fontWeight: '500',
        color: '#f8fafc',
    },
    rowSub: {
        fontSize: s(12),
        color: '#64748b',
        marginTop: s(1),
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginLeft: s(64),
    },
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(16),
        paddingVertical: s(14),
        gap: s(12),
    },
    logoutText: {
        fontSize: s(15),
        fontWeight: '600',
        color: '#ef4444',
    },
});

export { Settings };
