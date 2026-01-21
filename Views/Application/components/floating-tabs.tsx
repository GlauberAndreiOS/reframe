import React from 'react';
import {
	View,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface Props {
	state: any;
	navigation: any;
	colorScheme: 'light' | 'dark';
}

export default function FloatingTabs({
	                                     state,
	                                     navigation,
	                                     colorScheme,
}: Props) {
	const insets = useSafeAreaInsets();

	return (
		<View
			style={[
				styles.container,
				{
					bottom: insets.bottom + 10,
					backgroundColor: Colors[colorScheme].background,
					shadowColor: '#000',
				},
			]}
		>
			{state.routes.map((route: any, index: number) => {
				const focused = state.index === index;
				const onPress = () => {
					navigation.navigate(route.name);
				};

				let iconName: string = '';
				if (route.name === 'index') iconName = 'person.2.fill';
				if (route.name === 'profile') iconName = 'person.fill';

				return (
					<TouchableOpacity
						key={route.key}
						onPress={onPress}
						style={styles.button}
					>
						<IconSymbol
							name={iconName}
							size={28}
							color={
								focused
									? Colors[colorScheme].tint
									: Colors[colorScheme].muted
							}
						/>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: '50%',
		transform: [{ translateX: -120 }],
		width: 240,
		height: 64,
		borderRadius: 32,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 36,
		alignItems: 'center',
		shadowOffset: {
			width: 0,
			height: 10,
		},
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 5,
	},
	button: {
		flex: 1,
		alignItems: 'center',
	},
});
