import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal, View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Bell, Sun, Moon } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';
import { getNotifications, markAllRead, AppNotification } from '../services/notifications';

const { width: SW } = require('react-native').Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

function formatTimestamp(raw: string): string {
    if (!raw) return '';
    try {
        const d = new Date(raw);
        return d.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return raw;
    }
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onUnreadCountChange: (count: number) => void;
}

export default function NotificationModal({ visible, onClose, onUnreadCountChange }: Props) {
    const isDark = useColorScheme() === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token } = useAppStore(s => ({ userId: s.userId, token: s.token }));
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!userId || !token) return;
        setLoading(true);
        try {
            const result = await getNotifications(userId, token);
            setNotifications(result.notifications);
            onUnreadCountChange(result.unreadCount);

            // Mark all as read when modal opens
            if (result.unreadCount > 0) {
                await markAllRead(userId, token);
                onUnreadCountChange(0);
            }
        } catch (e) {
            console.error('Failed to load notifications:', e);
        } finally {
            setLoading(false);
        }
    }, [userId, token]);

    useEffect(() => {
        if (visible) load();
    }, [visible, load]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: insets.top + s(8) }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Bell size={s(20)} color="#0ea5e9" />
                        <Text style={styles.title}>Notifications</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <X size={s(22)} color={isDark ? '#94a3b8' : '#64748b'} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#0ea5e9" />
                    </View>
                ) : notifications.length === 0 ? (
                    <View style={styles.centered}>
                        <Bell size={s(48)} color={isDark ? '#334155' : '#e2e8f0'} />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                        <Text style={styles.emptySub}>You'll see pulse reminders here.</Text>
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: s(20), paddingBottom: insets.bottom + s(32) }}
                    >
                        {notifications.map((notif) => (
                            <View key={notif.id} style={[styles.card, !notif.isRead && styles.cardUnread]}>
                                <View style={styles.cardIcon}>
                                    {notif.type === 'morning_reminder'
                                        ? <Sun size={s(18)} color="#f59e0b" />
                                        : <Moon size={s(18)} color="#818cf8" />
                                    }
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{notif.title}</Text>
                                    <Text style={styles.cardBody}>{notif.body}</Text>
                                    <Text style={styles.cardTime}>{formatTimestamp(notif.createdAt)}</Text>
                                </View>
                                {!notif.isRead && <View style={styles.unreadDot} />}
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const lightStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(20),
        paddingBottom: s(16),
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        marginBottom: s(8),
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
    title: { fontSize: s(20), fontWeight: '700', color: '#0f172a' },
    closeBtn: {
        width: s(36), height: s(36), borderRadius: s(18),
        backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(12) },
    emptyText: { fontSize: s(17), fontWeight: '700', color: '#0f172a' },
    emptySub: { fontSize: s(13), color: '#94a3b8', textAlign: 'center' },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: s(12),
        backgroundColor: '#ffffff',
        borderRadius: s(16),
        padding: s(14),
        marginBottom: s(10),
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardUnread: { borderColor: '#bae6fd', backgroundColor: '#f0f9ff' },
    cardIcon: {
        width: s(36), height: s(36), borderRadius: s(10),
        backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center',
    },
    cardTitle: { fontSize: s(14), fontWeight: '700', color: '#0f172a', marginBottom: s(2) },
    cardBody: { fontSize: s(13), color: '#475569', lineHeight: s(20), marginBottom: s(4) },
    cardTime: { fontSize: s(11), color: '#94a3b8' },
    unreadDot: {
        width: s(8), height: s(8), borderRadius: s(4),
        backgroundColor: '#0ea5e9', marginTop: s(4),
    },
});

const darkStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(20),
        paddingBottom: s(16),
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        marginBottom: s(8),
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
    title: { fontSize: s(20), fontWeight: '700', color: '#f8fafc' },
    closeBtn: {
        width: s(36), height: s(36), borderRadius: s(18),
        backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: s(12) },
    emptyText: { fontSize: s(17), fontWeight: '700', color: '#f8fafc' },
    emptySub: { fontSize: s(13), color: '#64748b', textAlign: 'center' },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: s(12),
        backgroundColor: '#1e293b',
        borderRadius: s(16),
        padding: s(14),
        marginBottom: s(10),
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardUnread: { borderColor: '#0c4a6e', backgroundColor: '#0c2233' },
    cardIcon: {
        width: s(36), height: s(36), borderRadius: s(10),
        backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center',
    },
    cardTitle: { fontSize: s(14), fontWeight: '700', color: '#f8fafc', marginBottom: s(2) },
    cardBody: { fontSize: s(13), color: '#94a3b8', lineHeight: s(20), marginBottom: s(4) },
    cardTime: { fontSize: s(11), color: '#475569' },
    unreadDot: {
        width: s(8), height: s(8), borderRadius: s(4),
        backgroundColor: '#38bdf8', marginTop: s(4),
    },
});
