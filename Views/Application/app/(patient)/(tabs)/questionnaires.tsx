import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ThemedView, ThemedText, Card, IconSymbol, AmbientBackground, Toast} from '@/components';
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

const MESSAGES = {
	TITLE: 'Questionários',
	LOAD_ERROR: 'Não foi possível carregar os questionários.',
	EMPTY_STATE: 'Nenhum questionário disponível no momento.',
	AVAILABLE_SINCE: 'Disponível desde:',
	QUESTIONS: 'perguntas',
} as const;

const TOAST_DURATION_MS = 3000;

// ============= COMPONENT =============
export default function PatientQuestionnairesScreen() {
	const router = useRouter();
	const {token} = useAuth();

	// ============= THEME COLORS =============
	const primaryColor = useThemeColor({}, 'tint');
	const iconColor = useThemeColor({}, 'icon');
	const mutedColor = useThemeColor({}, 'muted');

	// ============= STATE =============
	const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
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

	// ============= HANDLERS =============
	const fetchQuestionnaires = useCallback(() => {
		api.get(API_ENDPOINTS.GET_QUESTIONNAIRES, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then((response) => {
				setQuestionnaires(response.data);
			})
			.catch((error) => {
				console.error('Error fetching questionnaires:', error);
				setToast({message: MESSAGES.LOAD_ERROR, type: 'error'});
			})
			.finally(() => {
				setLoading(false);
			});
	}, [token]);

	useEffect(() => {
		fetchQuestionnaires();
	}, [fetchQuestionnaires]);

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
			onPress={() => router.push({pathname: '/(patient)/questionnaire/[id]', params: {id: item.id}})}
			activeOpacity={0.7}
		>
			<Card style={styles.card}>
				<View style={styles.cardHeader}>
					<ThemedText type="defaultSemiBold" style={styles.cardTitle} numberOfLines={2}>
						{item.title}
					</ThemedText>
					<IconSymbol name="chevron.right" size={20} color={iconColor}/>
				</View>

				<ThemedText style={[styles.cardDate, {color: mutedColor}]}>
					{MESSAGES.AVAILABLE_SINCE} {formatDate(item.createdAt)}
				</ThemedText>

				<ThemedText style={styles.cardSubtitle}>
					{item.questions.length} {MESSAGES.QUESTIONS}
				</ThemedText>
			</Card>
		</TouchableOpacity>
	);

	const renderEmptyComponent = () => (
		<ThemedText style={[styles.emptyText, {color: mutedColor}]}>{MESSAGES.EMPTY_STATE}</ThemedText>
	);

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type}/>}
			<AmbientBackground/>

			<View style={styles.header}>
				<ThemedText type="title">{MESSAGES.TITLE}</ThemedText>
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
				/>
			)}
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	header: {
		marginBottom: 20,
		marginTop: 40,
	},
	listContent: {
		paddingBottom: 80,
	},
	loader: {
		marginTop: 50,
	},
	card: {
		marginBottom: 12,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	cardTitle: {
		fontSize: 18,
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
