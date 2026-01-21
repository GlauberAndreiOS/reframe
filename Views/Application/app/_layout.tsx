import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<AuthProvider>
			<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
				<Stack screenOptions={{ headerShown: false }} initialRouteName='(auth)'>
					<Stack.Screen name="(auth)" />
				</Stack>
			</ThemeProvider>
		</AuthProvider>
	);
}
