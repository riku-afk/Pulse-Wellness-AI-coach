import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { LayoutDashboard, Bell, Settings } from 'lucide-react-native';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bg = isDark ? '#0f172a' : '#ffffff';
    const active = '#0ea5e9';
    const inactive = '#94a3b8';
    const border = isDark ? '#1e293b' : '#f1f5f9';

    return (
        <SafeAreaProvider>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor: bg,
                        borderTopColor: border,
                        borderTopWidth: 1,
                        height: 60,
                        paddingBottom: 8,
                    },
                    tabBarActiveTintColor: active,
                    tabBarInactiveTintColor: inactive,
                    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                }}
            >
                <Tabs.Screen
                    name="screens/reminders"
                    options={{
                        title: 'Reminders',
                        tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="pages/Dashboard"
                    options={{
                        title: 'Dashboard',
                        tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="pages/Settings"
                    options={{
                        title: 'Settings',
                        tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
                    }}
                />
            </Tabs>
        </SafeAreaProvider>
    );
}
