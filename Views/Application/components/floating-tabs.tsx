import React from 'react';
import {
	View,
	TouchableOpacity,
	StyleSheet,
	Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Props {
	state: any;
	descriptors: any;
	navigation: any;
}

export default function FloatingTabs({ state, descriptors, navigation }: Props) {
	const insets = useSafeAreaInsets();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const backgroundColor = isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';
	const activeColor = useThemeColor({}, 'tint');
	const inactiveColor = useThemeColor({}, 'muted');

	return (
		<View
			style={[
				styles.container,
				{
					bottom: Platform.OS === 'ios' ? insets.bottom : insets.bottom + 20,
					backgroundColor,
					borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
				},
			]}
		>
			{state.routes.map((route: any, index: number) => {
				const { options } = descriptors[route.key];
				const focused = state.index === index;

				const onPress = () => {
					const event = navigation.emit({
						type: 'tabPress',
						target: route.key,
						canPreventDefault: true,
					});

					if (!focused && !event.defaultPrevented) {
						navigation.navigate(route.name);
					}
				};

				return (
					<TouchableOpacity
						key={route.key}
						onPress={onPress}
						style={styles.button}
						activeOpacity={0.7}
					>
						{options.tabBarIcon && options.tabBarIcon({
							focused,
							color: focused ? activeColor : inactiveColor,
							size: 24
						})}
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		height: 64,
		borderRadius: 32,
		paddingHorizontal: 20,
		minWidth: 200,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.1,
		shadowRadius: 12,
		elevation: 8,
		backdropFilter: 'blur(20px)',
	},
	button: {
		padding: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
