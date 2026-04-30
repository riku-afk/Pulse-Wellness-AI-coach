import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { LayoutDashboard, BarChart2, BookOpen, User } from 'lucide-react-native';

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
                    name="pages/Dashboard"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="pages/Insights"
                    options={{
                        title: 'Insights',
                        tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="pages/Journal"
                    options={{
                        title: 'Journal',
                        tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="pages/Settings"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
                    }}
                />
            </Tabs>
        </SafeAreaProvider>
    );
}
