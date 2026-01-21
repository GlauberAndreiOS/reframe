import React, { useState } from 'react';
import {
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function NewThoughtScreen() {
	const router = useRouter();

	const colorScheme = useColorScheme() ?? 'light';
	const colors = Colors[colorScheme];

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
			Alert.alert(
				'Erro',
				'Preencha pelo menos Situação, Pensamento e Emoção.'
			);
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

			Alert.alert('Sucesso', 'Pensamento registrado!', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch (error) {
			console.error('Failed to save thought:', error);
			Alert.alert('Erro', 'Falha ao salvar o pensamento.');
		} finally {
			setLoading(false);
		}
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background,
		},
		scrollContent: {
			padding: 20,
			paddingBottom: 40,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: 'bold',
			marginTop: 15,
			marginBottom: 5,
			color: colors.text,
		},
		input: {
			borderWidth: 1,
			borderColor: colors.border,
			borderRadius: 8,
			padding: 12,
			fontSize: 16,
			backgroundColor: colors.card,
			minHeight: 50,
			color: colors.text,
			textAlignVertical: 'top',
		},
		button: {
			backgroundColor: colors.tint,
			padding: 15,
			borderRadius: 8,
			alignItems: 'center',
			marginTop: 30,
		},
		buttonDisabled: {
			backgroundColor: colors.muted,
		},
		buttonText: {
			color: colors.background,
			fontSize: 18,
			fontWeight: 'bold',
		},
		loader: {
			marginVertical: 2,
		},
	});

	return (
		<SafeAreaView
			style={styles.container}
		>
			<Stack.Screen
				options={{
					title: 'Novo Registro',
					headerBackTitle: 'Voltar',
				}}
			/>

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<Text style={styles.sectionTitle}>O que aconteceu?</Text>
					<TextInput
						style={styles.input}
						placeholder="Situação (Onde? Quando? Com quem?)"
						placeholderTextColor={colors.muted}
						value={situation}
						onChangeText={setSituation}
						multiline
					/>

					<Text style={styles.sectionTitle}>
						O que passou pela sua cabeça?
					</Text>
					<TextInput
						style={styles.input}
						placeholder="Pensamento Automático"
						placeholderTextColor={colors.muted}
						value={thought}
						onChangeText={setThought}
						multiline
					/>

					<Text style={styles.sectionTitle}>O que você sentiu?</Text>
					<TextInput
						style={styles.input}
						placeholder="Emoção (Tristeza, Raiva, Ansiedade...)"
						placeholderTextColor={colors.muted}
						value={emotion}
						onChangeText={setEmotion}
					/>

					<Text style={styles.sectionTitle}>O que você fez?</Text>
					<TextInput
						style={styles.input}
						placeholder="Comportamento / Reação"
						placeholderTextColor={colors.muted}
						value={behavior}
						onChangeText={setBehavior}
						multiline
					/>

					<Text style={styles.sectionTitle}>Evidências</Text>
					<TextInput
						style={styles.input}
						placeholder="Evidências a favor do pensamento"
						placeholderTextColor={colors.muted}
						value={evidencePro}
						onChangeText={setEvidencePro}
						multiline
					/>
					<TextInput
						style={styles.input}
						placeholder="Evidências contra o pensamento"
						placeholderTextColor={colors.muted}
						value={evidenceContra}
						onChangeText={setEvidenceContra}
						multiline
					/>

					<Text style={styles.sectionTitle}>Reestruturação</Text>
					<TextInput
						style={styles.input}
						placeholder="Pensamentos Alternativos"
						placeholderTextColor={colors.muted}
						value={alternativeThoughts}
						onChangeText={setAlternativeThoughts}
						multiline
					/>
					<TextInput
						style={styles.input}
						placeholder="Reavaliação da Emoção"
						placeholderTextColor={colors.muted}
						value={reevaluation}
						onChangeText={setReevaluation}
						multiline
					/>

					<TouchableOpacity
						style={[
							styles.button,
							loading && styles.buttonDisabled,
						]}
						onPress={handleSave}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator
								color={colors.background}
								style={styles.loader}
							/>
						) : (
							<Text style={styles.buttonText}>
								Salvar Registro
							</Text>
						)}
					</TouchableOpacity>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}