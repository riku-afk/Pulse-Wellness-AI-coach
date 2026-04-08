import { Stack } from 'expo-router';
import { View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastOverlay from './components/ToastOverlay';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';

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
