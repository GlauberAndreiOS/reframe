import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ThemedView, ThemedText, Card, IconSymbol, AmbientBackground, Toast} from '@/components';
import {useThemeColor} from '@/hooks';
import {useAuth} from '@/context';
import {api} from '@/services';

// ============= TYPES & INTERFACES =============
interface Question {
	title: string;
	type: 'text' | 'select' | 'radio' | 'checkbox';
	data: string[];
}

interface Template {
	id: string;
	title: string;
	description: string;
	category: string;
	questions: Question[];
	isGlobal: boolean;
}

interface ToastState {
	message: string;
	type: 'success' | 'error';
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_TEMPLATES: '/Questionnaire/Templates',
	COPY_TEMPLATE: '/Questionnaire/CopyTemplate',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar o modelo.',
	NOT_FOUND: 'Modelo não encontrado.',
	COPY_SUCCESS: 'Modelo copiado com sucesso!',
	COPY_ERROR: 'Erro ao copiar o modelo.',
	COPY_BUTTON: 'Copiar para Meus Questionários',
	LABEL_TYPE: 'Tipo:',
	LABEL_OPTIONS: 'Opções:',
} as const;

const TOAST_DURATION_MS = 3000;
const REDIRECT_DELAY_MS = 1000;
const COLOR_DANGER = '#EF4444';
const BUTTON_ICON_SIZE = 20;
const BUTTON_ICON_MARGIN = 12;
const QUESTION_CARD_MARGIN = 16;

// ============= COMPONENT =============
export default function TemplateDetailScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();

	// ============= THEME COLORS =============
	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');

	// ============= STATE =============
	const [template, setTemplate] = useState<Template | null>(null);
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
			fetchTemplate();
		}
	}, [id, token]);

	// ============= HANDLERS =============
	const fetchTemplate = () => {
		api.get(API_ENDPOINTS.GET_TEMPLATES, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then((response) => {
				const foundTemplate = response.data.find((t: Template) => t.id === id);
				setTemplate(foundTemplate);
			})
			.catch((error) => {
				console.error('Error fetching template:', error);
				setToast({message: MESSAGES.LOAD_ERROR, type: 'error'});
			})
			.finally(() => {
				setLoading(false);
			});
	};

	const handleCopyTemplate = () => {
		if (!template) {
			return;
		}

		api.post(`${API_ENDPOINTS.COPY_TEMPLATE}/${template.id}`, {}, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then(() => {
				setToast({message: MESSAGES.COPY_SUCCESS, type: 'success'});
				setTimeout(() => {
					router.push('/(psychologist)/(tabs)/questionnaires');
				}, REDIRECT_DELAY_MS);
			})
			.catch((error) => {
				console.error('Error copying template:', error);
				setToast({message: MESSAGES.COPY_ERROR, type: 'error'});
			});
	};

	// ============= RENDER FUNCTIONS =============
	const renderQuestionCard = (question: Question, index: number) => (
		<Card key={index} style={styles.card}>
			<ThemedText type="defaultSemiBold" style={styles.questionTitle}>
				{index + 1}. {question.title}
			</ThemedText>
			<ThemedText style={[styles.questionType, {color: primaryColor}]}>
				{MESSAGES.LABEL_TYPE} {question.type}
			</ThemedText>
			{question.data && question.data.length > 0 && (
				<ThemedText style={styles.questionOptions}>
					{MESSAGES.LABEL_OPTIONS} {question.data.join(', ')}
				</ThemedText>
			)}
		</Card>
	);

	// ============= RENDER =============
	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={primaryColor}/>
			</ThemedView>
		);
	}

	if (!template) {
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
					<ThemedText type="subtitle" numberOfLines={1}>
						{template.title}
					</ThemedText>
					<ThemedText style={styles.headerSubtitle}>
						{template.category}
					</ThemedText>
				</View>
				<View style={{width: 24}}/>
			</View>

			<ScrollView style={styles.content}>
				{template.questions.map((q, index) => renderQuestionCard(q, index))}

				<View style={styles.copyButtonContainer}>
					<TouchableOpacity
						style={[styles.copyButton, {backgroundColor: primaryColor}]}
						onPress={handleCopyTemplate}
					>
						<IconSymbol name="doc.on.doc" size={BUTTON_ICON_SIZE} color="#fff"/>
						<ThemedText style={styles.copyButtonText}>
							{MESSAGES.COPY_BUTTON}
						</ThemedText>
					</TouchableOpacity>
				</View>
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
	},
	content: {
		padding: 20,
	},
	card: {
		marginBottom: QUESTION_CARD_MARGIN,
	},
	questionTitle: {
		marginBottom: 12,
	},
	questionType: {
		fontSize: 12,
		textTransform: 'uppercase',
		marginBottom: 4,
	},
	questionOptions: {
		fontSize: 12,
		opacity: 0.6,
	},
	copyButtonContainer: {
		marginTop: 20,
		marginBottom: 20,
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 16,
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 2},
		shadowOpacity: 0.2,
		shadowRadius: 4,
		width: '100%',
	},
	copyButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
		marginLeft: BUTTON_ICON_MARGIN,
	},
});
