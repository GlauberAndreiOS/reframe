import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useToast } from '@/context';
import api from '@/services/api';
import {
	ThemedView,
	ThemedText,
	GlassInput,
	Card,
	IconSymbol,
	AmbientBackground,
	Toast,
} from '@/components';
import { useThemeColor } from '@/hooks';

// Types
interface Question {
  title: string;
  type: 'text' | 'select' | 'radio' | 'checkbox';
  data: string[];
}

interface Patient {
  id: string;
  name: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

// Constants
const MESSAGES = {
	QUESTION_TITLE_REQUIRED: 'O título da pergunta é obrigatório.',
	OPTIONS_REQUIRED: 'Adicione opções separadas por vírgula para este tipo de pergunta.',
	QUESTIONNAIRE_TITLE_REQUIRED: 'O título do questionário é obrigatório.',
	AT_LEAST_ONE_QUESTION: 'Adicione pelo menos uma pergunta.',
	CREATE_SUCCESS: 'Questionário criado com sucesso!',
	CREATE_ERROR: 'Não foi possível criar o questionário.',
};

const API_ENDPOINTS = {
	GET_PATIENTS: '/Psychologist/Patients',
	CREATE_QUESTIONNAIRE: '/Questionnaire',
};

const QUESTION_TYPES = [
	{ value: 'text' as const, label: 'Texto' },
	{ value: 'select' as const, label: 'Seleção' },
	{ value: 'radio' as const, label: 'Única' },
	{ value: 'checkbox' as const, label: 'Múltipla' },
];

const COLORS = {
	ERROR: '#EF4444',
	WARNING: '#F59E0B',
};

const DIMENSIONS = {
	HEADER_PADDING_TOP: 50,
	MODAL_PADDING: 20,
	CARD_MARGIN: 12,
	GAP: 8,
	BUTTON_SIZE: 32,
	BUTTON_RADIUS: 16,
	TOAST_TIMEOUT: 3000,
	OPTIONS_MULTILINE_HEIGHT: 80,
	SUGGESTIONS_MAX_HEIGHT: 200,
	BOTTOM_SPACING: 40,
};

// Component
export default function NewQuestionnaireScreen() {
	const router = useRouter();
	const { token } = useAuth();
	const {showToast} = useToast();
	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');

	// Form state
	const [title, setTitle] = useState('');
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isShared, setIsShared] = useState(false);
	const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

	// Patient search state
	const [patients, setPatients] = useState<Patient[]>([]);
	const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
	const [searchQuery, setSearchQuery] = useState('');

	// Question editor modal state
	const [modalVisible, setModalVisible] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [newQuestionTitle, setNewQuestionTitle] = useState('');
	const [newQuestionType, setNewQuestionType] = useState<'text' | 'select' | 'radio' | 'checkbox'>('text');
	const [newQuestionOptions, setNewQuestionOptions] = useState<string>('');
	const [isSaving, setIsSaving] = useState(false);
	const [isSavingQuestion, setIsSavingQuestion] = useState(false);

	// Effects
	useEffect(() => {
		fetchPatients();
	}, [token]);

	useEffect(() => {
		if (searchQuery.trim() === '') {
			setFilteredPatients([]);
		} else {
			const lowerCaseQuery = searchQuery.toLowerCase();
			setFilteredPatients(
				patients.filter(p =>
					p.name?.toLowerCase().includes(lowerCaseQuery) &&
          !selectedPatients.includes(p.id)
				)
			);
		}
	}, [searchQuery, patients, selectedPatients]);

	// Fetch patients from API
	const fetchPatients = () => {
		if (!token) return;

		api.get(API_ENDPOINTS.GET_PATIENTS)
			.then(response => setPatients(response.data))
			.catch(error => {
				console.error('Error fetching patients:', error);
				showToast(MESSAGES.CREATE_ERROR, 'error');
			});
	};

	// Question handlers
	const handleAddOrUpdateQuestion = () => {
		if (isSavingQuestion) return;

		if (!newQuestionTitle.trim()) {
			showToast(MESSAGES.QUESTION_TITLE_REQUIRED, 'error');
			return;
		}

		const options = newQuestionType !== 'text'
			? newQuestionOptions.split(',').map(o => o.trim()).filter(o => o.length > 0)
			: [];

		if (newQuestionType !== 'text' && options.length === 0) {
			showToast(MESSAGES.OPTIONS_REQUIRED, 'error');
			return;
		}

		const questionData: Question = {
			title: newQuestionTitle,
			type: newQuestionType,
			data: options
		};

		setIsSavingQuestion(true);
		try {
			if (editingIndex !== null) {
				const updatedQuestions = [...questions];
				updatedQuestions[editingIndex] = questionData;
				setQuestions(updatedQuestions);
			} else {
				setQuestions([...questions, questionData]);
			}

			closeModal();
		} finally {
			setIsSavingQuestion(false);
		}
	};

	const removeQuestion = (index: number) => {
		const newQuestions = [...questions];
		newQuestions.splice(index, 1);
		setQuestions(newQuestions);
	};

	// Patient handlers
	const addPatient = (patientId: string) => {
		if (!selectedPatients.includes(patientId)) {
			setSelectedPatients([...selectedPatients, patientId]);
			setSearchQuery('');
		}
	};

	const removePatient = (patientId: string) => {
		setSelectedPatients(selectedPatients.filter(id => id !== patientId));
	};

	// Modal handlers
	const openAddModal = () => {
		setNewQuestionTitle('');
		setNewQuestionType('text');
		setNewQuestionOptions('');
		setEditingIndex(null);
		setModalVisible(true);
	};

	const openEditModal = (index: number) => {
		const q = questions[index];
		setNewQuestionTitle(q.title);
		setNewQuestionType(q.type);
		setNewQuestionOptions(q.data ? q.data.join(', ') : '');
		setEditingIndex(index);
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
		setEditingIndex(null);
		setNewQuestionTitle('');
		setNewQuestionType('text');
		setNewQuestionOptions('');
	};

	// Form submission
	const handleSave = () => {
		if (isSaving) return;

		if (!title.trim()) {
			showToast(MESSAGES.QUESTIONNAIRE_TITLE_REQUIRED, 'error');
			return;
		}
		if (questions.length === 0) {
			showToast(MESSAGES.AT_LEAST_ONE_QUESTION, 'error');
			return;
		}

		setIsSaving(true);
		api.post(API_ENDPOINTS.CREATE_QUESTIONNAIRE, {
			title,
			questions,
			isShared,
			targetPatientIds: selectedPatients.length > 0 ? selectedPatients : null
		})
			.then(() => {
				showToast(MESSAGES.CREATE_SUCCESS, 'success');
				setTimeout(() => {
					router.back();
				}, 1000);
			})
			.catch(error => {
				console.error('Error creating questionnaire:', error);
				showToast(MESSAGES.CREATE_ERROR, 'error');
			})
			.finally(() => {
				setIsSaving(false);
			});
	};

	// Render functions
	const renderQuestionTypeButton = (type: typeof QUESTION_TYPES[number]) => (
		<TouchableOpacity
			key={type.value}
			style={[
				styles.typeButton,
				{ borderColor: surfaceColor },
				newQuestionType === type.value && {
					backgroundColor: primaryColor,
					borderColor: primaryColor
				}
			]}
			onPress={() => setNewQuestionType(type.value)}
		>
			<ThemedText style={[
				styles.typeButtonText,
				newQuestionType === type.value && { color: '#fff' }
			]}>
				{type.label}
			</ThemedText>
		</TouchableOpacity>
	);

	const renderQuestionCard = (q: Question, index: number) => (
		<Card key={index} style={styles.questionCard}>
			<View style={styles.questionHeader}>
				<ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
					{index + 1}. {q.title}
				</ThemedText>

				<View style={styles.actionButtons}>
					<TouchableOpacity
						style={[styles.iconButton, { backgroundColor: COLORS.WARNING + '20' }]}
						onPress={() => openEditModal(index)}
					>
						<IconSymbol name="edit" size={18} color={COLORS.WARNING} />
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.iconButton, { backgroundColor: COLORS.ERROR + '20' }]}
						onPress={() => removeQuestion(index)}
					>
						<IconSymbol name="trash" size={18} color={COLORS.ERROR} />
					</TouchableOpacity>
				</View>
			</View>
			<ThemedText
				style={{
					color: primaryColor,
					fontSize: 12,
					textTransform: 'uppercase',
					marginBottom: 4
				}}
			>
				Tipo: {q.type}
			</ThemedText>
			{q.data.length > 0 && (
				<ThemedText style={styles.questionOptions}>
					Opções: {q.data.join(', ')}
				</ThemedText>
			)}
		</Card>
	);

	const renderPatientChip = (patientId: string) => {
		const patient = patients.find(p => p.id === patientId);
		return (
			<View key={patientId} style={[styles.selectedPatientChip, { backgroundColor: surfaceColor }]}>
				<ThemedText style={styles.selectedPatientText}>{patient?.name || 'Paciente'}</ThemedText>
				<TouchableOpacity onPress={() => removePatient(patientId)}>
					<IconSymbol name="close" size={16} color={textColor} />
				</TouchableOpacity>
			</View>
		);
	};

	const renderSuggestion = (patient: Patient) => (
		<TouchableOpacity
			key={patient.id}
			style={styles.suggestionItem}
			onPress={() => addPatient(patient.id)}
		>
			<ThemedText>{patient?.name || ''}</ThemedText>
		</TouchableOpacity>
	);

	const renderQuestionEditorModal = () => (
		<Modal
			visible={modalVisible}
			animationType="slide"
			transparent={true}
			onRequestClose={closeModal}
		>
			<View style={styles.modalContainer}>
				<ThemedView style={styles.modalContent}>
					<ThemedText type="subtitle" style={styles.modalTitle}>
						{editingIndex !== null ? 'Editar Pergunta' : 'Nova Pergunta'}
					</ThemedText>

					<ThemedText style={styles.label}>Pergunta</ThemedText>
					<GlassInput
						placeholder="Digite a pergunta"
						value={newQuestionTitle}
						onChangeText={setNewQuestionTitle}
					/>

					<ThemedText style={styles.label}>Tipo de Resposta</ThemedText>
					<View style={styles.typeSelector}>
						{QUESTION_TYPES.map(renderQuestionTypeButton)}
					</View>

					{newQuestionType !== 'text' && (
						<>
							<ThemedText style={styles.label}>Opções (separadas por vírgula)</ThemedText>
							<GlassInput
								placeholder="Opção 1, Opção 2, Opção 3"
								value={newQuestionOptions}
								onChangeText={setNewQuestionOptions}
								multiline
								style={{ height: DIMENSIONS.OPTIONS_MULTILINE_HEIGHT, textAlignVertical: 'top' }}
							/>
						</>
					)}

					<View style={styles.modalButtons}>
						<TouchableOpacity
							style={[styles.modalButton, { borderColor: surfaceColor, borderWidth: 1 }]}
							onPress={closeModal}
							disabled={isSavingQuestion}
						>
							<ThemedText>Cancelar</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.modalButton, { backgroundColor: primaryColor }]}
							onPress={handleAddOrUpdateQuestion}
							disabled={isSavingQuestion}
						>
							{isSavingQuestion ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>
									{editingIndex !== null ? 'Salvar' : 'Adicionar'}
								</ThemedText>
							)}
						</TouchableOpacity>
					</View>
				</ThemedView>
			</View>
		</Modal>
	);

	// Main render
	return (
		<ThemedView style={styles.container}>
			<AmbientBackground />
			<View style={[styles.header, { borderBottomColor: surfaceColor }]}>
				<TouchableOpacity onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor} />
				</TouchableOpacity>
				<ThemedText type="subtitle">Novo Questionário</ThemedText>
				<TouchableOpacity onPress={handleSave} disabled={isSaving}>
					{isSaving ? (
						<ActivityIndicator size="small" color={primaryColor} />
					) : (
						<ThemedText style={{ color: primaryColor, fontWeight: 'bold' }}>Salvar</ThemedText>
					)}
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
				<ThemedText style={styles.label}>Título do Questionário</ThemedText>
				<GlassInput
					placeholder="Ex: Avaliação Inicial"
					value={title}
					onChangeText={setTitle}
				/>

				<ThemedText style={styles.label}>Deseja aplicar o questionário a alguém?</ThemedText>

				<View style={styles.selectedPatientsContainer}>
					{selectedPatients.map(renderPatientChip)}
				</View>

				<View style={styles.autocompleteContainer}>
					<GlassInput
						placeholder="Buscar paciente..."
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery.trim() !== '' && filteredPatients.length > 0 && (
						<View style={[styles.suggestionsList, { backgroundColor: surfaceColor, borderColor: surfaceColor }]}>
							{filteredPatients.map(renderSuggestion)}
						</View>
					)}
				</View>

				<View style={styles.switchContainer}>
					<ThemedText style={styles.switchLabel}>Compartilhar modelo?</ThemedText>
					<Switch
						value={isShared}
						onValueChange={setIsShared}
						trackColor={{ false: '#767577', true: primaryColor }}
						thumbColor={isShared ? '#fff' : '#f4f3f4'}
					/>
				</View>
				<ThemedText style={styles.switchDescription}>
					Ao ativar, este questionário ficará disponível como modelo para outros psicólogos.
				</ThemedText>

				<View style={styles.questionsHeader}>
					<ThemedText style={styles.label}>Perguntas</ThemedText>
					<TouchableOpacity onPress={openAddModal}>
						<ThemedText style={{ color: primaryColor, fontWeight: 'bold' }}>+ Adicionar</ThemedText>
					</TouchableOpacity>
				</View>

				{questions.map(renderQuestionCard)}

				<View style={{ height: DIMENSIONS.BOTTOM_SPACING }} />
			</ScrollView>

			{renderQuestionEditorModal()}
		</ThemedView>
	);
}

// Styles
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		paddingTop: DIMENSIONS.HEADER_PADDING_TOP,
		borderBottomWidth: 1,
	},
	content: {
		padding: 20,
	},
	label: {
		fontSize: 14,
		opacity: 0.7,
		marginBottom: 8,
		marginTop: 16,
	},
	switchContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 20,
	},
	switchLabel: {
		fontSize: 16,
		fontWeight: '600',
	},
	switchDescription: {
		fontSize: 12,
		opacity: 0.6,
		marginTop: 4,
		marginBottom: 8,
	},
	questionsHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 24,
		marginBottom: 8,
	},
	questionCard: {
		marginBottom: DIMENSIONS.CARD_MARGIN,
	},
	questionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: DIMENSIONS.GAP,
	},
	iconButton: {
		width: DIMENSIONS.BUTTON_SIZE,
		height: DIMENSIONS.BUTTON_SIZE,
		borderRadius: DIMENSIONS.BUTTON_RADIUS,
		justifyContent: 'center',
		alignItems: 'center',
	},
	questionOptions: {
		fontSize: 12,
		opacity: 0.6,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.5)',
		padding: DIMENSIONS.MODAL_PADDING,
	},
	modalContent: {
		borderRadius: 16,
		padding: DIMENSIONS.MODAL_PADDING,
	},
	modalTitle: {
		marginBottom: 20,
		textAlign: 'center',
	},
	typeSelector: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: DIMENSIONS.GAP,
		marginBottom: 16,
	},
	typeButton: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 20,
		borderWidth: 1,
	},
	typeButtonText: {
		fontSize: 12,
		opacity: 0.8,
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 24,
		gap: DIMENSIONS.GAP,
	},
	modalButton: {
		flex: 1,
		padding: 14,
		borderRadius: 12,
		alignItems: 'center',
	},
	selectedPatientsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: DIMENSIONS.GAP,
		marginBottom: 12,
	},
	selectedPatientChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 20,
		gap: DIMENSIONS.GAP,
	},
	selectedPatientText: {
		fontSize: 14,
	},
	autocompleteContainer: {
		position: 'relative',
		zIndex: 10,
	},
	suggestionsList: {
		position: 'absolute',
		top: '100%',
		left: 0,
		right: 0,
		borderWidth: 1,
		borderRadius: 12,
		marginTop: DIMENSIONS.GAP,
		maxHeight: DIMENSIONS.SUGGESTIONS_MAX_HEIGHT,
		overflow: 'hidden',
		zIndex: 20,
	},
	suggestionItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.05)',
	},
});

