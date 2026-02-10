import React, {useCallback, useState} from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import {Stack, useRouter} from 'expo-router';
import {
	useThemeColor,
	useColorScheme,
} from '@/hooks';
import {
	ThemedView,
	ThemedText,
	GlassInput,
	AnimatedEntry,
	VoiceInputAdornment,
} from '@/components';
import {useToast} from '@/context';
import {Colors} from '@/constants';
import {thoughtsRepository} from '@/database/repositories/thoughts.repository';

// ============= TYPES & INTERFACES =============
interface ThoughtFormData {
	situation: string;
	thought: string;
	emotion: string;
	behavior: string;
	evidencePro: string;
	evidenceContra: string;
	alternativeThoughts: string;
	reevaluation: string;
}

// ============= CONSTANTS =============
const VALIDATION_MESSAGES = {
	FILL_REQUIRED: 'Preencha pelo menos Situação, Pensamento e Emoção.',
	SAVE_SUCCESS: 'Pensamento salvo com sucesso!',
	SAVE_ERROR: 'Falha ao salvar o pensamento.',
} as const;

const SECTION_LABELS = {
	SITUATION: 'O QUE ACONTECEU?',
	THOUGHT: 'O QUE PASSOU PELA SUA CABEÇA?',
	EMOTION: 'O QUE VOCÊ SENTIU?',
	BEHAVIOR: 'O QUE VOCÊ FEZ?',
	EVIDENCE: 'EVIDÊNCIAS',
	RESTRUCTURING: 'REESTRUTURAÇÃO',
} as const;

const FIELD_PLACEHOLDERS = {
	SITUATION: 'Situação (Onde? Quando? Com quem?)',
	THOUGHT: 'Pensamento Automático',
	EMOTION: 'Emoção (Tristeza, Raiva, Ansiedade...)',
	BEHAVIOR: 'Comportamento / Reação',
	EVIDENCE_PRO: 'Evidências a favor do pensamento',
	EVIDENCE_CONTRA: 'Evidências contra o pensamento',
	ALTERNATIVE: 'Pensamentos Alternativos',
	REEVALUATION: 'Reavaliação da Emoção',
} as const;

const STACK_SCREEN_OPTIONS = {
	title: 'Novo Registro',
	headerBackTitle: 'Voltar',
	headerShadowVisible: false,
} as const;

const REDIRECT_DELAY_MS = 500;

// ============= UTILITY FUNCTIONS =============
const validateThoughtForm = (data: ThoughtFormData): boolean => {
	return !!(data.situation && data.thought && data.emotion);
};

// ============= MAIN COMPONENT =============
export default function NewThoughtScreen() {
	const router = useRouter();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const mutedColor = useThemeColor({}, 'muted');
	const backgroundColor = Colors[colorScheme].background;

	// ============= FORM STATE =============
	const [formData, setFormData] = useState<ThoughtFormData>({
		situation: '',
		thought: '',
		emotion: '',
		behavior: '',
		evidencePro: '',
		evidenceContra: '',
		alternativeThoughts: '',
		reevaluation: '',
	});
	const [isLoading, setIsLoading] = useState(false);

	// ============= FORM DATA HANDLERS =============
	const updateFormData = (updates: Partial<ThoughtFormData>) => {
		setFormData(prev => ({...prev, ...updates}));
	};

	// ============= SAVE LOGIC =============
	const handleSave = useCallback(() => {
		if (!validateThoughtForm(formData)) {
			showToast(VALIDATION_MESSAGES.FILL_REQUIRED, 'error');
			return;
		}

		setIsLoading(true);

		thoughtsRepository
			.create(formData)
			.then(() => {
				showToast(VALIDATION_MESSAGES.SAVE_SUCCESS, 'success');
				setTimeout(() => router.back(), REDIRECT_DELAY_MS);
			})
			.catch(error => {
				console.error('Failed to save thought locally:', error);
				showToast(VALIDATION_MESSAGES.SAVE_ERROR, 'error');
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [formData, showToast, router]);

	// ============= RENDER COMPONENTS =============
	const renderSituationSection = () => (
		<View style={styles.section}>
			<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>
				{SECTION_LABELS.SITUATION}
			</ThemedText>
			<GlassInput
				placeholder={FIELD_PLACEHOLDERS.SITUATION}
				value={formData.situation}
				onChangeText={(text: string) => updateFormData({situation: text})}
				multiline
				style={styles.textArea}
				rightAdornment={
					<VoiceInputAdornment
						id="situation"
						value={formData.situation}
						onResult={(text: string) => updateFormData({situation: text})}
					/>
				}
			/>
		</View>
	);

	const renderThoughtSection = () => (
		<View style={styles.section}>
			<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>
				{SECTION_LABELS.THOUGHT}
			</ThemedText>
			<GlassInput
				placeholder={FIELD_PLACEHOLDERS.THOUGHT}
				value={formData.thought}
				onChangeText={(text: string) => updateFormData({thought: text})}
				multiline
				style={styles.textArea}
				rightAdornment={
					<VoiceInputAdornment
						id="thought"
						value={formData.thought}
						onResult={(text: string) => updateFormData({thought: text})}
					/>
				}
			/>
		</View>
	);

	const renderEmotionSection = () => (
		<View style={styles.section}>
			<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>
				{SECTION_LABELS.EMOTION}
			</ThemedText>
			<GlassInput
				placeholder={FIELD_PLACEHOLDERS.EMOTION}
				value={formData.emotion}
				onChangeText={(text: string) => updateFormData({emotion: text})}
				rightAdornment={
					<VoiceInputAdornment
						id="emotion"
						value={formData.emotion}
						onResult={(text: string) => updateFormData({emotion: text})}
					/>
				}
			/>
		</View>
	);

	const renderBehaviorSection = () => (
		<View style={styles.section}>
			<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>
				{SECTION_LABELS.BEHAVIOR}
			</ThemedText>
			<GlassInput
				placeholder={FIELD_PLACEHOLDERS.BEHAVIOR}
				value={formData.behavior}
				onChangeText={(text: string) => updateFormData({behavior: text})}
				multiline
				style={styles.textArea}
				rightAdornment={
					<VoiceInputAdornment
						id="behavior"
						value={formData.behavior}
						onResult={(text: string) => updateFormData({behavior: text})}
					/>
				}
			/>
		</View>
	);

	const renderEvidenceSection = () => (
		<View style={styles.section}>
			<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>
				{SECTION_LABELS.EVIDENCE}
			</ThemedText>
			<View style={{gap: 12}}>
				<GlassInput
					placeholder={FIELD_PLACEHOLDERS.EVIDENCE_PRO}
					value={formData.evidencePro}
					onChangeText={(text: string) => updateFormData({evidencePro: text})}
					multiline
					style={styles.textArea}
					rightAdornment={
						<VoiceInputAdornment
							id="evidencePro"
							value={formData.evidencePro}
							onResult={(text: string) => updateFormData({evidencePro: text})}
						/>
					}
				/>
				<GlassInput
					placeholder={FIELD_PLACEHOLDERS.EVIDENCE_CONTRA}
					value={formData.evidenceContra}
					onChangeText={(text: string) => updateFormData({evidenceContra: text})}
					multiline
					style={styles.textArea}
					rightAdornment={
						<VoiceInputAdornment
							id="evidenceContra"
							value={formData.evidenceContra}
							onResult={(text: string) => updateFormData({evidenceContra: text})}
						/>
					}
				/>
			</View>
		</View>
	);

	const renderRestructuringSection = () => (
		<View style={styles.section}>
			<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>
				{SECTION_LABELS.RESTRUCTURING}
			</ThemedText>
			<View style={{gap: 12}}>
				<GlassInput
					placeholder={FIELD_PLACEHOLDERS.ALTERNATIVE}
					value={formData.alternativeThoughts}
					onChangeText={(text: string) => updateFormData({alternativeThoughts: text})}
					multiline
					style={styles.textArea}
					rightAdornment={
						<VoiceInputAdornment
							id="alternativeThoughts"
							value={formData.alternativeThoughts}
							onResult={(text: string) => updateFormData({alternativeThoughts: text})}
						/>
					}
				/>
				<GlassInput
					placeholder={FIELD_PLACEHOLDERS.REEVALUATION}
					value={formData.reevaluation}
					onChangeText={(text: string) => updateFormData({reevaluation: text})}
					multiline
					style={styles.textArea}
					rightAdornment={
						<VoiceInputAdornment
							id="reevaluation"
							value={formData.reevaluation}
							onResult={(text: string) => updateFormData({reevaluation: text})}
						/>
					}
				/>
			</View>
		</View>
	);

	const renderSaveButton = () => (
		<TouchableOpacity
			style={[
				styles.button,
				{backgroundColor: tintColor},
				isLoading && styles.buttonDisabled,
			]}
			onPress={handleSave}
			disabled={isLoading}
		>
			{isLoading ? (
				<ActivityIndicator color="#FFF"/>
			) : (
				<ThemedText style={styles.buttonText}>SALVAR REGISTRO</ThemedText>
			)}
		</TouchableOpacity>
	);

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					...STACK_SCREEN_OPTIONS,
					headerStyle: {backgroundColor},
					headerTintColor: tintColor,
				}}
			/>

			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView
					style={styles.container}
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					<AnimatedEntry style={{flex: 1}}>
						<View>
							{renderSituationSection()}
							{renderThoughtSection()}
							{renderEmotionSection()}
							{renderBehaviorSection()}
							{renderEvidenceSection()}
							{renderRestructuringSection()}
						</View>

						{renderSaveButton()}
					</AnimatedEntry>
				</ScrollView>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

// ============= STYLES =============
const styles = StyleSheet.create({
	container: {flex: 1},
	scrollContent: {
		flexGrow: 1,
		justifyContent: 'space-between',
		paddingHorizontal: 24,
		paddingBottom: 50,
	},
	section: {marginBottom: 24},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '700',
		marginBottom: 8,
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	textArea: {minHeight: 80, textAlignVertical: 'top'},
	button: {
		padding: 16,
		borderRadius: 16,
		alignItems: 'center',
		marginTop: 20,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 4},
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 4,
	},
	buttonDisabled: {opacity: 0.7},
	buttonText: {
		color: '#FFF',
		fontSize: 14,
		fontWeight: '900',
		letterSpacing: 1,
	},
});
