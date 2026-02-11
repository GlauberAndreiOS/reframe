import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ThemedView, ThemedText, GlassInput, Card, IconSymbol, AmbientBackground, Toast, Avatar} from '@/components';
import {useThemeColor} from '@/hooks';
import {useAuth} from '@/context';
import {api} from '@/services';

// ============= TYPES & INTERFACES =============
interface Question {
	title: string;
	type: 'text' | 'select' | 'radio' | 'checkbox';
	data: string[];
}

interface Questionnaire {
	id: string;
	title: string;
	questions: Question[];
}

interface Answer {
	questionTitle: string;
	value: any;
}

interface QuestionnaireResponse {
	questionnaire: Questionnaire;
	answers: Answer[];
	patient: {
		name?: string;
		user?: {
			name?: string;
		};
		profilePictureUrl?: string;
	};
	submittedAt: string;
}

interface ToastState {
	message: string;
	type: 'success' | 'error';
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_RESPONSE: '/Questionnaire/Response',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar a resposta.',
	NOT_FOUND: 'Resposta não encontrada.',
	UNKNOWN_PATIENT: 'Paciente desconhecido',
	RESPONSE_LABEL: 'Respondido por',
	RESPONSE_ON: 'em',
} as const;

const COLOR_DANGER = '#EF4444';
const TOAST_DURATION_MS = 3000;
const AVATAR_SIZE = 40;
const RADIO_SIZE = 20;
const CHECKBOX_SIZE = 20;
const CHECKBOX_RADIUS = 4;
const OPTION_PADDING = 12;
const OPTION_RADIUS = 12;
const OPTION_MARGIN_RIGHT = 10;
const CARD_MARGIN_BOTTOM = 16;

// ============= COMPONENT =============
export default function ViewResponseScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();

	// ============= THEME COLORS =============
	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');

	// ============= STATE =============
	const [response, setResponse] = useState<QuestionnaireResponse | null>(null);
	const [loading, setLoading] = useState(true);
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
		if (id) {
			fetchResponse();
		}
	}, [id, token]);

	// ============= HANDLERS =============
	const fetchResponse = () => {
		api.get(`${API_ENDPOINTS.GET_RESPONSE}/${id}`, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then((apiResponse) => {
				setResponse(apiResponse.data);
			})
			.catch((error) => {
				console.error('Error fetching response:', error);
				setToast({message: MESSAGES.LOAD_ERROR, type: 'error'});
			})
			.finally(() => {
				setLoading(false);
			});
	};

	// ============= UTILITY FUNCTIONS =============
	const getAnswerForQuestion = (questionTitle: string) => {
		return response?.answers.find((a) => a.questionTitle === questionTitle)?.value;
	};

	const getPatientName = () => {
		console.log(response)
		return response?.patient?.name || response?.patient?.user?.name || MESSAGES.UNKNOWN_PATIENT;
	};

	// ============= RENDER FUNCTIONS =============
	const renderTextAnswer = (answer: any) => (
		<GlassInput
			value={String(answer || '')}
			editable={false}
			multiline
			style={{minHeight: 80, textAlignVertical: 'top'}}
		/>
	);

	const renderSelectAnswer = (question: Question, answer: any) => (
		<View style={styles.optionsContainer}>
			{question.data.map((option, optIdx) => (
				<TouchableOpacity
					key={optIdx}
					style={[
						styles.optionButton,
						{borderColor},
						answer === option && {
							borderColor: primaryColor,
							backgroundColor: primaryColor + '20',
						},
					]}
					disabled
				>
					<ThemedText
						style={[
							styles.optionText,
							answer === option && {color: primaryColor, fontWeight: '600'},
						]}
					>
						{option}
					</ThemedText>
				</TouchableOpacity>
			))}
		</View>
	);

	const renderRadioAnswer = (question: Question, answer: any) => (
		<View style={styles.optionsContainer}>
			{question.data.map((option, optIdx) => (
				<TouchableOpacity key={optIdx} style={styles.radioRow} disabled>
					<View
						style={[
							styles.radioCircle,
							{borderColor},
							answer === option && {
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

	const renderCheckboxAnswer = (question: Question, answer: any) => (
		<View style={styles.optionsContainer}>
			{question.data.map((option, optIdx) => {
				const isSelected = (answer || []).includes(option);
				return (
					<TouchableOpacity key={optIdx} style={styles.checkboxRow} disabled>
						<View
							style={[
								styles.checkboxBox,
								{borderColor},
								isSelected && {borderColor: primaryColor, backgroundColor: primaryColor},
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

	const renderQuestionAnswer = (question: Question, index: number) => {
		const answer = getAnswerForQuestion(question.title);

		return (
			<Card key={index} style={styles.card}>
				<ThemedText type="defaultSemiBold" style={styles.questionTitle}>
					{index + 1}. {question.title}
				</ThemedText>

				{question.type === 'text' && renderTextAnswer(answer)}
				{question.type === 'select' && renderSelectAnswer(question, answer)}
				{question.type === 'radio' && renderRadioAnswer(question, answer)}
				{question.type === 'checkbox' && renderCheckboxAnswer(question, answer)}
			</Card>
		);
	};

	// ============= RENDER =============
	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={primaryColor}/>
			</ThemedView>
		);
	}

	if (!response) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ThemedText style={{color: COLOR_DANGER}}>{MESSAGES.NOT_FOUND}</ThemedText>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type}/>}
			<AmbientBackground/>

			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>
				<View style={{flex: 1, alignItems: 'center'}}>
					<View style={{marginBottom: 8}}>
						<Avatar
							uri={response.patient?.profilePictureUrl}
							size={AVATAR_SIZE}
							editable={false}
							name={getPatientName()}
						/>
					</View>
					<ThemedText type="subtitle" numberOfLines={1}>
						{response.questionnaire.title}
					</ThemedText>
					<ThemedText style={styles.headerSubtitle}>
						{MESSAGES.RESPONSE_LABEL} {getPatientName()}{' '}
						{MESSAGES.RESPONSE_ON} {new Date(response.submittedAt).toLocaleDateString()}
					</ThemedText>
				</View>
				<View style={{width: 24}}/>
			</View>

			<ScrollView style={styles.content}>
				{response.questionnaire.questions.map((q, index) => renderQuestionAnswer(q, index))}
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
	headerSubtitle: {
		fontSize: 12,
		opacity: 0.7,
		marginTop: 2,
		textAlign: 'center',
	},
	content: {
		padding: 20,
	},
	card: {
		marginBottom: CARD_MARGIN_BOTTOM,
	},
	questionTitle: {
		marginBottom: 12,
	},
	optionsContainer: {
		gap: 8,
	},
	optionButton: {
		padding: OPTION_PADDING,
		borderRadius: OPTION_RADIUS,
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
		width: RADIO_SIZE,
		height: RADIO_SIZE,
		borderRadius: RADIO_SIZE / 2,
		borderWidth: 2,
		marginRight: OPTION_MARGIN_RIGHT,
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
		width: CHECKBOX_SIZE,
		height: CHECKBOX_SIZE,
		borderRadius: CHECKBOX_RADIUS,
		borderWidth: 2,
		marginRight: OPTION_MARGIN_RIGHT,
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkboxText: {
		fontSize: 16,
	},
});
