import React, { useState, useEffect } from 'react';
import {
    View, Text, Pressable, StyleSheet,
    useColorScheme, Switch, ScrollView, Modal, Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LogOut, Bell, User, ChevronRight, Shield, Sparkles, Sunrise, Moon, Cpu, Download, Trash2 } from 'lucide-react-native';
import { logout, getUserPrefs, updateUserPrefs } from '../services/auth';
import { setNotificationPreference } from '../services/notifications';
import {
    subscribeModelState, refreshModelStatus, downloadModel, cancelDownload,
    getModelState, ModelState, MODEL_LABEL, MODEL_SIZE_LABEL,
} from '../services/localAi/modelManager';
import { deleteLocalModel } from '../services/localAi/LocalPulseAi';
import { useAppStore } from '../store/appStore';
import UserAvatar from '../components/UserAvatar';
import { triggerHaptic } from '../utils/haptics';

const { width: SW } = require('react-native').Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

const formatHour = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'AM' : 'PM'}`;
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function Settings() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { profile, userId, token, clearSession, showToast, useLocalAi, setUseLocalAi, setAiPlan, journalAiEnabled, setJournalAiEnabled } = useAppStore(s => ({
        profile: s.profile,
        userId: s.userId,
        token: s.token,
        clearSession: s.clearSession,
        showToast: s.showToast,
        useLocalAi: s.useLocalAi,
        setUseLocalAi: s.setUseLocalAi,
        setAiPlan: s.setAiPlan,
        journalAiEnabled: s.journalAiEnabled,
        setJournalAiEnabled: s.setJournalAiEnabled,
    }));

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [morningHour, setMorningHour] = useState(7);
    const [eveningHour, setEveningHour] = useState(18);
    const [pickerTarget, setPickerTarget] = useState<'morning' | 'evening' | null>(null);
    const [modelState, setModelState] = useState<ModelState>(getModelState());

    useEffect(() => {
        refreshModelStatus();
        return subscribeModelState(setModelState);
    }, []);

    const handleModelAction = async () => {
        triggerHaptic('selection');
        if (modelState.status === 'absent') {
            downloadModel().catch(() => showToast('Model download failed'));
        } else if (modelState.status === 'downloading') {
            await cancelDownload();
            showToast('Download cancelled');
        } else if (modelState.status === 'ready') {
            setUseLocalAi(false);
            await deleteLocalModel();
            showToast('On-device model deleted');
        }
    };

    const handleLocalAiToggle = (value: boolean) => {
        triggerHaptic('selection');
        const plan = value ? 'local' as const : 'cloud' as const;
        setUseLocalAi(value);
        setAiPlan(plan);
        // Keep the server-side plan preference in step (best-effort).
        if (userId && token) {
            updateUserPrefs(userId, token, { aiPlan: plan }).catch(() => {});
        }
        showToast(value ? 'AI now runs on this device' : 'AI now runs in the cloud');
    };

    const modelStatusText = (): string => {
        switch (modelState.status) {
            case 'ready': return `${MODEL_LABEL} — downloaded`;
            case 'downloading': return `Downloading… ${Math.round(modelState.progress * 100)}%`;
            case 'unavailable':
                return Platform.OS === 'web'
                    ? 'Available on your phone'
                    : 'Needs a phone with at least 3 GB of RAM';
            default: return `${MODEL_LABEL} — not downloaded`;
        }
    };

    useEffect(() => {
        if (!userId || !token) return;
        getUserPrefs(userId, token)
            .then(prefs => {
                setNotificationsEnabled(prefs.notificationsEnabled);
                setJournalAiEnabled(prefs.journalAiEnabled);
                setMorningHour(prefs.morningReminderHour);
                setEveningHour(prefs.eveningReminderHour);
            })
            .catch(() => {}); // keep the defaults if prefs can't load
    }, [userId, token]);

    const handleReminderHourSelect = async (hour: number) => {
        const target = pickerTarget;
        setPickerTarget(null);
        if (!target || !userId || !token) return;
        triggerHaptic('selection');
        const prev = target === 'morning' ? morningHour : eveningHour;
        const setter = target === 'morning' ? setMorningHour : setEveningHour;
        setter(hour);
        try {
            await updateUserPrefs(userId, token, target === 'morning'
                ? { morningReminderHour: hour }
                : { eveningReminderHour: hour });
        } catch {
            setter(prev); // revert on failure
            showToast('Failed to update reminder time');
        }
    };

    const handleJournalAiToggle = async (value: boolean) => {
        triggerHaptic('selection');
        setJournalAiEnabled(value);
        if (!userId || !token) return;
        try {
            await updateUserPrefs(userId, token, { journalAiEnabled: value });
        } catch (e) {
            // Revert on failure
            setJournalAiEnabled(!value);
            showToast('Failed to update AI settings');
        }
    };

    const handleNotificationToggle = async (value: boolean) => {
        triggerHaptic('selection');
        setNotificationsEnabled(value);
        if (!userId || !token) return;
        try {
            await setNotificationPreference(userId, token, value);
        } catch (e) {
            // Revert on failure
            setNotificationsEnabled(!value);
            showToast('Failed to update notification settings');
        }
    };

    const handleLogout = async () => {
        triggerHaptic('medium');
        try {
            await logout(token ?? '');
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
                contentContainerStyle={{ paddingTop: insets.top + s(12), paddingBottom: insets.bottom + s(100) }}
            >
                {/* ── Header ── */}
                <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
                    <Text style={styles.pageTitle}>Settings</Text>
                </Animated.View>

                {/* ── Account Card ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(60)} style={[styles.accountCard, { overflow: 'hidden' }]}>
                    <View style={[styles.accountCardAccent, { backgroundColor: '#0ea5e9' }]} />
                    <View style={styles.avatarCircle}>
                        <UserAvatar size={s(56)} />
                    </View>
                    <View style={styles.accountInfo}>
                        <Text style={styles.accountName}>{displayName}</Text>
                        <Text style={styles.accountSub}>Pulse Member</Text>
                    </View>
                </Animated.View>

                {/* ── Account Settings ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(120)}>
                <Text style={styles.sectionLabel}>ACCOUNT</Text>
                <View style={styles.section}>
                    <Pressable
                        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                        onPress={() => router.push('/pages/EditProfile')}
                    >
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                                <User size={s(18)} color="#0ea5e9" />
                            </View>
                            <Text style={styles.rowLabel}>Edit Profile</Text>
                        </View>
                        <ChevronRight size={s(18)} color="#94a3b8" />
                    </Pressable>

                    <View style={styles.divider} />

                    <Pressable
                        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                        onPress={() => router.push('/pages/PrivacyPolicy')}
                    >
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#fef9c3' }]}>
                                <Shield size={s(18)} color="#ca8a04" />
                            </View>
                            <Text style={styles.rowLabel}>Privacy Policy</Text>
                        </View>
                        <ChevronRight size={s(18)} color="#94a3b8" />
                    </Pressable>
                </View>
                </Animated.View>

                {/* ── Preferences ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(180)}>
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
                            onValueChange={handleNotificationToggle}
                            trackColor={{ false: '#cbd5e1', true: '#0ea5e9' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
                                <Sparkles size={s(18)} color="#0ea5e9" />
                            </View>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.rowLabel}>Journal-aware AI</Text>
                                <Text style={styles.rowSub}>Let weekly assessments read your journal</Text>
                            </View>
                        </View>
                        <Switch
                            value={journalAiEnabled}
                            onValueChange={handleJournalAiToggle}
                            trackColor={{ false: '#cbd5e1', true: '#0ea5e9' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                    <Pressable
                        style={({ pressed }) => [styles.row, (pressed || !notificationsEnabled) && { opacity: notificationsEnabled ? 0.7 : 0.4 }]}
                        onPress={() => notificationsEnabled && setPickerTarget('morning')}
                        disabled={!notificationsEnabled}
                    >
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                                <Sunrise size={s(18)} color="#f59e0b" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Morning reminder</Text>
                                <Text style={styles.rowSub}>Start-of-day check-in nudge</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: s(14), fontWeight: '600', color: '#0ea5e9' }}>
                            {formatHour(morningHour)}
                        </Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.row, (pressed || !notificationsEnabled) && { opacity: notificationsEnabled ? 0.7 : 0.4 }]}
                        onPress={() => notificationsEnabled && setPickerTarget('evening')}
                        disabled={!notificationsEnabled}
                    >
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                                <Moon size={s(18)} color="#6366f1" />
                            </View>
                            <View>
                                <Text style={styles.rowLabel}>Evening reminder</Text>
                                <Text style={styles.rowSub}>Follow-up if you haven't checked in</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: s(14), fontWeight: '600', color: '#0ea5e9' }}>
                            {formatHour(eveningHour)}
                        </Text>
                    </Pressable>
                </View>
                </Animated.View>

                {/* ── AI Engine ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(220)}>
                <Text style={styles.sectionLabel}>AI ENGINE</Text>
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}>
                                <Cpu size={s(18)} color="#9333ea" />
                            </View>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.rowLabel}>On-device AI</Text>
                                <Text style={styles.rowSub}>{modelStatusText()}</Text>
                            </View>
                        </View>
                        <Switch
                            value={useLocalAi && modelState.status === 'ready'}
                            onValueChange={handleLocalAiToggle}
                            disabled={modelState.status !== 'ready'}
                            trackColor={{ false: '#cbd5e1', true: '#0ea5e9' }}
                            thumbColor="#ffffff"
                        />
                    </View>
                    {modelState.status !== 'unavailable' && (
                        <Pressable
                            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                            onPress={handleModelAction}
                        >
                            <View style={styles.rowLeft}>
                                <View style={[styles.iconBox, { backgroundColor: modelState.status === 'ready' ? '#fee2e2' : '#e0f2fe' }]}>
                                    {modelState.status === 'ready'
                                        ? <Trash2 size={s(18)} color="#ef4444" />
                                        : <Download size={s(18)} color="#0ea5e9" />}
                                </View>
                                <View style={{ flexShrink: 1 }}>
                                    <Text style={styles.rowLabel}>
                                        {modelState.status === 'ready' ? 'Delete model'
                                            : modelState.status === 'downloading' ? 'Cancel download'
                                            : `Download model (${MODEL_SIZE_LABEL})`}
                                    </Text>
                                    <Text style={styles.rowSub}>
                                        {modelState.status === 'downloading'
                                            ? `${Math.round(modelState.progress * 100)}% — keep the app open`
                                            : modelState.status === 'ready'
                                            ? 'Frees storage; AI switches back to cloud'
                                            : 'Wi-Fi recommended'}
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={s(18)} color="#94a3b8" />
                        </Pressable>
                    )}
                </View>
                </Animated.View>

                {/* ── Logout ── */}
                <Animated.View entering={FadeInDown.duration(400).delay(240)}>
                <Text style={styles.sectionLabel}>SESSION</Text>
                <View style={styles.section}>
                    <Pressable
                        style={({ pressed }) => [styles.logoutRow, pressed && { opacity: 0.7 }]}
                        onPress={handleLogout}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
                            <LogOut size={s(18)} color="#ef4444" />
                        </View>
                        <Text style={styles.logoutText}>Log Out</Text>
                    </Pressable>
                </View>
                </Animated.View>
            </ScrollView>

            {/* ── Reminder hour picker ── */}
            <Modal
                visible={pickerTarget !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setPickerTarget(null)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: s(32) }}
                    onPress={() => setPickerTarget(null)}
                >
                    <Pressable
                        style={{
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            borderRadius: s(20),
                            paddingVertical: s(12),
                            maxHeight: s(400),
                        }}
                        onPress={() => {}} // swallow taps so the backdrop doesn't close
                    >
                        <Text style={{
                            fontSize: s(16), fontWeight: '700', textAlign: 'center',
                            paddingVertical: s(10), color: isDark ? '#f1f5f9' : '#0f172a',
                        }}>
                            {pickerTarget === 'morning' ? 'Morning reminder time' : 'Evening reminder time'}
                        </Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {ALL_HOURS.map(h => {
                                const selected = h === (pickerTarget === 'morning' ? morningHour : eveningHour);
                                return (
                                    <Pressable
                                        key={h}
                                        onPress={() => handleReminderHourSelect(h)}
                                        style={({ pressed }) => [{
                                            paddingVertical: s(12),
                                            paddingHorizontal: s(24),
                                            backgroundColor: selected
                                                ? (isDark ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.10)')
                                                : 'transparent',
                                        }, pressed && { opacity: 0.6 }]}
                                    >
                                        <Text style={{
                                            fontSize: s(15),
                                            fontWeight: selected ? '700' : '500',
                                            textAlign: 'center',
                                            color: selected ? '#0ea5e9' : (isDark ? '#cbd5e1' : '#334155'),
                                        }}>
                                            {formatHour(h)}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
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
        paddingTop: s(20),
        gap: s(14),
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    accountCardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: s(4),
        borderTopLeftRadius: s(20),
        borderTopRightRadius: s(20),
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
        paddingTop: s(20),
        gap: s(14),
    },
    accountCardAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: s(4),
        borderTopLeftRadius: s(20),
        borderTopRightRadius: s(20),
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
