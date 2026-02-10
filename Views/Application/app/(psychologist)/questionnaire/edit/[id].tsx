import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

interface Questionnaire {
  id: string;
  title: string;
  questions: Question[];
  isShared: boolean;
}

// Constants
const MESSAGES = {
	LOAD_ERROR: 'Erro ao carregar o questionário.',
	QUESTION_TITLE_REQUIRED: 'O título da pergunta é obrigatório.',
	OPTIONS_REQUIRED: 'Adicione opções separadas por vírgula para este tipo de pergunta.',
	QUESTIONNAIRE_TITLE_REQUIRED: 'O título do questionário é obrigatório.',
	AT_LEAST_ONE_QUESTION: 'Adicione pelo menos uma pergunta.',
	UPDATE_SUCCESS: 'Questionário atualizado com sucesso!',
	UPDATE_ERROR: 'Não foi possível atualizar o questionário.',
};

const API_ENDPOINTS = {
	GET_QUESTIONNAIRE: (id: string) => `/Questionnaire/${id}`,
	UPDATE_QUESTIONNAIRE: (id: string) => `/Questionnaire/${id}`,
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
	OPTIONS_MULTILINE_HEIGHT: 80,
	BOTTOM_SPACING: 40,
};

// Component
export default function EditQuestionnaireScreen() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const { token } = useAuth();
	const showToast = useToast();
	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');

	// Form state
	const [title, setTitle] = useState('');
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isShared, setIsShared] = useState(false);

	// Question editor modal state
	const [modalVisible, setModalVisible] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [newQuestionTitle, setNewQuestionTitle] = useState('');
	const [newQuestionType, setNewQuestionType] = useState<'text' | 'select' | 'radio' | 'checkbox'>('text');
	const [newQuestionOptions, setNewQuestionOptions] = useState<string>('');

	// Effects
	useEffect(() => {
		if (id) {
			fetchQuestionnaire();
		}
	}, [id, token]);

	// Fetch questionnaire from API
	const fetchQuestionnaire = () => {
		const endpoint = API_ENDPOINTS.GET_QUESTIONNAIRE(id as string);
		api.get(endpoint, {
			headers: { Authorization: `Bearer ${token}` }
		})
			.then(response => {
				const data = response.data;
				setTitle(data.title);
				setQuestions(data.questions);
				setIsShared(data.isShared || false);
			})
			.catch(error => {
				console.error('Error fetching questionnaire:', error);
				showToast(MESSAGES.LOAD_ERROR, 'error');
			});
	};

	// Question handlers
	const handleAddOrUpdateQuestion = () => {
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

		if (editingIndex !== null) {
			const updatedQuestions = [...questions];
			updatedQuestions[editingIndex] = questionData;
			setQuestions(updatedQuestions);
		} else {
			setQuestions([...questions, questionData]);
		}

		closeModal();
	};

	const removeQuestion = (index: number) => {
		const newQuestions = [...questions];
		newQuestions.splice(index, 1);
		setQuestions(newQuestions);
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
		if (!title.trim()) {
			showToast(MESSAGES.QUESTIONNAIRE_TITLE_REQUIRED, 'error');
			return;
		}
		if (questions.length === 0) {
			showToast(MESSAGES.AT_LEAST_ONE_QUESTION, 'error');
			return;
		}

		const endpoint = API_ENDPOINTS.UPDATE_QUESTIONNAIRE(id as string);
		api.put(endpoint, {
			title,
			questions,
			isShared,
		}, {
			headers: { Authorization: `Bearer ${token}` }
		})
			.then(() => {
				showToast(MESSAGES.UPDATE_SUCCESS, 'success');
				setTimeout(() => {
					router.back();
				}, 1000);
			})
			.catch(error => {
				console.error('Error updating questionnaire:', error);
				showToast(MESSAGES.UPDATE_ERROR, 'error');
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
			{q?.data?.length > 0 && (
				<ThemedText style={styles.questionOptions}>
					Opções: {q.data.join(', ')}
				</ThemedText>
			)}
		</Card>
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
						>
							<ThemedText>Cancelar</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.modalButton, { backgroundColor: primaryColor }]}
							onPress={handleAddOrUpdateQuestion}
						>
							<ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>
								{editingIndex !== null ? 'Salvar' : 'Adicionar'}
							</ThemedText>
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
				<ThemedText type="subtitle">Editar Questionário</ThemedText>
				<TouchableOpacity onPress={handleSave}>
					<ThemedText style={{ color: primaryColor, fontWeight: 'bold' }}>Salvar</ThemedText>
				</TouchableOpacity>
			</View>

			<ScrollView style={styles.content}>
				<ThemedText style={styles.label}>Título do Questionário</ThemedText>
				<GlassInput
					placeholder="Ex: Avaliação Inicial"
					value={title}
					onChangeText={setTitle}
				/>

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
		paddingHorizontal: 20,
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
		textAlign: 'center',
		marginBottom: 20,
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
});

