import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ThemedView, ThemedText, AmbientBackground, Card, IconSymbol, Toast} from '@/components';
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
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar os modelos.',
	EMPTY_STATE: 'Nenhum modelo disponível.',
	TITLE: 'Modelos de Questionários',
	QUESTIONS_LABEL: 'perguntas',
	TEMPLATE_TYPE_GLOBAL: 'Modelo do Sistema',
	TEMPLATE_TYPE_SHARED: 'Compartilhado',
} as const;

const TOAST_DURATION_MS = 3000;
const CATEGORY_BADGE_COLOR = '#6B7280';

// ============= COMPONENT =============
export default function TemplatesScreen() {
	const router = useRouter();
	const {token} = useAuth();

	// ============= THEME COLORS =============
	const primaryColor = useThemeColor({}, 'tint');
	const surfaceColor = useThemeColor({}, 'surface');
	const textColor = useThemeColor({}, 'text');

	// ============= STATE =============
	const [templates, setTemplates] = useState<Template[]>([]);
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
		fetchTemplates();
	}, []);

	// ============= HANDLERS =============
	const fetchTemplates = useCallback(() => {
		api.get(API_ENDPOINTS.GET_TEMPLATES, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then((response) => {
				setTemplates(response.data);
			})
			.catch((error) => {
				console.error('Error fetching templates:', error);
				setToast({message: MESSAGES.LOAD_ERROR, type: 'error'});
			})
			.finally(() => {
				setLoading(false);
			});
	}, [token]);

	const handleTemplatePress = (templateId: string) => {
		router.push(`/(psychologist)/questionnaire/template/${templateId}`);
	};

	// ============= RENDER FUNCTIONS =============
	const renderTemplateCard = ({item}: {item: Template}) => (
		<TouchableOpacity onPress={() => handleTemplatePress(item.id)}>
			<Card style={styles.card}>
				<View style={styles.cardHeader}>
					<View style={{flex: 1}}>
						<ThemedText type="defaultSemiBold" style={styles.cardTitle}>
							{item.title}
						</ThemedText>
						<View style={[styles.categoryBadge, {backgroundColor: CATEGORY_BADGE_COLOR}]}>
							<ThemedText style={styles.categoryText}>{item.category}</ThemedText>
						</View>
					</View>
					<IconSymbol name="chevron.right" size={24} color={primaryColor}/>
				</View>
				<ThemedText style={styles.cardDescription} numberOfLines={2}>
					{item.description}
				</ThemedText>
				<ThemedText style={styles.cardFooter}>
					{item.questions.length} {MESSAGES.QUESTIONS_LABEL} • {item.isGlobal ? MESSAGES.TEMPLATE_TYPE_GLOBAL : MESSAGES.TEMPLATE_TYPE_SHARED}
				</ThemedText>
			</Card>
		</TouchableOpacity>
	);

	const renderEmptyComponent = () => (
		<ThemedText style={styles.emptyText}>{MESSAGES.EMPTY_STATE}</ThemedText>
	);

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type}/>}
			<AmbientBackground/>

			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>
				<ThemedText type="subtitle" style={{flex: 1, textAlign: 'center'}}>
					{MESSAGES.TITLE}
				</ThemedText>
				<View style={{width: 24}}/>
			</View>

			{loading ? (
				<ActivityIndicator size="large" color={primaryColor} style={styles.loader}/>
			) : (
				<FlatList
					data={templates}
					renderItem={renderTemplateCard}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={renderEmptyComponent}
				/>
			)}
		</ThemedView>
	);
}

// ============= STYLES =============
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
	listContent: {
		padding: 20,
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
		alignItems: 'flex-start',
		marginBottom: 8,
	},
	cardTitle: {
		fontSize: 16,
		marginBottom: 4,
	},
	categoryBadge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		alignSelf: 'flex-start',
		overflow: 'hidden',
		marginBottom: 4,
	},
	categoryText: {
		color: '#fff',
		fontSize: 10,
	},
	cardDescription: {
		fontSize: 14,
		opacity: 0.7,
		marginBottom: 8,
	},
	cardFooter: {
		fontSize: 12,
		opacity: 0.5,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 40,
		fontSize: 16,
		opacity: 0.6,
	},
});
