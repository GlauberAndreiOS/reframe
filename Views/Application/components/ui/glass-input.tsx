import React, {ReactNode} from 'react';
import {StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useColorScheme} from '@/hooks/use-color-scheme';

export type HelperTextType = 'error' | 'success' | 'info';

interface GlassInputProps extends TextInputProps {
    helperText?: {
        text: string;
        type: HelperTextType;
    } | null;
    rightAdornment?: ReactNode;
}

export function GlassInput({helperText, rightAdornment, style, ...props}: GlassInputProps) {
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const textColor = useThemeColor({}, 'text');
	const borderColor = useThemeColor({}, 'border');
	const placeholderColor = useThemeColor({}, 'muted');

	const getStatusColor = () => {
		if (!helperText) return borderColor;
		switch (helperText.type) {
		case 'error':
			return '#EF4444';
		case 'success':
			return '#10B981';
		case 'info':
			return '#3B82F6';
		default:
			return borderColor;
		}
	};

	return (
		<View style={styles.container}>
			<View style={[
				styles.inputContainer,
				{
					backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
					borderColor: getStatusColor(),
				},

				style
			]}>
				<TextInput
					style={[
						styles.input,
						{color: textColor},

						rightAdornment && {paddingRight: 48}
					]}
					placeholderTextColor={placeholderColor}
					{...props}
				/>
				{rightAdornment && (
					<View style={styles.adornmentContainer}>
						{rightAdornment}
					</View>
				)}
			</View>

			{helperText && (
				<Text style={[styles.helperText, {color: getStatusColor()}]}>
					{helperText.text}
				</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	inputContainer: {
		width: '100%',
		borderRadius: 16,
		borderWidth: 1,
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
	},
	input: {
		flex: 1,
		paddingHorizontal: 24,
		paddingVertical: 18,
		fontSize: 16,
		fontWeight: '300',
		height: '100%',
	},
	adornmentContainer: {
		position: 'absolute',
		right: 16,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	helperText: {
		fontSize: 12,
		marginTop: 6,
		marginLeft: 12,
		fontWeight: '500',
	}
});
