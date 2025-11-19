import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Login' }} />
      <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
      <Stack.Screen name="auth/signup" options={{ title: 'Sign Up' }} />
    </Stack>
  );
}
