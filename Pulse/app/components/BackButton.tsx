import React from 'react';
import { TouchableOpacity, Text, StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

interface BackButtonProps {
    label?: string;
    onPress?: () => void;
    style?: ViewStyle;
}

export default function BackButton({ label, onPress, style }: BackButtonProps) {
    const isDark = useColorScheme() === 'dark';
    const color = isDark ? '#f8fafc' : '#0f172a';

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={onPress ?? (() => router.back())}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <ChevronLeft size={22} color={color} />
            {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
});
