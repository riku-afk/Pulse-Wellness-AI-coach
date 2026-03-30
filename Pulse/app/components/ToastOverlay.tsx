import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';

export default function ToastOverlay() {
    const toastMessage = useAppStore(s => s.toastMessage);
    const clearToast = useAppStore(s => s.clearToast);
    const opacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!toastMessage) {
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
            return;
        }

        if (hideTimer.current) clearTimeout(hideTimer.current);

        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();

        hideTimer.current = setTimeout(() => {
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                clearToast();
            });
        }, 2500);

        return () => {
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, [toastMessage]);

    if (!toastMessage) return null;

    return (
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
            <Text style={styles.text}>{toastMessage}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        bottom: 72,
        left: 24,
        right: 24,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 12,
    },
    text: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
});
