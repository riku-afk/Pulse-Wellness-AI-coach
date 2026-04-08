import { useEffect } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from './store/appStore';
import { refreshIdToken, checkProfileComplete, getUserPrefs } from './services/auth';

export default function Index() {
  const isDark = useColorScheme() === 'dark';

  const { setToken, setLastPulseCheckedAt, setHasSeenLanding, clearSession } = useAppStore(s => ({
    setToken: s.setToken,
    setLastPulseCheckedAt: s.setLastPulseCheckedAt,
    setHasSeenLanding: s.setHasSeenLanding,
    clearSession: s.clearSession,
  }));

  useEffect(() => {
    // Zustand's persist middleware rehydrates on the first render tick.
    // Wait one tick so the store values reflect AsyncStorage before we act.
    const timer = setTimeout(async () => {
      const storeState = useAppStore.getState();
      const storedUserId = storeState.userId;
      const storedToken = storeState.token;
      const storedRefresh = storeState.refreshToken;

      if (!storedUserId || !storedToken) {
        // No session stored — go to login
        router.replace('/auth/login');
        return;
      }

      if (!storedRefresh) {
        // Old install — no refresh token stored, force re-login
        clearSession();
        router.replace('/auth/login');
        return;
      }

      // Silently refresh the idToken before navigating
      let freshToken = storedToken;
      let freshRefresh = storedRefresh;
      try {
        const result = await refreshIdToken(storedRefresh);
        freshToken = result.token;
        freshRefresh = result.refreshToken;
        setToken(freshToken, freshRefresh);
      } catch {
        // Refresh token expired/revoked — force re-login
        clearSession();
        router.replace('/auth/login');
        return;
      }

      // Restore user prefs (hasSeenLanding, lastPulseCheckedAt)
      try {
        const prefs = await getUserPrefs(storedUserId, freshToken);
        setLastPulseCheckedAt(prefs.lastPulseCheckedAt);
        setHasSeenLanding(prefs.hasSeenLanding);

        const profileDone = await checkProfileComplete(storedUserId, freshToken);
        if (!profileDone) {
          router.replace(`/auth/complete-signup?userId=${encodeURIComponent(storedUserId)}&token=${encodeURIComponent(freshToken)}`);
          return;
        }

        router.replace(prefs.hasSeenLanding ? '/pages/Dashboard' : '/(tabs)/landing');
      } catch {
        // Prefs fetch failed but token is valid — go to dashboard
        router.replace('/pages/Dashboard');
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );
}
