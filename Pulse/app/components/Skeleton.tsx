import React, { useEffect } from 'react';
import { StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';

interface Props {
    width?: DimensionValue;
    height?: DimensionValue;
    radius?: number;
    isDark: boolean;
    style?: StyleProp<ViewStyle>;
}

/** Soft pulsing placeholder block shown while content loads. */
export default function Skeleton({ width = '100%', height = 16, radius = 8, isDark, style }: Props) {
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
            -1,
            true,
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
        <Animated.View
            style={[
                { width, height, borderRadius: radius, backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                animatedStyle,
                style,
            ]}
        />
    );
}
