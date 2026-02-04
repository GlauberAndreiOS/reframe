import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {FadeInUp, FadeOutUp, Layout} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onHide?: () => void;
}

export function Toast({message, type}: ToastProps) {
	const insets = useSafeAreaInsets();

	const getBackgroundColor = () => {
		switch (type) {
		case 'success':
			return 'rgba(16, 185, 129, 0.9)';
		case 'error':
			return 'rgba(239, 68, 68, 0.9)';
		case 'info':
			return 'rgba(59, 130, 246, 0.9)';
		default:
			return 'rgba(24, 24, 27, 0.9)';
		}
	};

	const getIconName = () => {
		switch (type) {
		case 'success':
			return 'checkmark-circle';
		case 'error':
			return 'alert-circle';
		case 'info':
			return 'information-circle';
		default:
			return 'information-circle';
		}
	};

	return (
		<Animated.View
			entering={FadeInUp.springify().damping(15)}
			exiting={FadeOutUp}
			layout={Layout.springify()}
			style={[
				styles.container,
				{
					top: insets.top + 10,
					backgroundColor: getBackgroundColor(),
				}
			]}
		>
			<View style={styles.content}>
				<Ionicons name={getIconName()} size={20} color="#FFFFFF"/>
				<Text style={styles.text}>{message}</Text>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 20,
		right: 20,
		zIndex: 9999,
		borderRadius: 16,
		padding: 16,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 8,

		backdropFilter: 'blur(10px)',
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	text: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
		flex: 1,
	},
});
