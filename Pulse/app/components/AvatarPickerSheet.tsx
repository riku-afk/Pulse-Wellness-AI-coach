import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';

interface Props {
    visible: boolean;
    onCamera: () => void;
    onLibrary: () => void;
    onClose: () => void;
}

export default function AvatarPickerSheet({ visible, onCamera, onLibrary, onClose }: Props) {
    const isDark = useColorScheme() === 'dark';
    const s = isDark ? dark : light;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={s.sheet}>
                <View style={s.handle} />
                <Text style={s.title}>Profile Photo</Text>

                <TouchableOpacity style={s.option} onPress={onCamera} activeOpacity={0.7}>
                    <View style={s.iconBox}>
                        <Camera size={20} color="#0ea5e9" />
                    </View>
                    <Text style={s.optionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.option} onPress={onLibrary} activeOpacity={0.7}>
                    <View style={s.iconBox}>
                        <ImageIcon size={20} color="#0ea5e9" />
                    </View>
                    <Text style={s.optionText}>Choose from Library</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.cancel} onPress={onClose} activeOpacity={0.7}>
                    <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                    <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const base = {
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    } as const,
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
    } as const,
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center' as const,
        marginBottom: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: '700' as const,
        marginBottom: 20,
        textAlign: 'center' as const,
    },
    option: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 14,
        gap: 14,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500' as const,
    },
    cancel: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginTop: 8,
        paddingVertical: 14,
        gap: 6,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '500' as const,
    },
};

const light = StyleSheet.create({
    ...base,
    sheet: { ...base.sheet, backgroundColor: '#ffffff' },
    handle: { ...base.handle, backgroundColor: '#e2e8f0' },
    title: { ...base.title, color: '#0f172a' },
    optionText: { ...base.optionText, color: '#0f172a' },
    cancelText: { ...base.cancelText, color: '#64748b' },
});

const dark = StyleSheet.create({
    ...base,
    sheet: { ...base.sheet, backgroundColor: '#1e293b' },
    handle: { ...base.handle, backgroundColor: '#475569' },
    title: { ...base.title, color: '#f8fafc' },
    optionText: { ...base.optionText, color: '#f8fafc' },
    cancelText: { ...base.cancelText, color: '#94a3b8' },
});
