import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticType =
    | 'light'      // subtle tap — card presses, list items
    | 'medium'     // firmer tap — primary buttons
    | 'selection'  // picker-style tick — tabs, toggles, mood selectors
    | 'success'    // notification — saves, submissions
    | 'warning'
    | 'error'
    | false;

/** Fire-and-forget haptic feedback. No-ops on web and never throws. */
export function triggerHaptic(type: HapticType = 'light'): void {
    if (!type || Platform.OS === 'web') return;
    try {
        switch (type) {
            case 'light':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                break;
            case 'medium':
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                break;
            case 'selection':
                Haptics.selectionAsync().catch(() => {});
                break;
            case 'success':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                break;
            case 'warning':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                break;
            case 'error':
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                break;
        }
    } catch { /* haptics unavailable on this device */ }
}
