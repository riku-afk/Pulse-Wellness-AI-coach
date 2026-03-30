import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';

interface Props {
    size?: number;
    /** Override the store photo — e.g. a local URI picked before upload completes */
    uriOverride?: string | null;
}

/**
 * Displays the current user's profile photo from the store.
 * Uses expo-image with disk caching — the image is downloaded once and served
 * from disk on every subsequent render, even across app restarts.
 * Falls back to initials then to a generic icon.
 */
export default function UserAvatar({ size = 40, uriOverride }: Props) {
    const profile = useAppStore(s => s.profile);
    const [imgError, setImgError] = useState(false);

    const photoURI = uriOverride ?? profile?.photoURL;

    // Reset error state when the URI changes (e.g. after a fresh upload)
    useEffect(() => { setImgError(false); }, [photoURI]);

    const initials = profile
        ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase()
        : null;

    const radius = size / 2;

    if (photoURI && !imgError) {
        return (
            <Image
                source={{ uri: photoURI }}
                style={{ width: size, height: size, borderRadius: radius }}
                cachePolicy="disk"
                onError={() => setImgError(true)}
            />
        );
    }

    if (initials) {
        const fontSize = Math.round(size * 0.38);
        return (
            <View style={[styles.initialsCircle, { width: size, height: size, borderRadius: radius }]}>
                <Text style={[styles.initialsText, { fontSize }]}>{initials}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.iconCircle, { width: size, height: size, borderRadius: radius }]}>
            <User size={Math.round(size * 0.5)} color="#94a3b8" />
        </View>
    );
}

const styles = StyleSheet.create({
    initialsCircle: {
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialsText: {
        color: '#ffffff',
        fontWeight: '700',
    },
    iconCircle: {
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
