import { Stack } from 'expo-router';
import { View, useColorScheme, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import ToastOverlay from './components/ToastOverlay';
import { useAppStore } from './store/appStore';
import { registerFCMToken } from './services/notifications';

// Show notifications as banners while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pulse_reminders', {
      name: 'Pulse Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data;
}

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const { userId, token } = useAppStore(s => ({
    userId: s.userId,
    token: s.token,
  }));

  // Register FCM push token once we have a valid session
  useEffect(() => {
    if (!userId || !token) return;

    registerForPushNotifications()
      .then((fcmToken) => {
        if (fcmToken) {
          registerFCMToken(userId, token, fcmToken).catch(() => { });
        }
      })
      .catch(() => { });
  }, [userId, token]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'slide_from_right',
            animationDuration: 250,
          }}
        />
        <ToastOverlay />
      </View>
    </SafeAreaProvider>
  );
}
