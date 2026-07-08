import { useEffect } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from './store/appStore';
import { refreshIdToken, checkProfileComplete, getUserPrefs } from './services/auth';
import { hydrateCache } from './utils/cache';
import { flushQueue, isNetworkError } from './utils/offlineQueue';

export default function Index() {
  const isDark = useColorScheme() === 'dark';

  const { setToken, setLastPulseCheckedAt, setAiPlan, setUseLocalAi, setJournalAiEnabled, clearSession } = useAppStore(s => ({
    setToken: s.setToken,
    setLastPulseCheckedAt: s.setLastPulseCheckedAt,
    setAiPlan: s.setAiPlan,
    setUseLocalAi: s.setUseLocalAi,
    setJournalAiEnabled: s.setJournalAiEnabled,
    clearSession: s.clearSession,
  }));

  useEffect(() => {
    // Zustand's persist middleware rehydrates on the first render tick.
    // Wait one tick so the store values reflect AsyncStorage before we act.
    const timer = setTimeout(async () => {
      // Load last-known data (summaries, lists) so screens can render offline.
      await hydrateCache();

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
      try {
        const result = await refreshIdToken(storedRefresh);
        freshToken = result.token;
        setToken(result.token, result.refreshToken);
      } catch (e) {
        if (isNetworkError(e)) {
          // Offline — keep the session and let apiClient refresh once
          // connectivity returns. Cached data still renders.
          router.replace('/(tabs)/home');
          return;
        }
        // Refresh token expired/revoked — force re-login
        clearSession();
        router.replace('/auth/login');
        return;
      }

      // Sync any check-ins/journal entries written while offline (fire-and-forget).
      flushQueue().catch(() => {});

      // Restore user prefs (lastPulseCheckedAt, aiPlan, journal AI opt-in)
      try {
        const prefs = await getUserPrefs(storedUserId, freshToken);
        setLastPulseCheckedAt(prefs.lastPulseCheckedAt);
        setAiPlan(prefs.aiPlan);
        setUseLocalAi(prefs.aiPlan === 'local');
        setJournalAiEnabled(prefs.journalAiEnabled);

        const profileDone = await checkProfileComplete(storedUserId, freshToken);
        if (!profileDone) {
          router.replace(`/auth/complete-signup?userId=${encodeURIComponent(storedUserId)}&token=${encodeURIComponent(freshToken)}`);
          return;
        }

        // AI engine choice is required before the app is usable.
        router.replace(prefs.aiPlan ? '/(tabs)/home' : '/auth/choose-plan');
      } catch {
        // Prefs fetch failed but token is valid — go to dashboard
        router.replace('/(tabs)/home');
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
