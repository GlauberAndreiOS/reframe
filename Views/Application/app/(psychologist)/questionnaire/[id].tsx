import React, {useCallback, useEffect, useState} from 'react';
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {ThemedView, ThemedText, Card, IconSymbol, AmbientBackground, Toast, ConfirmModal} from '@/components';
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
	targetPatientName?: string;
	questions: Question[];
}

interface Application {
	patientId: string;
	patientName: string;
	isApplied: boolean;
	hasResponded: boolean;
	submittedAt?: string;
	responseId?: string;
}

interface ToastState {
	message: string;
	type: 'success' | 'error';
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_QUESTIONNAIRE: '/Questionnaire',
	GET_APPLICATIONS: '/Questionnaire/Applications',
	DELETE_QUESTIONNAIRE: '/Questionnaire',
	APPLY_QUESTIONNAIRE: '/Questionnaire/Apply',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar os detalhes.',
	DELETE_SUCCESS: 'Questionário excluído com sucesso.',
	DELETE_ERROR: 'Erro ao excluir o questionário.',
	DELETE_TITLE: 'Excluir Questionário',
	DELETE_MESSAGE: 'Tem certeza que deseja excluir este questionário? Todas as respostas associadas também serão excluídas.',
	APPLY_SUCCESS: 'Questionário aplicado com sucesso!',
	APPLY_ERROR: 'Erro ao aplicar o questionário.',
	NOT_FOUND: 'Questionário não encontrado.',
	TAB_DETAILS: 'Detalhes',
	TAB_APPLICATIONS: 'Aplicações',
	SECTION_QUESTIONS: 'Perguntas',
	EMPTY_PATIENTS: 'Nenhum paciente encontrado.',
	BUTTON_VIEW_RESPONSE: 'Ver Resposta',
	BUTTON_APPLY: 'Aplicar',
	LABEL_TYPE: 'Tipo:',
	LABEL_OPTIONS: 'Opções:',
} as const;

const TAB_NAMES = {
	DETAILS: 'details',
	APPLICATIONS: 'applications',
} as const;

const STATUS_COLORS = {
	NOT_APPLIED: '#999999',
	APPLIED_PENDING: '#3B82F6',
	APPLIED_RESPONDED: '#10B981',
	DANGER: '#EF4444',
	WARNING: '#F59E0B',
} as const;

const STATUS_LABELS = {
	NOT_APPLIED: 'Não aplicado',
	APPLIED_PENDING: 'Aguardando resposta',
	APPLIED_RESPONDED: 'Respondido',
} as const;

const TOAST_DURATION_MS = 3000;
const REDIRECT_DELAY_MS = 1000;
const SEPARATOR_HEIGHT = 24;
const SEPARATOR_MARGIN = 8;
const ACTION_BUTTON_SIZE = 32;
const ACTION_BUTTON_RADIUS = 16;

// ============= COMPONENT =============
export default function QuestionnaireDetailScreen() {
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
	const [applications, setApplications] = useState<Application[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [activeTab, setActiveTab] = useState<typeof TAB_NAMES.DETAILS | typeof TAB_NAMES.APPLICATIONS>(
		TAB_NAMES.DETAILS,
	);
	const [toast, setToast] = useState<ToastState | null>(null);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

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
			fetchData(true);
		}
	}, [id, token]);

	// ============= HANDLERS =============
	const fetchData = useCallback((showLoading = false) => {
		if (showLoading) {
			setLoading(true);
		}

		Promise.all([
			api.get(`${API_ENDPOINTS.GET_QUESTIONNAIRE}/${id}`, {
				headers: {Authorization: `Bearer ${token}`},
			}),
			api.get(`${API_ENDPOINTS.GET_APPLICATIONS}/${id}`, {
				headers: {Authorization: `Bearer ${token}`},
			}),
		])
			.then(([qRes, aRes]) => {
				setQuestionnaire(qRes.data);
				setApplications(aRes.data);
			})
			.catch((error) => {
				console.error('Error fetching data:', error);
				setToast({message: MESSAGES.LOAD_ERROR, type: 'error'});
			})
			.finally(() => {
				if (showLoading) {
					setLoading(false);
				}
				setRefreshing(false);
			});
	}, [id, token]);

	const handleRefresh = useCallback(() => {
		setRefreshing(true);
		fetchData();
	}, [fetchData]);

	const handleDelete = () => {
		api.delete(`${API_ENDPOINTS.DELETE_QUESTIONNAIRE}/${id}`, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then(() => {
				setToast({message: MESSAGES.DELETE_SUCCESS, type: 'success'});
				setDeleteModalVisible(false);
				setTimeout(() => {
					router.back();
				}, REDIRECT_DELAY_MS);
			})
			.catch((error) => {
				console.error('Error deleting questionnaire:', error);
				setToast({message: MESSAGES.DELETE_ERROR, type: 'error'});
				setDeleteModalVisible(false);
			});
	};

	const handleApply = (patientId: string) => {
		api.post(`${API_ENDPOINTS.APPLY_QUESTIONNAIRE}/${id}/${patientId}`, {}, {
			headers: {Authorization: `Bearer ${token}`},
		})
			.then(() => {
				setToast({message: MESSAGES.APPLY_SUCCESS, type: 'success'});
				fetchData();
			})
			.catch((error) => {
				console.error('Error applying questionnaire:', error);
				setToast({message: MESSAGES.APPLY_ERROR, type: 'error'});
			});
	};

	const handleViewResponse = (responseId: string) => {
		router.push(`/(psychologist)/questionnaire/response/${responseId}`);
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

	const getApplicationStatus = (application: Application) => {
		if (!application.isApplied) {
			return {color: STATUS_COLORS.NOT_APPLIED, label: STATUS_LABELS.NOT_APPLIED};
		}
		if (application.hasResponded) {
			return {color: STATUS_COLORS.APPLIED_RESPONDED, label: STATUS_LABELS.APPLIED_RESPONDED};
		}
		return {color: STATUS_COLORS.APPLIED_PENDING, label: STATUS_LABELS.APPLIED_PENDING};
	};

	const renderApplicationActionButton = (application: Application) => {
		if (!application.isApplied) {
			return (
				<TouchableOpacity
					style={[styles.applyButton, {backgroundColor: primaryColor}]}
					onPress={() => handleApply(application.patientId)}
				>
					<ThemedText style={styles.applyButtonText}>{MESSAGES.BUTTON_APPLY}</ThemedText>
				</TouchableOpacity>
			);
		}

		if (application.hasResponded) {
			return (
				<TouchableOpacity
					style={[styles.viewResponseButton, {backgroundColor: STATUS_COLORS.APPLIED_PENDING}]}
					onPress={() => application.responseId && handleViewResponse(application.responseId)}
				>
					<ThemedText style={styles.applyButtonText}>{MESSAGES.BUTTON_VIEW_RESPONSE}</ThemedText>
				</TouchableOpacity>
			);
		}

		return (
			<View style={styles.appliedBadge}>
				<IconSymbol name="checkmark" size={16} color={STATUS_COLORS.APPLIED_PENDING}/>
			</View>
		);
	};

	const renderApplicationItem = ({item}: {item: Application}) => {
		const status = getApplicationStatus(item);

		return (
			<Card style={[styles.applicationCard, {borderLeftColor: status.color, borderLeftWidth: 4}]}>
				<View style={styles.applicationInfo}>
					<ThemedText type="defaultSemiBold">{item.patientName}</ThemedText>
					<ThemedText style={[styles.applicationStatus, {color: status.color}]}>
						{status.label}
						{item.submittedAt ? ` em ${new Date(item.submittedAt).toLocaleDateString('pt-BR')}` : ''}
					</ThemedText>
				</View>
				{renderApplicationActionButton(item)}
			</Card>
		);
	};

	const renderDetailsTab = () => (
		<ScrollView
			style={styles.content}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh}/>}
		>
			<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
				{MESSAGES.SECTION_QUESTIONS}
			</ThemedText>
			{questionnaire?.questions.map((q, index) => renderQuestionCard(q, index))}
			<View style={{height: 80}}/>
		</ScrollView>
	);

	const renderApplicationsTab = () => (
		<FlatList
			data={applications}
			renderItem={renderApplicationItem}
			keyExtractor={(item) => item.patientId}
			contentContainerStyle={styles.listContent}
			ListEmptyComponent={<ThemedText style={styles.emptyText}>{MESSAGES.EMPTY_PATIENTS}</ThemedText>}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh}/>}
		/>
	);

	const renderHeaderActions = () => (
		<View style={styles.headerActions}>
			<TouchableOpacity
				style={[styles.actionIconButton, {backgroundColor: STATUS_COLORS.WARNING}]}
				onPress={() => router.push(`/(psychologist)/questionnaire/edit/${id}`)}
			>
				<IconSymbol name="edit" size={16} color="#fff"/>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.actionIconButton, {backgroundColor: STATUS_COLORS.DANGER}]}
				onPress={() => setDeleteModalVisible(true)}
			>
				<IconSymbol name="trash" size={16} color="#fff"/>
			</TouchableOpacity>
		</View>
	);

	const renderTabButton = (tabName: typeof TAB_NAMES.DETAILS | typeof TAB_NAMES.APPLICATIONS, label: string) => (
		<TouchableOpacity
			style={[
				styles.tab,
				activeTab === tabName && {borderBottomColor: primaryColor, borderBottomWidth: 2},
			]}
			onPress={() => setActiveTab(tabName)}
		>
			<ThemedText
				style={[
					styles.tabText,
					activeTab === tabName && {color: primaryColor, fontWeight: '600'},
				]}
			>
				{label}
			</ThemedText>
		</TouchableOpacity>
	);

	// ============= RENDER =============
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
				<ThemedText style={{color: STATUS_COLORS.DANGER}}>{MESSAGES.NOT_FOUND}</ThemedText>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type}/>}
			<AmbientBackground/>

			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>

				<View style={[styles.separator, {backgroundColor: borderColor}]}/>

				<ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
					{questionnaire.title}
				</ThemedText>

				<View style={[styles.separator, {backgroundColor: borderColor}]}/>

				{renderHeaderActions()}
			</View>

			<View style={[styles.tabs, {borderBottomColor: borderColor}]}>
				{renderTabButton(TAB_NAMES.DETAILS, MESSAGES.TAB_DETAILS)}
				{renderTabButton(TAB_NAMES.APPLICATIONS, MESSAGES.TAB_APPLICATIONS)}
			</View>

			{activeTab === TAB_NAMES.DETAILS ? renderDetailsTab() : renderApplicationsTab()}

			<ConfirmModal
				visible={deleteModalVisible}
				title={MESSAGES.DELETE_TITLE}
				message={MESSAGES.DELETE_MESSAGE}
				confirmText={MESSAGES.DELETE_TITLE}
				isDestructive={true}
				onConfirm={handleDelete}
				onCancel={() => setDeleteModalVisible(false)}
			/>
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
		alignItems: 'center',
		padding: 20,
		paddingTop: 50,
		borderBottomWidth: 1,
	},
	backButton: {
		width: '10%',
		alignItems: 'flex-start',
	},
	headerTitle: {
		flex: 1,
		textAlign: 'center',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	separator: {
		width: 1,
		height: SEPARATOR_HEIGHT,
		marginHorizontal: SEPARATOR_MARGIN,
	},
	actionIconButton: {
		width: ACTION_BUTTON_SIZE,
		height: ACTION_BUTTON_SIZE,
		borderRadius: ACTION_BUTTON_RADIUS,
		justifyContent: 'center',
		alignItems: 'center',
	},
	tabs: {
		flexDirection: 'row',
		paddingHorizontal: 20,
		borderBottomWidth: 1,
	},
	tab: {
		marginRight: 20,
		paddingVertical: 12,
	},
	tabText: {
		fontSize: 16,
		opacity: 0.7,
	},
	content: {
		padding: 20,
	},
	listContent: {
		padding: 20,
		paddingBottom: 100,
	},
	sectionTitle: {
		marginBottom: 16,
	},
	card: {
		marginBottom: 12,
	},
	questionTitle: {
		marginBottom: 4,
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
	emptyText: {
		textAlign: 'center',
		marginTop: 40,
		opacity: 0.6,
	},
	applicationCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
		paddingVertical: 16,
		paddingHorizontal: 16,
	},
	applicationInfo: {
		flex: 1,
	},
	applicationStatus: {
		fontSize: 12,
		marginTop: 2,
	},
	applyButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
	},
	applyButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 12,
	},
	appliedBadge: {
		padding: 8,
	},
	viewResponseButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
	},
});
