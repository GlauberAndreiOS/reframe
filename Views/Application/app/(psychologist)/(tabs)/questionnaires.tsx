import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useFocusEffect, useRouter} from 'expo-router';
import {useAuth} from '@/context/AuthContext';
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {ThemedText} from '@/components/themed-text';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Card} from '@/components/ui/card';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useThemeColor} from '@/hooks/use-theme-color';
import {Toast, ToastType} from '@/components/ui/toast';

interface Questionnaire {
    id: string;
    title: string;
    createdAt: string;
    questions: any[];
}

export default function QuestionnairesScreen() {
	const router = useRouter();
	const {token} = useAuth();
	const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

	const primaryColor = useThemeColor({}, 'tint');
	const iconColor = useThemeColor({}, 'icon');
	const borderColor = useThemeColor({}, 'border');

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	const fetchQuestionnaires = useCallback(async () => {
		try {
			const response = await api.get('/Questionnaire', {
				headers: {Authorization: `Bearer ${token}`}
			});
			setQuestionnaires(response.data);
		} catch (error) {
			console.error('Error fetching questionnaires:', error);
			setToast({message: 'Não foi possível carregar os questionários.', type: 'error'});
		} finally {
			setLoading(false);
		}
	}, [token]);

	useFocusEffect(
		useCallback(() => {
			fetchQuestionnaires();
		}, [fetchQuestionnaires])
	);

	const renderItem = ({item}: { item: Questionnaire }) => (
		<TouchableOpacity
			onPress={() => router.push({pathname: '/(psychologist)/questionnaire/[id]', params: {id: item.id}})}
		>
			<Card style={styles.card}>
				<View style={styles.cardContent}>
					<View style={styles.cardInfo}>
						<ThemedText type="defaultSemiBold" style={styles.cardTitle}>{item.title}</ThemedText>
						<ThemedText style={styles.cardDate}>
							Criado em: {new Date(item.createdAt).toLocaleDateString()}
						</ThemedText>
						<ThemedText style={styles.cardSubtitle}>
							{item.questions.length} perguntas
						</ThemedText>
					</View>
					<View style={[styles.separator, {backgroundColor: borderColor}]} />
					<View style={styles.cardIcon}>
						<IconSymbol name="chevron.right" size={24} color={iconColor}/>
					</View>
				</View>
			</Card>
		</TouchableOpacity>
	);

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type} />}
			<AmbientBackground/>
			<View style={styles.header}>
				<ThemedText type="title" style={{flex: 1}}>Meus Questionários</ThemedText>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={[styles.actionButton, {backgroundColor: primaryColor}]}
						onPress={() => router.push('/(psychologist)/questionnaire/templates')}
					>
						<IconSymbol name="doc.on.doc" size={20} color="#fff"/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.addButton, {backgroundColor: primaryColor}]}
						onPress={() => router.push('/(psychologist)/questionnaire/new')}
					>
						<IconSymbol name="plus" size={24} color="#fff"/>
					</TouchableOpacity>
				</View>
			</View>

			{loading ? (
				<ActivityIndicator size="large" color={primaryColor} style={styles.loader}/>
			) : (
				<FlatList
					data={questionnaires}
					renderItem={renderItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<ThemedText style={styles.emptyText}>Nenhum questionário cadastrado.</ThemedText>
					}
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
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		marginTop: 40,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	addButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	actionButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
	},
	listContent: {
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
		height: '80%',
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
