import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, useColorScheme, Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, User } from 'lucide-react-native';
import { updateProfile, uploadAvatar } from '../services/auth';
import { useAppStore } from '../store/appStore';
import BackButton from '../components/BackButton';
import AvatarPickerSheet from '../components/AvatarPickerSheet';
import { pickFromCamera, pickFromLibrary } from '../hooks/useAvatarPicker';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function EditProfile() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token, profile, setProfile, showToast } = useAppStore(s => ({
        userId: s.userId,
        token: s.token,
        profile: s.profile,
        setProfile: s.setProfile,
        showToast: s.showToast,
    }));

    const [firstName, setFirstName] = useState(profile?.firstName ?? '');
    const [middleName, setMiddleName] = useState(profile?.middleName ?? '');
    const [lastName, setLastName] = useState(profile?.lastName ?? '');
    const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
    const [gender, setGender] = useState(profile?.gender ?? '');
    const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [showPickerSheet, setShowPickerSheet] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleUpload = async (picked: Awaited<ReturnType<typeof pickFromLibrary>>) => {
        if (!picked || !userId || !token) return;
        setLocalPhotoUri(picked.uri);
        setIsUploadingPhoto(true);
        try {
            const photoURL = await uploadAvatar(userId, token, picked.base64, picked.mimeType);
            setProfile({ ...profile!, photoURL });
        } catch (e: any) {
            Alert.alert('Upload failed', e.message || 'Could not upload photo');
            setLocalPhotoUri(null);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

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
            const updated = {
                ...profile,
                firstName: firstName.trim(),
                middleName: middleName.trim(),
                lastName: lastName.trim(),
                age: parsedAge,
                gender,
            };
            await updateProfile(userId, token, updated);
            setProfile(updated);
            showToast('Profile updated successfully');
            router.replace('/(tabs)/profile');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <BackButton />
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Avatar */}
                <TouchableOpacity style={styles.avatarWrapper} onPress={() => setShowPickerSheet(true)} disabled={isUploadingPhoto}>
                    <View style={styles.avatar}>
                        {localPhotoUri || profile?.photoURL ? (
                            <Image
                                source={{ uri: localPhotoUri ?? profile!.photoURL }}
                                style={styles.avatarImage}
                                cachePolicy="disk"
                            />
                        ) : (
                            <User size={48} color={isDark ? '#64748b' : '#94a3b8'} />
                        )}
                    </View>
                    <View style={styles.cameraButton}>
                        {isUploadingPhoto
                            ? <ActivityIndicator size="small" color="#ffffff" />
                            : <Camera size={14} color="#ffffff" />
                        }
                    </View>
                </TouchableOpacity>

                <AvatarPickerSheet
                    visible={showPickerSheet}
                    onCamera={async () => {
                        setShowPickerSheet(false);
                        handleUpload(await pickFromCamera());
                    }}
                    onLibrary={async () => {
                        setShowPickerSheet(false);
                        handleUpload(await pickFromLibrary());
                    }}
                    onClose={() => setShowPickerSheet(false)}
                />

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
                    Middle Name <Text style={styles.optional}>(Optional)</Text>
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
                            style={[styles.genderChip, gender === option && styles.genderChipSelected]}
                            onPress={() => setGender(option)}
                        >
                            <Text style={[styles.genderChipText, gender === option && styles.genderChipTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const lightStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    content: { padding: 24, paddingBottom: 48 },
    avatarWrapper: { alignSelf: 'center', marginBottom: 28, position: 'relative' },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    avatarImage: { width: 100, height: 100, borderRadius: 50 },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#f8fafc',
    },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
    optional: { fontWeight: '400', color: '#94a3b8' },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 16,
    },
    genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
    genderChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    genderChipSelected: { borderColor: '#0ea5e9', backgroundColor: '#e0f2fe' },
    genderChipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
    genderChipTextSelected: { color: '#0284c7', fontWeight: '600' },
    saveButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});

const darkStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#0f172a',
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
    content: { padding: 24, paddingBottom: 48 },
    avatarWrapper: { alignSelf: 'center', marginBottom: 28, position: 'relative' },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#475569',
        overflow: 'hidden',
    },
    avatarImage: { width: 100, height: 100, borderRadius: 50 },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#0ea5e9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0f172a',
    },
    label: { fontSize: 14, fontWeight: '600', color: '#cbd5e1', marginBottom: 6 },
    optional: { fontWeight: '400', color: '#64748b' },
    input: {
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        fontSize: 15,
        color: '#f8fafc',
        marginBottom: 16,
    },
    genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
    genderChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#334155',
        backgroundColor: '#1e293b',
    },
    genderChipSelected: { borderColor: '#0ea5e9', backgroundColor: '#0c2340' },
    genderChipText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
    genderChipTextSelected: { color: '#38bdf8', fontWeight: '600' },
    saveButton: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
