import React from 'react';
import {StyleSheet, View, type ViewProps} from 'react-native';
import {useThemeColor} from '@/hooks/use-theme-color';

export type CardProps = ViewProps & {
    children: React.ReactNode;
};

export function Card({children, style, ...props}: CardProps) {
	const backgroundColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');

	return (
		<View style={[styles.card, {backgroundColor, borderColor}, style]} {...props}>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		marginBottom: 12,
	},
});
