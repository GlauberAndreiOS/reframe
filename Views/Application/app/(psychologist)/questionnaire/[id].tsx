import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useAuth} from '@/context/AuthContext';
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {ThemedText} from '@/components/themed-text';
import {Card} from '@/components/ui/card';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useThemeColor} from '@/hooks/use-theme-color';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Toast, ToastType} from '@/components/ui/toast';
import {ConfirmModal} from '@/components/ui/confirm-modal';

interface Questionnaire {
    id: string;
    title: string;
    createdAt: string;
    targetPatientName?: string;
    questions: {
        title: string;
        type: string;
        data: string[];
    }[];
}

interface Application {
    patientId: string;
    patientName: string;
    isApplied: boolean;
    hasResponded: boolean;
    submittedAt?: string;
    responseId?: string;
}

export default function QuestionnaireDetailScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();
	const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
	const [applications, setApplications] = useState<Application[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState<'details' | 'applications'>('details');
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);

	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');
	const dangerColor = '#EF4444';
	const successColor = '#10B981';
	const infoColor = '#3B82F6';

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	const fetchData = useCallback(async () => {
		try {
			const [qRes, aRes] = await Promise.all([
				api.get(`/Questionnaire/${id}`, {headers: {Authorization: `Bearer ${token}`}}),
				api.get(`/Questionnaire/Applications/${id}`, {headers: {Authorization: `Bearer ${token}`}})
			]);
			setQuestionnaire(qRes.data);
			setApplications(aRes.data);
		} catch (error) {
			console.error('Error fetching data:', error);
			setToast({message: 'Não foi possível carregar os detalhes.', type: 'error'});
		} finally {
			setLoading(false);
		}
	}, [id, token]);

	useEffect(() => {
		if (id) fetchData();
	}, [id, fetchData]);

	const handleDelete = async () => {
		try {
			await api.delete(`/Questionnaire/${id}`, {
				headers: {Authorization: `Bearer ${token}`}
			});
			setToast({message: 'Questionário excluído com sucesso.', type: 'success'});
			setDeleteModalVisible(false);
			setTimeout(() => {
				router.back();
			}, 1000);
		} catch (error) {
			console.error('Error deleting questionnaire:', error);
			setToast({message: 'Erro ao excluir o questionário.', type: 'error'});
			setDeleteModalVisible(false);
		}
	};

	const handleApply = async (patientId: string) => {
		try {
			await api.post(`/Questionnaire/Apply/${id}/${patientId}`, {}, {
				headers: {Authorization: `Bearer ${token}`}
			});
			setToast({message: 'Questionário aplicado com sucesso!', type: 'success'});
			fetchData(); // Refresh list
		} catch (error) {
			console.error('Error applying questionnaire:', error);
			setToast({message: 'Erro ao aplicar o questionário.', type: 'error'});
		}
	};

	const handleViewResponse = (responseId: string) => {
		router.push(`/(psychologist)/questionnaire/response/${responseId}`);
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
				<ThemedText style={{color: '#EF4444'}}>Questionário não encontrado.</ThemedText>
			</ThemedView>
		);
	}

	const renderApplicationItem = ({item}: { item: Application }) => {
		let statusColor = borderColor;
		let statusText = 'Não aplicado';
		let actionButton = null;

		if (item.isApplied) {
			if (item.hasResponded) {
				statusColor = successColor;
				statusText = 'Respondido';
				actionButton = (
					<TouchableOpacity
						style={[styles.viewResponseButton, {backgroundColor: infoColor}]}
						onPress={() => item.responseId && handleViewResponse(item.responseId)}
					>
						<ThemedText style={styles.applyButtonText}>Ver Resposta</ThemedText>
					</TouchableOpacity>
				);
			} else {
				statusColor = infoColor;
				statusText = 'Aguardando resposta';
				actionButton = (
					<View style={styles.appliedBadge}>
						<IconSymbol name="checkmark" size={16} color={statusColor}/>
					</View>
				);
			}
		} else {
			actionButton = (
				<TouchableOpacity
					style={[styles.applyButton, {backgroundColor: primaryColor}]}
					onPress={() => handleApply(item.patientId)}
				>
					<ThemedText style={styles.applyButtonText}>Aplicar</ThemedText>
				</TouchableOpacity>
			);
		}

		return (
			<Card style={[styles.applicationCard, {borderLeftColor: statusColor, borderLeftWidth: 4}]}>
				<View style={styles.applicationInfo}>
					<ThemedText type="defaultSemiBold">{item.patientName}</ThemedText>
					<ThemedText style={{fontSize: 12, color: statusColor, marginTop: 2}}>
						{statusText} {item.submittedAt ? `em ${new Date(item.submittedAt).toLocaleDateString()}` : ''}
					</ThemedText>
				</View>
				{actionButton}
			</Card>
		);
	};

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type} />}
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

			<View style={[styles.tabs, {borderBottomColor: borderColor}]}>
				<TouchableOpacity
					style={[styles.tab, activeTab === 'details' && {
						borderBottomColor: primaryColor,
						borderBottomWidth: 2
					}]}
					onPress={() => setActiveTab('details')}
				>
					<ThemedText style={[
						styles.tabText,
						activeTab === 'details' && {color: primaryColor, fontWeight: '600'}
					]}>Detalhes</ThemedText>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.tab, activeTab === 'applications' && {
						borderBottomColor: primaryColor,
						borderBottomWidth: 2
					}]}
					onPress={() => setActiveTab('applications')}
				>
					<ThemedText style={[
						styles.tabText,
						activeTab === 'applications' && {color: primaryColor, fontWeight: '600'}
					]}>
						Aplicações
					</ThemedText>
				</TouchableOpacity>
			</View>

			{activeTab === 'details' ? (
				<ScrollView style={styles.content}>
					<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Perguntas</ThemedText>
					{questionnaire.questions.map((q, index) => (
						<Card key={index} style={styles.card}>
							<ThemedText type="defaultSemiBold"
								style={styles.questionTitle}>{index + 1}. {q.title}</ThemedText>
							<ThemedText style={{
								color: primaryColor,
								fontSize: 12,
								textTransform: 'uppercase',
								marginBottom: 4
							}}>
								Tipo: {q.type}
							</ThemedText>
							{q.data && q.data.length > 0 && (
								<ThemedText style={styles.questionOptions}>Opções: {q.data.join(', ')}</ThemedText>
							)}
						</Card>
					))}
					<View style={{height: 80}}/>
				</ScrollView>
			) : (
				<FlatList
					data={applications}
					renderItem={renderApplicationItem}
					keyExtractor={(item) => item.patientId}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<ThemedText style={styles.emptyText}>Nenhum paciente encontrado.</ThemedText>
					}
				/>
			)}

			<TouchableOpacity
				style={[styles.fab, {backgroundColor: primaryColor, bottom: 150}]}
				onPress={() => router.push(`/(psychologist)/questionnaire/edit/${id}`)}
			>
				<IconSymbol name="edit" size={24} color="#fff"/>
			</TouchableOpacity>

			<TouchableOpacity
				style={[styles.fab, {backgroundColor: dangerColor}]}
				onPress={() => setDeleteModalVisible(true)}
			>
				<IconSymbol name="trash" size={24} color="#fff"/>
			</TouchableOpacity>

			<ConfirmModal
				visible={deleteModalVisible}
				title="Excluir Questionário"
				message="Tem certeza que deseja excluir este questionário? Todas as respostas associadas também serão excluídas."
				confirmText="Excluir"
				isDestructive={true}
				onConfirm={handleDelete}
				onCancel={() => setDeleteModalVisible(false)}
			/>
		</ThemedView>
	);
}

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
	questionOptions: {
		fontSize: 12,
		opacity: 0.6,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 40,
		opacity: 0.6,
	},
	fab: {
		position: 'absolute',
		bottom: 80,
		right: 30,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 4},
		shadowOpacity: 0.3,
		shadowRadius: 4,
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
