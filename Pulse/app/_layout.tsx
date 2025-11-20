import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen options={{ title: 'Oops! Not Found' }} />
      <Stack.Screen name="index" options={{ title: 'Login' }} />
      <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
      <Stack.Screen name="auth/signup" options={{ title: 'Sign Up' }} />
      <Stack.Screen name="screens/landing" options={{ title: 'Welcome to Pulse!' }} />
      <Stack.Screen name="screens/reminders" options={{ title: 'Reminders' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
