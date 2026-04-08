import { Stack, router } from 'expo-router';
import { View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import ToastOverlay from './components/ToastOverlay';
import { useAppStore } from './store/appStore';
import { refreshIdToken } from './services/auth';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const { userId, token, refreshToken, setToken, clearSession } = useAppStore(s => ({
    userId: s.userId,
    token: s.token,
    refreshToken: s.refreshToken,
    setToken: s.setToken,
    clearSession: s.clearSession,
  }));

  useEffect(() => {
    // No stored session — nothing to restore
    if (!userId || !token) return;

    // Try to silently refresh the token on every app start.
    // Firebase idTokens expire after 1 hour; the refreshToken is long-lived.
    if (!refreshToken) {
      // Old install without a stored refreshToken — force re-login once
      clearSession();
      router.replace('/auth/login');
      return;
    }

    refreshIdToken(refreshToken)
      .then(({ token: newToken, refreshToken: newRefresh }) => {
        setToken(newToken, newRefresh);
      })
      .catch(() => {
        // Refresh token invalid/revoked — force re-login
        clearSession();
        router.replace('/auth/login');
      });
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
