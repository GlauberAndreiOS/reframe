import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Modal,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {GestureHandlerRootView, PanGestureHandler, State} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
} as const;

const TOAST_DURATION_MS = 3000;
const REDIRECT_DELAY_MS = 1000;
const TEXTAREA_MIN_HEIGHT = 80;
const FULLSCREEN_TEXTAREA_MIN_HEIGHT = 0;

// ============= COMPONENT =============
export default function AnswerQuestionnaireScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();
	const insets = useSafeAreaInsets();

	// ============= THEME COLORS =============
	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');

	// ============= STATE =============
	const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [answers, setAnswers] = useState<Record<string, any>>({});
	const [fullscreenQuestionIndex, setFullscreenQuestionIndex] = useState<number | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [toast, setToast] = useState<ToastState | null>(null);
	const scrollViewRef = useRef<ScrollView>(null);
	const questionOffsetsRef = useRef<Record<number, number>>({});

	const textQuestionIndexes = useMemo(() => {
		if (!questionnaire) {
			return [];
		}
		return questionnaire.questions
			.map((question, index) => ({question, index}))
			.filter(({question}) => question.type === 'text')
			.map(({index}) => index);
	}, [questionnaire]);

	// ============= EFFECTS =============
	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, TOAST_DURATION_MS);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	const fetchQuestionnaire = useCallback((showLoading = false) => {
		if (!id) return;
		if (showLoading) {
			setLoading(true);
		}
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
				if (showLoading) {
					setLoading(false);
				}
				setRefreshing(false);
			});
	}, [id, token]);

	useEffect(() => {
		fetchQuestionnaire(true);
	}, [fetchQuestionnaire]);

	const handleRefresh = useCallback(() => {
		setRefreshing(true);
		fetchQuestionnaire();
	}, [fetchQuestionnaire]);

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

	const openFullscreen = (questionIndex: number) => {
		setFullscreenQuestionIndex(questionIndex);
	};

	const closeFullscreen = () => {
		setFullscreenQuestionIndex(null);
	};

	const goToNextTextQuestionOrClose = useCallback(() => {
		if (fullscreenQuestionIndex === null) {
			return;
		}

		const nextQuestionIndex = textQuestionIndexes.find((index) => index > fullscreenQuestionIndex);
		if (nextQuestionIndex === undefined) {
			closeFullscreen();
			return;
		}

		setFullscreenQuestionIndex(nextQuestionIndex);
		const nextOffset = questionOffsetsRef.current[nextQuestionIndex];
		if (typeof nextOffset === 'number') {
			setTimeout(() => {
				scrollViewRef.current?.scrollTo({y: Math.max(0, nextOffset - 16), animated: true});
			}, 0);
		}
	}, [fullscreenQuestionIndex, textQuestionIndexes]);

	const goToPreviousTextQuestionOrClose = useCallback(() => {
		if (fullscreenQuestionIndex === null) {
			return;
		}

		const previousQuestionIndexes = textQuestionIndexes.filter((index) => index < fullscreenQuestionIndex);
		const previousQuestionIndex = previousQuestionIndexes.length > 0
			? previousQuestionIndexes[previousQuestionIndexes.length - 1]
			: undefined;

		if (previousQuestionIndex === undefined) {
			closeFullscreen();
			return;
		}

		setFullscreenQuestionIndex(previousQuestionIndex);
		const previousOffset = questionOffsetsRef.current[previousQuestionIndex];
		if (typeof previousOffset === 'number') {
			setTimeout(() => {
				scrollViewRef.current?.scrollTo({y: Math.max(0, previousOffset - 16), animated: true});
			}, 0);
		}
	}, [fullscreenQuestionIndex, textQuestionIndexes]);

	const handleQuestionLayout = (questionIndex: number, y: number) => {
		questionOffsetsRef.current[questionIndex] = y;
	};

	const handleFullscreenPanStateChange = ({nativeEvent}: {nativeEvent: {state: number; translationY: number}}) => {
		if (nativeEvent.state !== State.END) {
			return;
		}

		if (nativeEvent.translationY <= -28) {
			goToNextTextQuestionOrClose();
			return;
		}

		if (nativeEvent.translationY >= 28) {
			goToPreviousTextQuestionOrClose();
		}
	};

	// ============= RENDER FUNCTIONS =============
	const renderQuestionField = (question: QuestionOption, questionIndex: number) => {
		const currentAnswer = answers[question.title];

		switch (question.type) {
		case 'text': {
			return (
				<GlassInput
					placeholder={MESSAGES.PLACEHOLDER}
					value={currentAnswer || ''}
					onChangeText={(text) => handleAnswerChange(question.title, text)}
					multiline
					style={{
						minHeight: TEXTAREA_MIN_HEIGHT,
						textAlignVertical: 'top',
					}}
					rightAdornment={
						<TouchableOpacity onPress={() => openFullscreen(questionIndex)}>
							<IconSymbol name="fullscreen" size={20} color={primaryColor}/>
						</TouchableOpacity>
					}
				/>
			);
		}

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

	const fullscreenQuestion = fullscreenQuestionIndex !== null
		? questionnaire.questions[fullscreenQuestionIndex]
		: null;
	const currentTextQuestionPosition = fullscreenQuestionIndex !== null
		? textQuestionIndexes.indexOf(fullscreenQuestionIndex)
		: -1;
	const hasPreviousTextQuestion = currentTextQuestionPosition > 0;
	const hasNextTextQuestion = currentTextQuestionPosition !== -1
		&& currentTextQuestionPosition < textQuestionIndexes.length - 1;

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type}/>}
			<AmbientBackground/>
			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity style={styles.headerActionButton} onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>
				<ThemedText type="subtitle" numberOfLines={2} style={styles.headerTitle}>
					{questionnaire.title}
				</ThemedText>
				<TouchableOpacity
					style={styles.headerActionButton}
					onPress={handleSubmit}
					disabled={submitting}
				>
					{!submitting && <IconSymbol name="checkmark" size={24} color={primaryColor}/>}
					{submitting && <ActivityIndicator size="small" color={primaryColor}/>}
				</TouchableOpacity>
			</View>

			<ScrollView
				ref={scrollViewRef}
				style={styles.content}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh}/>}
			>
				{questionnaire.questions.map((question, index) => (
					<Card key={index} style={styles.card} onLayout={(event) => handleQuestionLayout(index, event.nativeEvent.layout.y)}>
						<ThemedText type="defaultSemiBold" style={styles.questionTitle}>
							{index + 1}. {question.title}
						</ThemedText>
						{renderQuestionField(question, index)}
					</Card>
				))}

				<View style={{height: 80}}/>
			</ScrollView>

			<Modal visible={fullscreenQuestion !== null && fullscreenQuestion.type === 'text'} animationType="slide">
				<GestureHandlerRootView style={styles.fullscreenContainer}>
					<ThemedView style={styles.fullscreenContainer}>
					<View style={[styles.fullscreenHeader, {borderBottomColor: surfaceColor}]}>
						<ThemedText type="subtitle" style={styles.fullscreenTitle}>
							{fullscreenQuestion?.title}
						</ThemedText>
						<TouchableOpacity style={styles.fullscreenCloseButton} onPress={closeFullscreen}>
							<IconSymbol name="fullscreen-exit" size={24} color={textColor}/>
						</TouchableOpacity>
					</View>

					<PanGestureHandler
						onHandlerStateChange={handleFullscreenPanStateChange}
						activeOffsetY={[-16, 16]}
					>
						<View style={styles.fullscreenGestureContainer}>
							<ScrollView
								style={styles.fullscreenContent}
								contentContainerStyle={styles.fullscreenContentContainer}
								onScrollBeginDrag={goToNextTextQuestionOrClose}
								scrollEventThrottle={16}
							>
								<GlassInput
									placeholder={MESSAGES.PLACEHOLDER}
									value={fullscreenQuestion ? (answers[fullscreenQuestion.title] || '') : ''}
									onChangeText={(text) => {
										if (fullscreenQuestion) {
											handleAnswerChange(fullscreenQuestion.title, text);
										}
									}}
									multiline
									style={styles.fullscreenInput}
								/>
							</ScrollView>
						</View>
					</PanGestureHandler>

					<View style={[styles.fullscreenOverlayActions, {paddingBottom: Math.max(insets.bottom, 4)}]}>
						<ThemedText style={styles.fullscreenHint}>
							Arraste para cima para próxima e para baixo para voltar.
						</ThemedText>
						<View style={styles.fullscreenButtonsRow}>
							{hasPreviousTextQuestion && (
								<TouchableOpacity
									style={[styles.navQuestionButton, {backgroundColor: surfaceColor, borderColor: primaryColor}]}
									onPress={goToPreviousTextQuestionOrClose}
								>
									<ThemedText style={[styles.navQuestionButtonText, {color: primaryColor}]}>Anterior</ThemedText>
								</TouchableOpacity>
							)}
							{hasNextTextQuestion && (
								<TouchableOpacity
									style={[styles.navQuestionButton, {backgroundColor: primaryColor}]}
									onPress={goToNextTextQuestionOrClose}
								>
									<ThemedText style={styles.nextQuestionButtonText}>Próxima</ThemedText>
								</TouchableOpacity>
							)}
							{!hasNextTextQuestion && (
								<TouchableOpacity
									style={[styles.navQuestionButton, {backgroundColor: primaryColor}]}
									onPress={closeFullscreen}
								>
									<ThemedText style={styles.nextQuestionButtonText}>Fechar</ThemedText>
								</TouchableOpacity>
							)}
						</View>
					</View>
				</ThemedView>
				</GestureHandlerRootView>
			</Modal>
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
	headerTitle: {
		flex: 1,
		textAlign: 'center',
		flexShrink: 1,
		lineHeight: 22,
	},
	headerActionButton: {
		width: 28,
		height: 28,
		alignItems: 'center',
		justifyContent: 'center',
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
	fullscreenContainer: {
		flex: 1,
	},
	fullscreenHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingTop: 50,
		paddingBottom: 16,
		borderBottomWidth: 1,
	},
	fullscreenTitle: {
		flex: 1,
		marginRight: 12,
		flexShrink: 1,
		lineHeight: 24,
	},
	fullscreenCloseButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fullscreenContent: {
		flex: 1,
		paddingHorizontal: 20,
	},
	fullscreenGestureContainer: {
		flex: 1,
	},
	fullscreenContentContainer: {
		flexGrow: 1,
		paddingTop: 20,
		paddingBottom: 20,
	},
	fullscreenInput: {
		flex: 1,
		minHeight: FULLSCREEN_TEXTAREA_MIN_HEIGHT,
		textAlignVertical: 'top',
	},
	fullscreenOverlayActions: {
		position: 'absolute',
		left: 20,
		right: 20,
		bottom: 0,
	},
	fullscreenHint: {
		marginTop: 0,
		fontSize: 12,
		opacity: 0.7,
		backgroundColor: 'rgba(0, 0, 0, 0.2)',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		alignSelf: 'flex-start',
	},
	fullscreenButtonsRow: {
		marginTop: 12,
		flexDirection: 'row',
		gap: 12,
	},
	navQuestionButton: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: 'center',
		borderWidth: 1,
	},
	navQuestionButtonText: {
		fontWeight: '600',
	},
	nextQuestionButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
});

