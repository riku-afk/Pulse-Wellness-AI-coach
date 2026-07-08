import { Tabs } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PlatformPressable } from '@react-navigation/elements';
import { useColorScheme, View, Dimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, ZoomIn } from 'react-native-reanimated';
import { LayoutDashboard, BarChart2, BookOpen, User } from 'lucide-react-native';
import { triggerHaptic } from '../utils/haptics';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

// How much extra paddingBottom tab-screen scrollviews need to clear the floating bar.
// Export this so screens can import it if needed.
export const FLOATING_TAB_BAR_HEIGHT = s(68) + 20;

function AnimatedTabButton({ children, style, onPressIn: origPressIn, onPressOut: origPressOut, ...rest }: any) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = (e: any) => {
        scale.value = withTiming(0.94, { duration: 90 });
        triggerHaptic('selection');
        origPressIn?.(e);
    };
    const handlePressOut = (e: any) => {
        scale.value = withTiming(1, { duration: 120 });
        origPressOut?.(e);
    };

    return (
        // PlatformPressable (not RN Pressable): on web the tab renders as an <a href>,
        // and this calls e.preventDefault() so clicks navigate client-side instead of
        // triggering a full browser page load.
        <PlatformPressable
            {...rest}
            style={[style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, animatedStyle]}>
                {children}
            </Animated.View>
        </PlatformPressable>
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
                <Animated.View
                    entering={ZoomIn.springify().damping(12).stiffness(320)}
                    style={{
                        width: s(4),
                        height: s(4),
                        borderRadius: s(2),
                        backgroundColor: '#0ea5e9',
                    }}
                />
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
                <Tabs.Screen name="reminders" options={{ href: null }} />
            </Tabs>
        </SafeAreaProvider>
    );
}
