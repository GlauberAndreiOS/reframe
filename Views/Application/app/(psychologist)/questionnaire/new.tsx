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
import {Picker} from '@react-native-picker/picker';

interface Question {
    title: string;
    type: 'text' | 'select' | 'radio' | 'checkbox';
    data: string[];
}

interface Patient {
    id: string;
    user: {
        name: string;
    };
}

export default function NewQuestionnaireScreen() {
	const router = useRouter();
	const {token} = useAuth();
	const [title, setTitle] = useState('');
	const [questions, setQuestions] = useState<Question[]>([]);
	const [isShared, setIsShared] = useState(false);
	const [targetPatientId, setTargetPatientId] = useState<string | null>(null);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');
	const errorColor = '#EF4444';


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

	const handleAddQuestion = () => {
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

		setQuestions([...questions, {
			title: newQuestionTitle,
			type: newQuestionType,
			data: options
		}]);


		setNewQuestionTitle('');
		setNewQuestionType('text');
		setNewQuestionOptions('');
		setModalVisible(false);
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
				targetPatientId: targetPatientId === 'all' ? null : targetPatientId
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

			<ScrollView style={styles.content}>
				<ThemedText style={styles.label}>Título do Questionário</ThemedText>
				<GlassInput
					placeholder="Ex: Avaliação Inicial"
					value={title}
					onChangeText={setTitle}
				/>

				<ThemedText style={styles.label}>Atribuir a Paciente (Opcional)</ThemedText>
				<View style={[styles.pickerContainer, {borderColor: surfaceColor}]}>
					<Picker
						selectedValue={targetPatientId}
						onValueChange={(itemValue) => setTargetPatientId(itemValue)}
						style={{color: textColor}}
						dropdownIconColor={textColor}
					>
						<Picker.Item label="Todos os pacientes (Público)" value="all" />
						{patients.map((p) => (
							<Picker.Item key={p.id} label={p.user?.name || 'Paciente sem nome'} value={p.id} />
						))}
					</Picker>
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
					<TouchableOpacity onPress={() => setModalVisible(true)}>
						<ThemedText style={{color: primaryColor, fontWeight: 'bold'}}>+ Adicionar</ThemedText>
					</TouchableOpacity>
				</View>

				{questions.map((q, index) => (
					<Card key={index} style={styles.questionCard}>
						<View style={styles.questionHeader}>
							<ThemedText type="defaultSemiBold" style={{flex: 1}}>{index + 1}. {q.title}</ThemedText>
							<TouchableOpacity onPress={() => removeQuestion(index)}>
								<IconSymbol name="trash" size={20} color={errorColor}/>
							</TouchableOpacity>
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
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<ThemedView style={styles.modalContent}>
						<ThemedText type="subtitle" style={styles.modalTitle}>Nova Pergunta</ThemedText>

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
								onPress={() => setModalVisible(false)}
							>
								<ThemedText>Cancelar</ThemedText>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalButton, {backgroundColor: primaryColor}]}
								onPress={handleAddQuestion}
							>
								<ThemedText style={{color: '#fff', fontWeight: 'bold'}}>Adicionar</ThemedText>
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
});
