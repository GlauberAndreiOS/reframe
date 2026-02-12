import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useFocusEffect, useRouter} from 'expo-router';
import {ThemedView, ThemedText, AmbientBackground, Card, IconSymbol, Toast} from '@/components';
import {useAuth} from '@/context';
import {useThemeColor} from '@/hooks';
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
	createdAt: string;
	questions: Question[];
}

interface ToastState {
	message: string;
	type: 'success' | 'error';
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_QUESTIONNAIRES: '/Questionnaire',
} as const;

const NAVIGATION_ROUTES = {
	TEMPLATES: '/(psychologist)/questionnaire/templates',
	NEW: '/(psychologist)/questionnaire/new',
	DETAIL: '/(psychologist)/questionnaire/[id]',
} as const;

const MESSAGES = {
	TITLE: 'Meus Questionários',
	LOAD_ERROR: 'Não foi possível carregar os questionários.',
	EMPTY_STATE: 'Nenhum questionário cadastrado.',
	CREATED_AT: 'Criado em:',
	QUESTIONS: 'perguntas',
} as const;

const TOAST_DURATION_MS = 3000;
const BUTTON_SIZE = 40;
const BUTTON_RADIUS = 20;
const SEPARATOR_HEIGHT_PERCENTAGE = '80%';

// ============= COMPONENT =============
export default function QuestionnairesScreen() {
	const router = useRouter();
	const {token} = useAuth();

	// ============= THEME COLORS =============
	const primaryColor = useThemeColor({}, 'tint');
	const iconColor = useThemeColor({}, 'icon');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');

	// ============= STATE =============
	const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
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

	// ============= HANDLERS =============
	const fetchQuestionnaires = useCallback((showLoading = false) => {
		if (!token) {
			if (showLoading) setLoading(false);
			setRefreshing(false);
			return;
		}

		if (showLoading) {
			setLoading(true);
		}

		api.get(API_ENDPOINTS.GET_QUESTIONNAIRES)
			.then((response) => {
				setQuestionnaires(response.data);
			})
			.catch((error) => {
				console.error('Error fetching questionnaires:', error);
				setToast({message: MESSAGES.LOAD_ERROR, type: 'error'});
			})
			.finally(() => {
				if (showLoading) {
					setLoading(false);
				}
				setRefreshing(false);
			});
	}, [token]);

	const handleRefresh = useCallback(() => {
		setRefreshing(true);
		fetchQuestionnaires();
	}, [fetchQuestionnaires]);

	useFocusEffect(
		useCallback(() => {
			fetchQuestionnaires(true);
		}, [fetchQuestionnaires])
	);

	// ============= UTILITY FUNCTIONS =============
	const formatDate = (dateString: string): string => {
		try {
			return new Date(dateString).toLocaleDateString('pt-BR');
		} catch {
			return dateString;
		}
	};

	// ============= RENDER FUNCTIONS =============
	const renderQuestionnaireCard = ({item}: {item: Questionnaire}) => (
		<TouchableOpacity
			onPress={() =>
				router.push({
					pathname: NAVIGATION_ROUTES.DETAIL,
					params: {id: item.id},
				})
			}
			activeOpacity={0.7}
		>
			<Card style={styles.card}>
				<View style={styles.cardContent}>
					<View style={styles.cardInfo}>
						<ThemedText type="defaultSemiBold" style={styles.cardTitle}>
							{item.title}
						</ThemedText>
						<ThemedText style={[styles.cardDate, {color: mutedColor}]}>
							{MESSAGES.CREATED_AT} {formatDate(item.createdAt)}
						</ThemedText>
						<ThemedText style={[styles.cardSubtitle, {color: mutedColor}]}>
							{item.questions.length} {MESSAGES.QUESTIONS}
						</ThemedText>
					</View>
					<View style={[styles.separator, {backgroundColor: borderColor}]}/>
					<View style={styles.cardIcon}>
						<IconSymbol name="chevron.right" size={24} color={iconColor}/>
					</View>
				</View>
			</Card>
		</TouchableOpacity>
	);

	const renderHeaderActions = () => (
		<View style={styles.headerActions}>
			<TouchableOpacity
				style={[styles.actionButton, {backgroundColor: primaryColor}]}
				onPress={() => router.push(NAVIGATION_ROUTES.TEMPLATES)}
			>
				<IconSymbol name="doc.on.doc" size={20} color="#fff"/>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.addButton, {backgroundColor: primaryColor}]}
				onPress={() => router.push(NAVIGATION_ROUTES.NEW)}
			>
				<IconSymbol name="plus" size={24} color="#fff"/>
			</TouchableOpacity>
		</View>
	);

	const renderEmptyComponent = () => (
		<ThemedText style={[styles.emptyText, {color: mutedColor}]}>
			{MESSAGES.EMPTY_STATE}
		</ThemedText>
	);

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type}/>}
			<AmbientBackground/>

			<View style={styles.header}>
				<ThemedText type="title" style={{flex: 1}}>
					{MESSAGES.TITLE}
				</ThemedText>
				{renderHeaderActions()}
			</View>

			{loading ? (
				<ActivityIndicator size="large" color={primaryColor} style={styles.loader}/>
			) : (
				<FlatList
					data={questionnaires}
					renderItem={renderQuestionnaireCard}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={renderEmptyComponent}
					refreshing={refreshing}
					onRefresh={handleRefresh}
				/>
			)}
		</ThemedView>
	);
}

// ============= STYLES =============
const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		marginTop: 40,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	addButton: {
		width: BUTTON_SIZE,
		height: BUTTON_SIZE,
		borderRadius: BUTTON_RADIUS,
		justifyContent: 'center',
		alignItems: 'center',
	},
	actionButton: {
		width: BUTTON_SIZE,
		height: BUTTON_SIZE,
		borderRadius: BUTTON_RADIUS,
		justifyContent: 'center',
		alignItems: 'center',
	},
	listContent: {
		flexGrow: 1,
		paddingBottom: 80,
	},
	loader: {
		marginTop: 50,
	},
	card: {
		marginBottom: 12,
		padding: 0,
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
	},
	cardInfo: {
		flex: 1,
		marginRight: 16,
	},
	separator: {
		width: 1,
		height: SEPARATOR_HEIGHT_PERCENTAGE,
		marginRight: 16,
	},
	cardIcon: {
		width: 24,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		fontSize: 18,
		marginBottom: 4,
	},
	cardDate: {
		fontSize: 12,
		opacity: 0.7,
		marginBottom: 4,
	},
	cardSubtitle: {
		fontSize: 14,
		opacity: 0.8,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 40,
		fontSize: 16,
		opacity: 0.6,
	},
});
