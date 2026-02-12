import React from 'react';
import {StyleSheet, View} from 'react-native';
import {ThemedText} from '../themed-text';

interface LabeledFieldProps {
	label: string;
	labelColor?: string;
	children: React.ReactNode;
}

export function LabeledField({label, labelColor, children}: LabeledFieldProps) {
	return (
		<View style={styles.container}>
			<ThemedText style={[styles.label, labelColor ? {color: labelColor} : null]}>{label}</ThemedText>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 6,
	},
	label: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
		marginLeft: 2,
	},
});
