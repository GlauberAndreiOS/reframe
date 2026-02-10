import React, {useEffect} from 'react';
import {StyleSheet} from 'react-native';
import {useRouter} from 'expo-router';
import Animated, {useAnimatedStyle, useSharedValue, withTiming,} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

import {ThemedView} from '../themed-view';
import {AmbientBackground} from './ambient-background';
import {ReframeLogo} from './reframe-logo';
import {useAuth} from '@/context';

export default function AnimatedSplashScreen() {
	const router = useRouter();
	const {token, userType} = useAuth();

	const opacity = useSharedValue(0);
	const scale = useSharedValue(0.95);

	useEffect(() => {
		const animateAndNavigate = async () => {
			await SplashScreen.hideAsync();

			opacity.value = withTiming(1, {duration: 1000});
			scale.value = withTiming(1, {duration: 1000});

			const timeout = setTimeout(() => {
				if (token) {
					const href = userType === 0 ? "/(psychologist)" : "/(patient)";

					router.replace(href);
				} else {
					router.replace("/(auth)/login");
				}
			}, 2500);

			return () => clearTimeout(timeout);
		};

		void animateAndNavigate();
	}, [token, userType, opacity, scale, router]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{scale: scale.value}],
	}));

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>

			<Animated.View style={[styles.content, animatedStyle]}>
				<ReframeLogo/>
			</Animated.View>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		alignItems: 'center',
		justifyContent: 'center',
	},
});
