import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { Colors } from '@/constants/theme';
import { useBootstrap } from '@/hooks/use-bootstrap';

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
	const { ready, data } = useBootstrap();
	
	useEffect(() => {
		if (Platform.OS === 'android') {
			const backgroundColor = Colors[colorScheme ?? 'light'].background;
			NavigationBar.setBackgroundColorAsync(backgroundColor);
			NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
		}
	}, [colorScheme]);

	if (!ready || !data) {
		return null;
	}

	return (
		<AuthProvider initialAuth={data.auth}>
			<ToastProvider>
				<ConfirmProvider>
					<ThemeProvider value={theme}>
						<Stack screenOptions={{ headerShown: false }} initialRouteName='index'>
							<Stack.Screen name="index" />
							<Stack.Screen name="(auth)" />
						</Stack>
					</ThemeProvider>
				</ConfirmProvider>
			</ToastProvider>
		</AuthProvider>
	);
}
