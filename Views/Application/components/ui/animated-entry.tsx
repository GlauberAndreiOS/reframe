import React, {useEffect} from 'react';
import {Platform, View, ViewProps} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming} from 'react-native-reanimated';

interface AnimatedEntryProps extends ViewProps {
    delay?: number;
    duration?: number;
}

export function AnimatedEntry({
	children,
	style,
	delay = 0,
	duration = 800,
	...props
}: AnimatedEntryProps) {
	// Fallback defensivo: em alguns devices Android, a combinação de animação
	// + telas com modais pode causar crash nativo em draw/display list.
	if (Platform.OS === 'android') {
		return (
			<View style={style} {...props}>
				{children}
			</View>
		);
	}

	return (
		<AnimatedEntryWithReanimated
			delay={delay}
			duration={duration}
			style={style}
			{...props}
		>
			{children}
		</AnimatedEntryWithReanimated>
	);
}

function AnimatedEntryWithReanimated({
	children,
	style,
	delay = 0,
	duration = 800,
	...props
}: AnimatedEntryProps) {
	const fadeOpacity = useSharedValue(0);
	const contentTranslateY = useSharedValue(20);

	useEffect(() => {
		const animation = withTiming(1, {duration});
		const translateAnimation = withTiming(0, {duration, easing: Easing.out(Easing.cubic)});

		if (delay > 0) {
			fadeOpacity.value = withDelay(delay, animation);
			contentTranslateY.value = withDelay(delay, translateAnimation);
		} else {
			fadeOpacity.value = animation;
			contentTranslateY.value = translateAnimation;
		}
	}, [delay, duration, fadeOpacity, contentTranslateY]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: fadeOpacity.value,
		transform: [{translateY: contentTranslateY.value}],
	}));

	return (
		<Animated.View style={[style, animatedStyle]} {...props}>
			{children}
		</Animated.View>
	);
}
