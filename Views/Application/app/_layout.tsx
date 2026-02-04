import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack} from 'expo-router';
import 'react-native-reanimated';

import {useColorScheme} from '@/hooks/use-color-scheme';
import {AuthProvider} from '@/context/AuthContext';
import {ToastProvider} from '@/context/ToastContext';
import {ConfirmProvider} from '@/context/ConfirmContext';
import {useBootstrap} from '@/hooks/use-bootstrap';

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

	const {ready, data} = useBootstrap();

	if (!ready) {
		return null;
	}

	return (
		<AuthProvider initialAuth={data.auth}>
			<ToastProvider>
				<ConfirmProvider>
					<ThemeProvider value={theme}>
						<Stack screenOptions={{headerShown: false}} initialRouteName='index'>
							<Stack.Screen name="index"/>
							<Stack.Screen name="(auth)"/>
						</Stack>
					</ThemeProvider>
				</ConfirmProvider>
			</ToastProvider>
		</AuthProvider>
	);
}
