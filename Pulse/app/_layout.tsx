import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastOverlay from './components/ToastOverlay';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#fff' },
            animation: 'slide_from_right',
            animationDuration: 250,
          }}
        />
        <ToastOverlay />
      </View>
    </SafeAreaProvider>
  );
}
