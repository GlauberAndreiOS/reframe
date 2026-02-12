import React, {useEffect, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {ThemedText} from '@/components/themed-text';

interface SectionTooltipProps {
	message: string;
	mutedColor: string;
	borderColor: string;
	isDark: boolean;
}

const AUTO_HIDE_MS = 3500;

export function SectionTooltip({message, mutedColor, borderColor, isDark}: SectionTooltipProps) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!visible) return;
		const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
		return () => clearTimeout(timer);
	}, [visible]);

	return (
		<View style={styles.wrapper}>
			<TouchableOpacity onPress={() => setVisible((prev) => !prev)} style={styles.iconButton}>
				<IconSymbol name="questionmark.circle" size={14} color={mutedColor}/>
			</TouchableOpacity>
			{visible && (
				<View style={[styles.tooltip, {
					borderColor,
					backgroundColor: isDark ? 'rgba(30,30,30,0.98)' : '#FFFFFF',
				}]}
				>
					<ThemedText style={styles.tooltipText}>{message}</ThemedText>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		position: 'relative',
	},
	iconButton: {
		padding: 2,
	},
	tooltip: {
		position: 'absolute',
		top: 20,
		left: 0,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 10,
		paddingVertical: 8,
		minWidth: 170,
		maxWidth: 230,
		zIndex: 20,
	},
	tooltipText: {
		fontSize: 12,
		lineHeight: 16,
	},
});
