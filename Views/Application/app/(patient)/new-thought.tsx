import React, { useState } from 'react';
import {
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	View
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import api from '@/services/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { GlassInput } from '@/components/ui/glass-input';
import { useToast } from '@/context/ToastContext';
import { AnimatedEntry } from '@/components/ui/animated-entry';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function NewThoughtScreen() {
	const router = useRouter();
	const headerHeight = useHeaderHeight();
	const { showToast } = useToast();
	const colorScheme = useColorScheme() ?? 'light';

	const tintColor = useThemeColor({}, 'tint');
	const mutedColor = useThemeColor({}, 'muted');
	const backgroundColor = Colors[colorScheme].background;

	const [loading, setLoading] = useState(false);

	const [situation, setSituation] = useState('');
	const [thought, setThought] = useState('');
	const [emotion, setEmotion] = useState('');
	const [behavior, setBehavior] = useState('');
	const [evidencePro, setEvidencePro] = useState('');
	const [evidenceContra, setEvidenceContra] = useState('');
	const [alternativeThoughts, setAlternativeThoughts] = useState('');
	const [reevaluation, setReevaluation] = useState('');

	const handleSave = async () => {
		if (!situation || !thought || !emotion) {
			showToast('Preencha pelo menos Situação, Pensamento e Emoção.', 'error');
			return;
		}

		setLoading(true);
		try {
			await api.post('/AutomaticThought', {
				situation,
				thought,
				emotion,
				behavior,
				evidencePro,
				evidenceContra,
				alternativeThoughts,
				reevaluation,
			});

			showToast('Pensamento registrado com sucesso!', 'success');
			setTimeout(() => router.back(), 1500);
		} catch (error) {
			console.error('Failed to save thought:', error);
			showToast('Falha ao salvar o pensamento.', 'error');
		} finally {
			setLoading(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Novo Registro',
					headerBackTitle: 'Voltar',
					headerStyle: { backgroundColor },
					headerShadowVisible: false,
					headerTintColor: tintColor,
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
				keyboardVerticalOffset={headerHeight}
			>
				<ScrollView 
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<AnimatedEntry>
						<View style={styles.section}>
							<ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>O QUE ACONTECEU?</ThemedText>
							<GlassInput
								placeholder="Situação (Onde? Quando? Com quem?)"
								value={situation}
								onChangeText={setSituation}
								multiline
								style={styles.textArea}
							/>
						</View>

						<View style={styles.section}>
							<ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>O QUE PASSOU PELA SUA CABEÇA?</ThemedText>
							<GlassInput
								placeholder="Pensamento Automático"
								value={thought}
								onChangeText={setThought}
								multiline
								style={styles.textArea}
							/>
						</View>

						<View style={styles.section}>
							<ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>O QUE VOCÊ SENTIU?</ThemedText>
							<GlassInput
								placeholder="Emoção (Tristeza, Raiva, Ansiedade...)"
								value={emotion}
								onChangeText={setEmotion}
							/>
						</View>

						<View style={styles.section}>
							<ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>O QUE VOCÊ FEZ?</ThemedText>
							<GlassInput
								placeholder="Comportamento / Reação"
								value={behavior}
								onChangeText={setBehavior}
								multiline
								style={styles.textArea}
							/>
						</View>

						<View style={styles.section}>
							<ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>EVIDÊNCIAS</ThemedText>
							<View style={{ gap: 12 }}>
								<GlassInput
									placeholder="Evidências a favor do pensamento"
									value={evidencePro}
									onChangeText={setEvidencePro}
									multiline
									style={styles.textArea}
								/>
								<GlassInput
									placeholder="Evidências contra o pensamento"
									value={evidenceContra}
									onChangeText={setEvidenceContra}
									multiline
									style={styles.textArea}
								/>
							</View>
						</View>

						<View style={styles.section}>
							<ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>REESTRUTURAÇÃO</ThemedText>
							<View style={{ gap: 12 }}>
								<GlassInput
									placeholder="Pensamentos Alternativos"
									value={alternativeThoughts}
									onChangeText={setAlternativeThoughts}
									multiline
									style={styles.textArea}
								/>
								<GlassInput
									placeholder="Reavaliação da Emoção"
									value={reevaluation}
									onChangeText={setReevaluation}
									multiline
									style={styles.textArea}
								/>
							</View>
						</View>

						<TouchableOpacity
							style={[
								styles.button,
								{ backgroundColor: tintColor },
								loading && styles.buttonDisabled,
							]}
							onPress={handleSave}
							disabled={loading}
						>
							{loading ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<ThemedText style={styles.buttonText}>
									SALVAR REGISTRO
								</ThemedText>
							)}
						</TouchableOpacity>
					</AnimatedEntry>
				</ScrollView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		paddingInline: 24,
		paddingBottom: 60,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '700',
		marginBottom: 8,
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	textArea: {
		minHeight: 80,
		textAlignVertical: 'top',
	},
	button: {
		padding: 16,
		borderRadius: 16,
		alignItems: 'center',
		marginTop: 10,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 4,
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		color: '#FFF',
		fontSize: 14,
		fontWeight: '900',
		letterSpacing: 1,
	},
});
