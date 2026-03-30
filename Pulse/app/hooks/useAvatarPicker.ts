import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface PickedImage {
    uri: string;
    base64: string;
    mimeType: string;
}

async function pick(launcher: () => Promise<ImagePicker.ImagePickerResult>): Promise<PickedImage | null> {
    const result = await launcher();
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    if (!asset.base64) return null;
    return {
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
    };
}

export async function pickFromCamera(): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
        Alert.alert('Permission required', 'Camera access is needed to take a photo.');
        return null;
    }
    return pick(() =>
        ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        })
    );
}

export async function pickFromLibrary(): Promise<PickedImage | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        Alert.alert('Permission required', 'Photo library access is needed.');
        return null;
    }
    return pick(() =>
        ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        })
    );
}
