import { Colors } from '@/constants/theme';

export function createFloatingTabsOptions(
	colorScheme: 'light' | 'dark'
) {
	return {
		tabBarActiveTintColor: Colors[colorScheme].tint,
		tabBarItemActiveIndicatorEnabled: true,
		headerShown: false,
		tabBarShowLabel: false,

		tabBarStyle: {
			width: 150,
			bottom: 20,
			elevation: 5,
			borderRadius: 100,
			position: 'absolute',
			alignSelf: 'center'
		},
	};
}
