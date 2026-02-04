import React, {useEffect, useState} from 'react';
import {Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useAuth} from '@/context/AuthContext';
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {ThemedText} from '@/components/themed-text';
import {GlassInput} from '@/components/ui/glass-input';
import {Card} from '@/components/ui/card';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useThemeColor} from '@/hooks/use-theme-color';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Toast, ToastType} from '@/components/ui/toast';

interface Question {
    title: string;
    type: 'text' | 'select' | 'radio' | 'checkbox';
    data: string[];
}

interface Patient {
    id: string;
    name: string;
}

export default function NewQuestionnaireScreen() {
	const router = useRouter();
	const {token} = useAuth();
	const [title, setTitle] = useState('');
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isShared, setIsShared] = useState(false);
	const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');
	const errorColor = '#EF4444';
	const warningColor = '#F59E0B';
	
	const [modalVisible, setModalVisible] = useState(false);
	const [newQuestionTitle, setNewQuestionTitle] = useState('');
	const [newQuestionType, setNewQuestionType] = useState<'text' | 'select' | 'radio' | 'checkbox'>('text');
	const [newQuestionOptions, setNewQuestionOptions] = useState<string>('');

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	useEffect(() => {
		const fetchPatients = async () => {
			try {
				const response = await api.get('/Psychologist/Patients', {
					headers: {Authorization: `Bearer ${token}`}
				});
				setPatients(response.data);
			} catch (error) {
				console.error('Error fetching patients:', error);
			}
		};
		void fetchPatients();
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

	const handleAddOrUpdateQuestion = () => {
		if (!newQuestionTitle.trim()) {
			setToast({message: 'O título da pergunta é obrigatório.', type: 'error'});
			return;
		}

		const options = newQuestionType !== 'text'
			? newQuestionOptions.split(',').map(o => o.trim()).filter(o => o.length > 0)
			: [];

		if (newQuestionType !== 'text' && options.length === 0) {
			setToast({message: 'Adicione opções separadas por vírgula para este tipo de pergunta.', type: 'error'});
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

	const openEditModal = (index: number) => {
		const q = questions[index];
		setNewQuestionTitle(q.title);
		setNewQuestionType(q.type as any);
		setNewQuestionOptions(q.data ? q.data.join(', ') : '');
		setEditingIndex(index);
		setModalVisible(true);
	};

	const openAddModal = () => {
		setNewQuestionTitle('');
		setNewQuestionType('text');
		setNewQuestionOptions('');
		setEditingIndex(null);
		setModalVisible(true);
	};

	const closeModal = () => {
		setModalVisible(false);
		setEditingIndex(null);
		setNewQuestionTitle('');
		setNewQuestionType('text');
		setNewQuestionOptions('');
	};

	const handleSave = async () => {
		if (!title.trim()) {
			setToast({message: 'O título do questionário é obrigatório.', type: 'error'});
			return;
		}
		if (questions.length === 0) {
			setToast({message: 'Adicione pelo menos uma pergunta.', type: 'error'});
			return;
		}

		try {
			await api.post('/Questionnaire', {
				title,
				questions,
				isShared,
				targetPatientIds: selectedPatients.length > 0 ? selectedPatients : null
			}, {
				headers: {Authorization: `Bearer ${token}`}
			});
			setToast({message: 'Questionário criado com sucesso!', type: 'success'});
			setTimeout(() => {
				router.back();
			}, 1000);
		} catch (error) {
			console.error('Error creating questionnaire:', error);
			setToast({message: 'Não foi possível criar o questionário.', type: 'error'});
		}
	};

	const removeQuestion = (index: number) => {
		const newQuestions = [...questions];
		newQuestions.splice(index, 1);
		setQuestions(newQuestions);
	};

	const addPatient = (patientId: string) => {
		if (!selectedPatients.includes(patientId)) {
			setSelectedPatients([...selectedPatients, patientId]);
			setSearchQuery('');
		}
	};

	const removePatient = (patientId: string) => {
		setSelectedPatients(selectedPatients.filter(id => id !== patientId));
	};

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type} />}
			<AmbientBackground/>
			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>
				<ThemedText type="subtitle">Novo Questionário</ThemedText>
				<TouchableOpacity onPress={handleSave}>
					<ThemedText style={{color: primaryColor, fontWeight: 'bold'}}>Salvar</ThemedText>
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
					{selectedPatients.map(patientId => {
						const patient = patients.find(p => p.id === patientId);
						return (
							<View key={patientId} style={[styles.selectedPatientChip, {backgroundColor: surfaceColor}]}>
								<ThemedText style={styles.selectedPatientText}>{patient?.name || 'Paciente'}</ThemedText>
								<TouchableOpacity onPress={() => removePatient(patientId)}>
									<IconSymbol name="close" size={16} color={textColor} />
								</TouchableOpacity>
							</View>
						);
					})}
				</View>

				<View style={styles.autocompleteContainer}>
					<GlassInput
						placeholder="Buscar paciente..."
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery.trim() !== '' && filteredPatients.length > 0 && (
						<View style={[styles.suggestionsList, {backgroundColor: surfaceColor, borderColor: surfaceColor}]}>
							{filteredPatients.map(patient => (
								<TouchableOpacity
									key={patient.id}
									style={styles.suggestionItem}
									onPress={() => addPatient(patient.id)}
								>
									<ThemedText>{patient?.name || ''}</ThemedText>
								</TouchableOpacity>
							))}
						</View>
					)}
				</View>

				<View style={styles.switchContainer}>
					<ThemedText style={styles.switchLabel}>Compartilhar modelo?</ThemedText>
					<Switch
						value={isShared}
						onValueChange={setIsShared}
						trackColor={{false: '#767577', true: primaryColor}}
						thumbColor={isShared ? '#fff' : '#f4f3f4'}
					/>
				</View>
				<ThemedText style={styles.switchDescription}>
					Ao ativar, este questionário ficará disponível como modelo para outros psicólogos.
				</ThemedText>

				<View style={styles.questionsHeader}>
					<ThemedText style={styles.label}>Perguntas</ThemedText>
					<TouchableOpacity onPress={openAddModal}>
						<ThemedText style={{color: primaryColor, fontWeight: 'bold'}}>+ Adicionar</ThemedText>
					</TouchableOpacity>
				</View>

				{questions.map((q, index) => (
					<Card key={index} style={styles.questionCard}>
						<View style={styles.questionHeader}>
							<ThemedText type="defaultSemiBold" style={{flex: 1}}>{index + 1}. {q.title}</ThemedText>
							
							<View style={styles.actionButtons}>
								<TouchableOpacity 
									style={[styles.iconButton, {backgroundColor: warningColor + '20'}]} 
									onPress={() => openEditModal(index)}
								>
									<IconSymbol name="edit" size={18} color={warningColor}/>
								</TouchableOpacity>
								
								<TouchableOpacity 
									style={[styles.iconButton, {backgroundColor: errorColor + '20'}]} 
									onPress={() => removeQuestion(index)}
								>
									<IconSymbol name="trash" size={18} color={errorColor}/>
								</TouchableOpacity>
							</View>
						</View>
						<ThemedText
							style={{color: primaryColor, fontSize: 12, textTransform: 'uppercase', marginBottom: 4}}>
							Tipo: {q.type}
						</ThemedText>
						{q.data.length > 0 && (
							<ThemedText style={styles.questionOptions}>Opções: {q.data.join(', ')}</ThemedText>
						)}
					</Card>
				))}

				<View style={{height: 40}}/>
			</ScrollView>

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
							{(['text', 'select', 'radio', 'checkbox'] as const).map((type) => (
								<TouchableOpacity
									key={type}
									style={[
										styles.typeButton,
										{borderColor: surfaceColor},
										newQuestionType === type && {
											backgroundColor: primaryColor,
											borderColor: primaryColor
										}
									]}
									onPress={() => setNewQuestionType(type)}
								>
									<ThemedText style={[
										styles.typeButtonText,
										newQuestionType === type && {color: '#fff'}
									]}>
										{type === 'text' ? 'Texto' :
											type === 'select' ? 'Seleção' :
												type === 'radio' ? 'Única' : 'Múltipla'}
									</ThemedText>
								</TouchableOpacity>
							))}
						</View>

						{newQuestionType !== 'text' && (
							<>
								<ThemedText style={styles.label}>Opções (separadas por vírgula)</ThemedText>
								<GlassInput
									placeholder="Opção 1, Opção 2, Opção 3"
									value={newQuestionOptions}
									onChangeText={setNewQuestionOptions}
									multiline
									style={{height: 80, textAlignVertical: 'top'}}
								/>
							</>
						)}

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.modalButton, {borderColor: surfaceColor, borderWidth: 1}]}
								onPress={closeModal}
							>
								<ThemedText>Cancelar</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalButton, {backgroundColor: primaryColor}]}
								onPress={handleAddOrUpdateQuestion}
							>
								<ThemedText style={{color: '#fff', fontWeight: 'bold'}}>
									{editingIndex !== null ? 'Salvar' : 'Adicionar'}
								</ThemedText>
							</TouchableOpacity>
						</View>
					</ThemedView>
				</View>
			</Modal>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		paddingTop: 50,
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
	pickerContainer: {
		borderWidth: 1,
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 8,
	},
	patientListContainer: {
		marginTop: 8,
		marginBottom: 8,
	},
	checkboxContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	checkbox: {
		marginRight: 10,
	},
	checkboxLabel: {
		fontSize: 16,
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
		marginBottom: 12,
	},
	questionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	iconButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
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
		padding: 20,
	},
	modalContent: {
		borderRadius: 16,
		padding: 20,
	},
	modalTitle: {
		marginBottom: 20,
		textAlign: 'center',
	},
	typeSelector: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
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
		gap: 12,
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
		gap: 8,
		marginBottom: 12,
	},
	selectedPatientChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 20,
		gap: 8,
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
		marginTop: 4,
		maxHeight: 200,
		overflow: 'hidden',
		zIndex: 20,
	},
	suggestionItem: {
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.05)',
	},
});
