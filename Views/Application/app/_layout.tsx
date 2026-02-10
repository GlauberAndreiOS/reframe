import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack} from 'expo-router';
import 'react-native-reanimated';

import {
	useColorScheme,
	useBootstrap,
} from '@/hooks';
import {
	AuthProvider,
	ToastProvider,
	ConfirmProvider,
} from '@/context';

// ============= CONSTANTS =============
const ROUTE_NAMES = {
	SPLASH: 'index',
	AUTH: '(auth)',
} as const;

const STACK_OPTIONS = {
	headerShown: false,
} as const;

const ROOT_ROUTES = [
	ROUTE_NAMES.SPLASH,
	ROUTE_NAMES.AUTH,
] as const;

// ============= ROOT LAYOUT COMPONENT =============
export default function RootLayout() {
	const colorScheme = useColorScheme();
	const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

	const {ready, data} = useBootstrap();

	// ============= LOADING STATE =============
	if (!ready) {
		return null;
	}

	// ============= RENDER PROVIDERS =============
	const renderProviders = (children: React.ReactNode) => (
		<AuthProvider initialAuth={data.auth}>
			<ToastProvider>
				<ConfirmProvider>
					<ThemeProvider value={theme}>
						{children}
					</ThemeProvider>
				</ConfirmProvider>
			</ToastProvider>
		</AuthProvider>
	);

	return renderProviders(
		<Stack screenOptions={STACK_OPTIONS} initialRouteName={ROUTE_NAMES.SPLASH}>
			{ROOT_ROUTES.map((routeName) => (
				<Stack.Screen key={routeName} name={routeName}/>
			))}
		</Stack>
	);
}
