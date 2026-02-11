import React from 'react';
import {Animated, Platform, Pressable, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useColorScheme} from '@/hooks/use-color-scheme';

interface Props {
	state: any;
	descriptors: any;
	navigation: any;
}

function FloatingTabButton({
	focused,
	onPress,
	icon,
}: {
	focused: boolean;
	onPress: () => void;
	icon: React.ReactNode;
}) {
	const scaleAnim = React.useRef(new Animated.Value(focused ? 1.05 : 1)).current;

	React.useEffect(() => {
		Animated.spring(scaleAnim, {
			toValue: focused ? 1.05 : 1,
			useNativeDriver: true,
			friction: 8,
			tension: 120,
		}).start();
	}, [focused, scaleAnim]);

	return (
		<Pressable
			onPress={onPress}
			style={styles.button}
			android_ripple={{color: 'rgba(255,255,255,0.08)', borderless: true}}
		>
			<Animated.View style={{transform: [{scale: scaleAnim}]}}>{icon}</Animated.View>
		</Pressable>
	);
}

export default function FloatingTabs({state, descriptors, navigation}: Props) {
	const insets = useSafeAreaInsets();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';
	const [containerWidth, setContainerWidth] = React.useState(0);
	const activeIndexAnim = React.useRef(new Animated.Value(state.index)).current;

	const backgroundColor = isDark ? 'rgba(20, 20, 24, 0.9)' : 'rgba(255, 255, 255, 0.92)';
	const activeColor = useThemeColor({}, 'tint');
	const inactiveColor = useThemeColor({}, 'muted');
	const activeItemBackground = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
	const activeItemBorder = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.08)';
	const tabBorderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
	const tabShadowColor = isDark ? '#000000' : '#0F172A';

	const horizontalPadding = 14;
	const tabGap = 8;
	const tabCount = Math.max(state.routes.length, 1);
	const availableWidth = Math.max(containerWidth - horizontalPadding * 2 - tabGap * (tabCount - 1), 0);
	const tabWidth = availableWidth / tabCount;

	React.useEffect(() => {
		Animated.spring(activeIndexAnim, {
			toValue: state.index,
			useNativeDriver: true,
			friction: 9,
			tension: 130,
		}).start();
	}, [state.index, activeIndexAnim]);

	const activePillTranslateX = activeIndexAnim.interpolate({
		inputRange: [0, Math.max(tabCount - 1, 1)],
		outputRange: [0, (tabWidth + tabGap) * Math.max(tabCount - 1, 1)],
	});

	return (
		<View
			style={[
				styles.container,
				{
					bottom: Platform.OS === 'ios' ? insets.bottom + 6 : insets.bottom + 14,
					backgroundColor,
					borderColor: tabBorderColor,
					shadowColor: tabShadowColor,
				},
			]}
			onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
		>
			{containerWidth > 0 && (
				<Animated.View
					pointerEvents="none"
					style={[
						styles.activePill,
						{
							width: tabWidth,
							backgroundColor: activeItemBackground,
							borderColor: activeItemBorder,
							transform: [{translateX: activePillTranslateX}],
							left: horizontalPadding,
						},
					]}
				/>
			)}

			{state.routes.map((route: any, index: number) => {
				const {options} = descriptors[route.key];
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
					<FloatingTabButton
						key={route.key}
						focused={focused}
						onPress={onPress}
						icon={
							<View style={styles.iconWrapper}>
								{options.tabBarIcon && options.tabBarIcon({
									focused,
									color: focused ? activeColor : inactiveColor,
									size: 24,
								})}
							</View>
						}
					/>
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
		justifyContent: 'center',
		gap: 8,
		height: 70,
		borderRadius: 28,
		paddingHorizontal: 14,
		minWidth: 230,
		borderWidth: 1,
		shadowOffset: {
			width: 0,
			height: 10,
		},
		shadowOpacity: 0.2,
		shadowRadius: 22,
		elevation: 18,
		overflow: 'hidden',
	},
	button: {
		flex: 1,
		height: 50,
		paddingHorizontal: 12,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 16,
		position: 'relative',
		zIndex: 2,
		overflow: 'visible',
	},
	iconWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	activePill: {
		position: 'absolute',
		top: 10,
		bottom: 10,
		borderRadius: 16,
		borderWidth: 1,
	},
});
