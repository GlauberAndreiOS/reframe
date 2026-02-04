import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useRouter} from 'expo-router';
import {useAuth} from '@/context/AuthContext';
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {ThemedText} from '@/components/themed-text';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Card} from '@/components/ui/card';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useThemeColor} from '@/hooks/use-theme-color';
import {Toast, ToastType} from '@/components/ui/toast';

interface Template {
    id: string;
    title: string;
    description: string;
    category: string;
    questions: any[];
    isGlobal: boolean;
}

export default function TemplatesScreen() {
	const router = useRouter();
	const {token} = useAuth();
	const [templates, setTemplates] = useState<Template[]>([]);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

	const primaryColor = useThemeColor({}, 'tint');
	const surfaceColor = useThemeColor({}, 'surface');
	const textColor = useThemeColor({}, 'text');

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	const fetchTemplates = useCallback(async () => {
		try {
			const response = await api.get('/Questionnaire/Templates', {
				headers: {Authorization: `Bearer ${token}`}
			});
			setTemplates(response.data);
		} catch (error) {
			console.error('Error fetching templates:', error);
			setToast({message: 'Não foi possível carregar os modelos.', type: 'error'});
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchTemplates();
	}, [fetchTemplates]);

	const handleTemplatePress = (templateId: string) => {
		router.push(`/(psychologist)/questionnaire/template/${templateId}`);
	};

	const renderItem = ({item}: { item: Template }) => (
		<TouchableOpacity onPress={() => handleTemplatePress(item.id)}>
			<Card style={styles.card}>
				<View style={styles.cardHeader}>
					<View style={{flex: 1}}>
						<ThemedText type="defaultSemiBold" style={styles.cardTitle}>{item.title}</ThemedText>
						<ThemedText style={styles.categoryBadge}>{item.category}</ThemedText>
					</View>
					<IconSymbol name="chevron.right" size={24} color={primaryColor}/>
				</View>
				<ThemedText style={styles.cardDescription} numberOfLines={2}>
					{item.description}
				</ThemedText>
				<ThemedText style={styles.cardFooter}>
					{item.questions.length} perguntas • {item.isGlobal ? 'Modelo do Sistema' : 'Compartilhado'}
				</ThemedText>
			</Card>
		</TouchableOpacity>
	);

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type} />}
			<AmbientBackground/>
			
			<View style={[styles.header, {borderBottomColor: surfaceColor}]}>
				<TouchableOpacity onPress={() => router.back()}>
					<IconSymbol name="chevron.left" size={24} color={textColor}/>
				</TouchableOpacity>
				<ThemedText type="subtitle" style={{flex: 1, textAlign: 'center'}}>Modelos de Questionários</ThemedText>
				<View style={{width: 24}}/>
			</View>

			{loading ? (
				<ActivityIndicator size="large" color={primaryColor} style={styles.loader}/>
			) : (
				<FlatList
					data={templates}
					renderItem={renderItem}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={
						<ThemedText style={styles.emptyText}>Nenhum modelo disponível.</ThemedText>
					}
				/>
			)}
		</ThemedView>
	);
}

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
		fontSize: 10,
		color: '#fff',
		backgroundColor: '#6B7280',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		alignSelf: 'flex-start',
		overflow: 'hidden',
		marginBottom: 4,
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
