import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useAuth} from '@/context/AuthContext';
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {ThemedText} from '@/components/themed-text';
import {Card} from '@/components/ui/card';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useThemeColor} from '@/hooks/use-theme-color';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Toast, ToastType} from '@/components/ui/toast';

interface Questionnaire {
    id: string;
    title: string;
    createdAt: string;
    questions: any[];
}

export default function PatientQuestionnairesScreen() {
	const router = useRouter();
	const {token} = useAuth();
	const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

	const primaryColor = useThemeColor({}, 'tint');
	const iconColor = useThemeColor({}, 'icon');

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

	useEffect(() => {
		fetchQuestionnaires();
	}, [fetchQuestionnaires]);

	const renderItem = ({item}: { item: Questionnaire }) => (
		<TouchableOpacity
			onPress={() => router.push({pathname: '/(patient)/questionnaire/[id]', params: {id: item.id}})}
		>
			<Card style={styles.card}>
				<View style={styles.cardHeader}>
					<ThemedText type="defaultSemiBold" style={styles.cardTitle}>{item.title}</ThemedText>
					<IconSymbol name="chevron.right" size={20} color={iconColor}/>
				</View>
				<ThemedText style={styles.cardDate}>
					Disponível desde: {new Date(item.createdAt).toLocaleDateString()}
				</ThemedText>
				<ThemedText style={styles.cardSubtitle}>
					{item.questions.length} perguntas
				</ThemedText>
			</Card>
		</TouchableOpacity>
	);

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type} />}
			<AmbientBackground/>
			<View style={styles.header}>
				<ThemedText type="title">Questionários</ThemedText>
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
						<ThemedText style={styles.emptyText}>Nenhum questionário disponível no momento.</ThemedText>
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
