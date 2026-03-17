import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function TabLayout() {
    return (
        <SafeAreaProvider>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: { backgroundColor: '#fff' },
                }}
            >
                <Tabs.Screen name="screens/reminders" options={{ title: 'Reminders' }} />
                <Tabs.Screen name="pages/Dashboard" options={{ title: 'Dashboard' }} />
            </Tabs>
        </SafeAreaProvider>
    );
}
