import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {ThemedText} from '../themed-text';
import {BIOLOGICAL_SEX_OPTIONS} from '@/utils';

interface BiologicalSexRadioProps {
	value: string;
	onChange: (value: string) => void;
	tintColor: string;
	borderColor: string;
	mutedColor: string;
	isDark: boolean;
}

export function BiologicalSexRadio({
	value,
	onChange,
	tintColor,
	borderColor,
	mutedColor,
	isDark,
}: BiologicalSexRadioProps) {
	return (
		<View style={styles.group}>
			{BIOLOGICAL_SEX_OPTIONS.map((option) => {
				const selected = value === option.value;
				return (
					<TouchableOpacity
						key={option.value}
						style={[
							styles.option,
							{
								borderColor: selected ? tintColor : borderColor,
								backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
							},
						]}
						onPress={() => onChange(option.value)}
					>
						<View style={[styles.circle, {borderColor: selected ? tintColor : mutedColor}]}>
							{selected ? <View style={[styles.dot, {backgroundColor: tintColor}]}/> : null}
						</View>
						<ThemedText style={styles.label}>{option.label}</ThemedText>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	group: {
		gap: 8,
	},
	option: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderWidth: 1,
		borderRadius: 14,
		paddingVertical: 12,
		paddingHorizontal: 14,
	},
	circle: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	dot: {
		width: 9,
		height: 9,
		borderRadius: 4.5,
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
	},
});
