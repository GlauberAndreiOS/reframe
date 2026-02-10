import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View, TextInput } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { maskTime } from '@/utils/time-mask';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Props {
    visible: boolean;
    onConfirm: (
        startTime: string,
        endTime: string,
        mode: 'duration' | 'count',
        value: number,
        breakMinutes: number
    ) => void;
    onCancel: () => void;
}

export function GenerateSlotsModal({
	visible,
	onConfirm,
	onCancel
}: Props) {
	const backgroundColor = useThemeColor({}, 'background');
	const tintColor = useThemeColor({}, 'tint');

	const [startTime, setStartTime] = useState("09:00");
	const [endTime, setEndTime] = useState("17:00");
	const [mode, setMode] = useState<'duration' | 'count'>('duration');
	const [value, setValue] = useState("50"); // Default 50 mins
	const [breakMinutes, setBreakMinutes] = useState("0");

	const handleConfirm = () => {
		const numValue = parseInt(value, 10);
		const numBreakMinutes = parseInt(breakMinutes, 10);

		if (isNaN(numValue) || numValue <= 0 || isNaN(numBreakMinutes) || numBreakMinutes < 0) {
			// Basic validation
			return;
		}
		onConfirm(startTime, endTime, mode, numValue, numBreakMinutes);
	};

	// Helper to format time input (basic)
	const handleTimeChange = (text: string, setter: (t: string) => void) => {
		setter(maskTime(text));
	};

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent={true}
			onRequestClose={onCancel}
		>
			<TouchableWithoutFeedback onPress={onCancel}>
				<View style={styles.overlay}>
					<TouchableWithoutFeedback>
						<View style={[styles.modalContent, { backgroundColor }]}>
							<View style={styles.header}>
								<ThemedText type="subtitle" style={styles.title}>Gerar Horários</ThemedText>
								<TouchableOpacity onPress={onCancel} style={styles.closeButton}>
									<IconSymbol name="xmark.circle.fill" size={24} color="#6b7280"/>
								</TouchableOpacity>
							</View>

							{/* Time Inputs */}
							<View style={styles.row}>
								<View style={styles.inputGroup}>
									<ThemedText style={styles.label}>Inicio</ThemedText>
									<TextInput
										style={styles.input}
										value={startTime}
										onChangeText={t => handleTimeChange(t, setStartTime)}
										placeholder="09:00"
										keyboardType="numbers-and-punctuation"
									/>
								</View>
								<View style={styles.inputGroup}>
									<ThemedText style={styles.label}>Fim</ThemedText>
									<TextInput
										style={styles.input}
										value={endTime}
										onChangeText={t => handleTimeChange(t, setEndTime)}
										placeholder="17:00"
										keyboardType="numbers-and-punctuation"
									/>
								</View>
							</View>

							{/* Mode Selection */}
							<View style={styles.modeContainer}>
								<TouchableOpacity
									style={[styles.radioOption, mode === 'duration' && styles.radioSelected]}
									onPress={() => { setMode('duration'); setValue("50"); }}
								>
									<View style={[styles.radioCircle, mode === 'duration' && { borderColor: tintColor }]}>
										{mode === 'duration' && <View style={[styles.radioDot, { backgroundColor: tintColor }]} />}
									</View>
									<ThemedText>Tempo (min)</ThemedText>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.radioOption, mode === 'count' && styles.radioSelected]}
									onPress={() => { setMode('count'); setValue("5"); }}
								>
									<View style={[styles.radioCircle, mode === 'count' && { borderColor: tintColor }]}>
										{mode === 'count' && <View style={[styles.radioDot, { backgroundColor: tintColor }]} />}
									</View>
									<ThemedText>Quantidade</ThemedText>
								</TouchableOpacity>
							</View>

							{/* Value Input */}
							<View style={styles.inputContainer}>
								<ThemedText style={styles.label}>
									{mode === 'duration' ? 'Duração da sessão (min)' : 'Número de sessões'}
								</ThemedText>
								<TextInput
									style={styles.input}
									value={value}
									onChangeText={setValue}
									keyboardType="numeric"
								/>
							</View>

							<View style={styles.inputContainer}>
								<ThemedText style={styles.label}>Intervalo entre sessões (min)</ThemedText>
								<TextInput
									style={styles.input}
									value={breakMinutes}
									onChangeText={setBreakMinutes}
									keyboardType="numeric"
									placeholder="0"
								/>
							</View>

							<View style={styles.actions}>
								<TouchableOpacity
									style={[
										styles.button,
										styles.confirmButton,
										{ backgroundColor: tintColor }
									]}
									onPress={handleConfirm}
								>
									<ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Gerar</ThemedText>
								</TouchableOpacity>
							</View>
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	modalContent: {
		width: '100%',
		maxWidth: 340,
		borderRadius: 24,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 5,
	},
	title: {
		marginBottom: 20,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	closeButton: {
		padding: 2,
	},
	row: {
		flexDirection: 'row',
		gap: 16,
		marginBottom: 16
	},
	inputGroup: {
		flex: 1
	},
	label: {
		fontSize: 12,
		marginBottom: 4,
		opacity: 0.7
	},
	input: {
		backgroundColor: '#f5f5f5', // TODO: use theme color
		padding: 12,
		borderRadius: 8,
		fontSize: 16
	},
	modeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 16
	},
	radioOption: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 8
	},
	radioSelected: {
		// backgroundColor: 'rgba(0,0,0,0.05)',
		// borderRadius: 8
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#ccc',
		justifyContent: 'center',
		alignItems: 'center'
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	inputContainer: {
		marginBottom: 24
	},
	actions: {
		flexDirection: 'row',
		gap: 12,
	},
	button: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmButton: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 2,
	},
});
