import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform } from 'react-native';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
	const backgroundColor = useThemeColor({}, 'background');
	const tintColor = useThemeColor({}, 'tint');
	const { isLoading, token, userType } = useAuth();

	useEffect(() => {
		if (Platform.OS === 'android') {
			NavigationBar.setBackgroundColorAsync(backgroundColor);
			NavigationBar.setButtonStyleAsync(
				backgroundColor === '#151718' ? 'light' : 'dark'
			);
		}
	}, [backgroundColor]);

	if (isLoading) {
		return (
			<ThemedView
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<ActivityIndicator size="large" color={tintColor} />
			</ThemedView>
		);
	}

	if (token) {
		const href = userType === 0 ? "/(psychologist)" : "/(patient)";
		return <Redirect href={href} />;
	}

	return <Redirect href="/(auth)/login" />;
}
