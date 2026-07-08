import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { triggerHaptic, HapticType } from '../utils/haptics';

interface Props extends Omit<PressableProps, 'style'> {
    /** Style applied to the animated card/container (margins, padding, bg, shadows). */
    style?: StyleProp<ViewStyle>;
    /** Scale while pressed. Default 0.98 — kept subtle on purpose. */
    scaleTo?: number;
    /** Haptic fired on press. Default 'light'; pass false to disable. */
    haptic?: HapticType;
    children: React.ReactNode;
}

/**
 * Pressable with a quick, subtle UI-thread press scale and optional haptic.
 * Deliberately timing-based (not spring): springs keep oscillating after
 * release, which reads as clunky and costs frames on low-end devices.
 */
export default function AnimatedPressable({
    style, scaleTo = 0.98, haptic = 'light',
    onPressIn, onPressOut, onPress, children, ...rest
}: Props) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable
            {...rest}
            onPressIn={(e) => {
                scale.value = withTiming(scaleTo, { duration: 90 });
                onPressIn?.(e);
            }}
            onPressOut={(e) => {
                scale.value = withTiming(1, { duration: 120 });
                onPressOut?.(e);
            }}
            onPress={(e) => {
                triggerHaptic(haptic);
                onPress?.(e);
            }}
        >
            <Animated.View style={[style, animatedStyle]}>
                {children}
            </Animated.View>
        </Pressable>
    );
}
