import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ThemedView, ThemedText, GlassInput, Card, IconSymbol, AmbientBackground, Toast} from '@/components';
import {useThemeColor} from '@/hooks';
import {useAuth} from '@/context';
import {api} from '@/services';

// ============= TYPES & INTERFACES =============
interface QuestionOption {
	title: string;
	type: 'text' | 'select' | 'radio' | 'checkbox';
	data: string[];
}

interface Questionnaire {
	id: string;
	title: string;
	questions: QuestionOption[];
}

interface ToastState {
	message: string;
	type: 'success' | 'error';
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_QUESTIONNAIRE: '/Questionnaire',
	SUBMIT_RESPONSES: '/Questionnaire/Response',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar o questionário.',
	SUBMIT_SUCCESS: 'Respostas enviadas com sucesso!',
	SUBMIT_ERROR: 'Não foi possível enviar as respostas.',
	NOT_FOUND: 'Questionário não encontrado.',
	PLACEHOLDER: 'Sua resposta...',
	SUBMIT_BUTTON: 'Enviar Respostas',
} as const;

const TOAST_DURATION_MS = 3000;
const REDIRECT_DELAY_MS = 1000;

// ============= COMPONENT =============
export default function AnswerQuestionnaireScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();

	// ============= THEME COLORS =============
	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');

	// ============= STATE =============
	const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
	const [loading, setLoading] = useState(true);
	const [answers, setAnswers] = useState<Record<string, any>>({});
	const [submitting, setSubmitting] = useState(false);
	const [toast, setToast] = useState<ToastState | null>(null);

	// ============= EFFECTS =============
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, TOAST_DURATION_MS);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	useEffect(() => {
		if (!id) return;

		api.get(`${API_ENDPOINTS.GET_QUESTIONNAIRE}/${id}`, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then((response) => {
				setQuestionnaire(response.data);
			})
			.catch((error) => {
				console.error('Error fetching questionnaire:', error);
				setToast({message: MESSAGES.LOAD_ERROR, type: 'error'});
			})
			.finally(() => {
				setLoading(false);
			});
	}, [id, token]);

	// ============= HANDLERS =============
	const handleAnswerChange = (questionTitle: string, value: any) => {
		setAnswers((prev) => ({...prev, [questionTitle]: value}));
	};

	const toggleCheckbox = (questionTitle: string, option: string) => {
		const current = answers[questionTitle] || [];
		const updated = current.includes(option)
			? current.filter((item: string) => item !== option)
			: [...current, option];
		handleAnswerChange(questionTitle, updated);
	};

	const handleSubmit = () => {
		if (!questionnaire) return;

		setSubmitting(true);

		const payload = {
			questionnaireId: questionnaire.id,
			answers: Object.entries(answers).map(([key, value]) => ({
				questionTitle: key,
				value: value,
			})),
		};

		api.post(API_ENDPOINTS.SUBMIT_RESPONSES, payload, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then(() => {
				setToast({message: MESSAGES.SUBMIT_SUCCESS, type: 'success'});
				setTimeout(() => {
					router.back();
				}, REDIRECT_DELAY_MS);
			})
			.catch((error) => {
				console.error('Error submitting answers:', error);
				setToast({message: MESSAGES.SUBMIT_ERROR, type: 'error'});
			})
			.finally(() => {
				setSubmitting(false);
			});
	};

	// ============= RENDER FUNCTIONS =============
	const renderQuestionField = (question: QuestionOption) => {
		const currentAnswer = answers[question.title];

		switch (question.type) {
		case 'text':
			return (
				<GlassInput
					placeholder={MESSAGES.PLACEHOLDER}
					value={currentAnswer || ''}
					onChangeText={(text) => handleAnswerChange(question.title, text)}
					multiline
					style={{minHeight: 80, textAlignVertical: 'top'}}
				/>
			);

		case 'select':
			return (
				<View style={styles.optionsContainer}>
					{question.data.map((option, idx) => (
						<TouchableOpacity
							key={idx}
							style={[
								styles.optionButton,
								{borderColor},
								currentAnswer === option && {
									borderColor: primaryColor,
									backgroundColor: primaryColor + '20',
								},
							]}
							onPress={() => handleAnswerChange(question.title, option)}
						>
							<ThemedText
								style={[
									styles.optionText,
									currentAnswer === option && {color: primaryColor, fontWeight: '600'},
								]}
							>
								{option}
							</ThemedText>
						</TouchableOpacity>
					))}
				</View>
			);

		case 'radio':
			return (
				<View style={styles.optionsContainer}>
					{question.data.map((option, idx) => (
						<TouchableOpacity
							key={idx}
							style={styles.radioRow}
							onPress={() => handleAnswerChange(question.title, option)}
						>
							<View
								style={[
									styles.radioCircle,
									{borderColor},
									currentAnswer === option && {
										borderColor: primaryColor,
										backgroundColor: primaryColor,
									},
								]}
							/>
							<ThemedText style={styles.radioText}>{option}</ThemedText>
						</TouchableOpacity>
					))}
				</View>
			);

		case 'checkbox':
			return (
				<View style={styles.optionsContainer}>
					{question.data.map((option, idx) => {
						const isSelected = (currentAnswer || []).includes(option);
						return (
							<TouchableOpacity
								key={idx}
								style={styles.checkboxRow}
								onPress={() => toggleCheckbox(question.title, option)}
							>
								<View
									style={[
										styles.checkboxBox,
										{borderColor},
										isSelected && {
											borderColor: primaryColor,
											backgroundColor: primaryColor,
										},
									]}
								>
									{isSelected && <IconSymbol name="checkmark" size={16} color="#fff"/>}
								</View>
								<ThemedText style={styles.checkboxText}>{option}</ThemedText>
							</TouchableOpacity>
						);
					})}
				</View>
			);

		default:
			return null;
		}
	};

	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={primaryColor}/>
			</ThemedView>
		);
	}

	if (!questionnaire) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ThemedText style={{color: '#EF4444'}}>{MESSAGES.NOT_FOUND}</ThemedText>
			</ThemedView>
		);
	}

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type}/>}
			<AmbientBackground/>
			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>
				<ThemedText type="subtitle" numberOfLines={1} style={{flex: 1, textAlign: 'center'}}>
					{questionnaire.title}
				</ThemedText>
				<View style={{width: 24}}/>
			</View>

			<ScrollView style={styles.content}>
				{questionnaire.questions.map((question, index) => (
					<Card key={index} style={styles.card}>
						<ThemedText type="defaultSemiBold" style={styles.questionTitle}>
							{index + 1}. {question.title}
						</ThemedText>
						{renderQuestionField(question)}
					</Card>
				))}

				<TouchableOpacity
					style={[
						styles.submitButton,
						{backgroundColor: primaryColor},
						submitting && styles.submitButtonDisabled,
					]}
					onPress={handleSubmit}
					disabled={submitting}
				>
					{submitting ? (
						<ActivityIndicator color="#fff"/>
					) : (
						<ThemedText style={styles.submitButtonText}>{MESSAGES.SUBMIT_BUTTON}</ThemedText>
					)}
				</TouchableOpacity>
				<View style={{height: 80}}/>
			</ScrollView>
		</ThemedView>
	);
}

// ============= STYLES =============
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
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
		paddingHorizontal: 20,
	},
	card: {
		marginBottom: 16,
	},
	questionTitle: {
		marginBottom: 12,
	},
	optionsContainer: {
		gap: 8,
	},
	optionButton: {
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
	},
	optionText: {
		fontSize: 14,
	},
	radioRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		marginRight: 10,
	},
	radioText: {
		fontSize: 16,
	},
	checkboxRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	checkboxBox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		marginRight: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkboxText: {
		fontSize: 16,
	},
	submitButton: {
		padding: 16,
		borderRadius: 16,
		alignItems: 'center',
		marginTop: 20,
	},
	submitButtonDisabled: {
		opacity: 0.7,
	},
	submitButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
});

