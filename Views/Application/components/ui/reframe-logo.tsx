import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useThemeColor} from '@/hooks/use-theme-color';

export function ReframeLogo() {
	const textColor = useThemeColor({}, 'text');
	const mutedColor = useThemeColor({}, 'muted');

	return (
		<View style={styles.container}>
			<View style={styles.logoContainer}>
				<Text style={[styles.logoText, {color: textColor}]}>REFRAME</Text>
			</View>

			<Text style={[styles.slogan, {color: mutedColor}]}>
				Reestruturação de pensamentos, transformação de perspectivas
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		width: '100%',
	},
	logoContainer: {
		marginBottom: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	logoText: {
		fontSize: 42,
		fontWeight: '900',
		letterSpacing: 8,
		textAlign: 'center',
	},
	slogan: {
		fontSize: 10,
		textAlign: 'center',
		opacity: 0.6,
		letterSpacing: 3,
		textTransform: 'uppercase',
		maxWidth: 300,
		lineHeight: 16,
	},
});
