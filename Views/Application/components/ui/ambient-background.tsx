import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { 
	useSharedValue, 
	useAnimatedStyle, 
	withRepeat, 
	withTiming, 
	Easing,
	withDelay
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export function AmbientBackground() {
	const float1Y = useSharedValue(0);
	const float2Y = useSharedValue(0);

	useEffect(() => {
		float1Y.value = withRepeat(
			withTiming(20, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
			-1,
			true
		);
    
		float2Y.value = withDelay(
			1000,
			withRepeat(
				withTiming(-20, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
				-1,
				true
			)
		);
	}, [float1Y, float2Y]);

	const animatedFloat1Style = useAnimatedStyle(() => ({
		transform: [{ translateY: float1Y.value }],
	}));

	const animatedFloat2Style = useAnimatedStyle(() => ({
		transform: [{ translateY: float2Y.value }],
	}));

	return (
		<>
			<Animated.View style={[styles.ambientBlue, animatedFloat1Style]} />
			<Animated.View style={[styles.ambientEmerald, animatedFloat2Style]} />
		</>
	);
}

const styles = StyleSheet.create({
	ambientBlue: {
		position: 'absolute',
		top: -width * 0.2,
		left: -width * 0.2,
		width: width * 0.8,
		height: width * 0.8,
		backgroundColor: 'rgba(37, 99, 235, 0.15)', // blue-600/10
		borderRadius: width * 0.4,
	},
	ambientEmerald: {
		position: 'absolute',
		bottom: -width * 0.2,
		right: -width * 0.2,
		width: width * 0.8,
		height: width * 0.8,
		backgroundColor: 'rgba(16, 185, 129, 0.15)', // emerald-500/10
		borderRadius: width * 0.4,
	},
});
