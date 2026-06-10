import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme, View, Pressable, Animated, Dimensions, Platform } from 'react-native';
import { LayoutDashboard, BarChart2, BookOpen, User } from 'lucide-react-native';
import { useRef } from 'react';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

// How much extra paddingBottom tab-screen scrollviews need to clear the floating bar.
// Export this so screens can import it if needed.
export const FLOATING_TAB_BAR_HEIGHT = s(68) + 20;

function AnimatedTabButton({ children, style, onPressIn: origPressIn, onPressOut: origPressOut, ...rest }: any) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = (e: any) => {
        Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, tension: 200, friction: 8 }).start();
        origPressIn?.(e);
    };
    const handlePressOut = (e: any) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }).start();
        origPressOut?.(e);
    };

    return (
        <Pressable
            {...rest}
            style={[style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
                {children}
            </Animated.View>
        </Pressable>
    );
}

interface TabIconProps {
    icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
    color: string;
    focused: boolean;
}

function TabIcon({ icon: Icon, color, focused }: TabIconProps) {
    return (
        <View style={{ alignItems: 'center', gap: s(4) }}>
            <Icon
                size={s(22)}
                color={color}
                strokeWidth={focused ? 2.5 : 1.75}
            />
            {focused && (
                <View style={{
                    width: s(4),
                    height: s(4),
                    borderRadius: s(2),
                    backgroundColor: '#0ea5e9',
                }} />
            )}
        </View>
    );
}

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const active = '#0ea5e9';
    const inactive = isDark ? '#475569' : '#94a3b8';

    const glassBg = isDark
        ? 'rgba(15, 23, 42, 0.94)'
        : 'rgba(255, 255, 255, 0.94)';
    const glassBorder = isDark
        ? 'rgba(255, 255, 255, 0.09)'
        : 'rgba(0, 0, 0, 0.07)';

    return (
        <SafeAreaProvider>
            <Tabs
                detachInactiveScreens={false}
                screenOptions={{
                    lazy: false,
                    headerShown: false,
                    tabBarActiveTintColor: active,
                    tabBarInactiveTintColor: inactive,
                    tabBarLabelStyle: {
                        fontSize: s(11),
                        fontWeight: '600',
                        marginTop: s(1),
                    },
                    tabBarButton: (props) => <AnimatedTabButton {...props} />,
                    tabBarStyle: {
                        position: 'absolute',
                        bottom: 16,
                        left: 16,
                        right: 16,
                        height: s(68),
                        borderRadius: s(22),
                        backgroundColor: glassBg,
                        borderTopWidth: 0,
                        borderWidth: 1,
                        borderColor: glassBorder,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: isDark ? 0.55 : 0.13,
                        shadowRadius: 28,
                        elevation: 24,
                        paddingBottom: Platform.OS === 'ios' ? s(4) : s(8),
                        paddingTop: s(6),
                    },
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: 'Home',
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon icon={LayoutDashboard} color={color} focused={focused} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="insights"
                    options={{
                        title: 'Insights',
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon icon={BarChart2} color={color} focused={focused} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="journal"
                    options={{
                        title: 'Journal',
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon icon={BookOpen} color={color} focused={focused} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color, focused }) => (
                            <TabIcon icon={User} color={color} focused={focused} />
                        ),
                    }}
                />
                {/* Hidden screens */}
                <Tabs.Screen name="landing" options={{ href: null }} />
                <Tabs.Screen name="reminders" options={{ href: null }} />
            </Tabs>
        </SafeAreaProvider>
    );
}
