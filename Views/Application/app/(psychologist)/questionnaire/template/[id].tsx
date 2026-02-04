import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
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

export default function TemplateDetailScreen() {
	const {id} = useLocalSearchParams();
	const router = useRouter();
	const {token} = useAuth();
	const [template, setTemplate] = useState<Template | null>(null);
	const [loading, setLoading] = useState(true);
	const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

	const primaryColor = useThemeColor({}, 'tint');
	const textColor = useThemeColor({}, 'text');
	const surfaceColor = useThemeColor({}, 'surface');

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => {
				setToast(null);
			}, 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	useEffect(() => {
		const fetchTemplate = async () => {
			try {
				// We need a new endpoint to get a single template by ID
				// For now, I'll fetch all and find the one. This is inefficient.
				const response = await api.get('/Questionnaire/Templates', {
					headers: {Authorization: `Bearer ${token}`}
				});
				const foundTemplate = response.data.find((t: Template) => t.id === id);
				setTemplate(foundTemplate);
			} catch (error) {
				console.error('Error fetching template:', error);
				setToast({message: 'Não foi possível carregar o modelo.', type: 'error'});
			} finally {
				setLoading(false);
			}
		};

		if (id) fetchTemplate();
	}, [id, token]);

	const handleCopyTemplate = async () => {
		if (!template) return;

		try {
			await api.post(`/Questionnaire/CopyTemplate/${template.id}`, {}, {
				headers: {Authorization: `Bearer ${token}`}
			});
			setToast({message: 'Modelo copiado com sucesso!', type: 'success'});
			setTimeout(() => {
				router.push('/(psychologist)/(tabs)/questionnaires');
			}, 1000);
		} catch (error) {
			console.error('Error copying template:', error);
			setToast({message: 'Erro ao copiar o modelo.', type: 'error'});
		}
	};

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
				<ThemedText style={{color: '#EF4444'}}>Modelo não encontrado.</ThemedText>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			{toast && <Toast message={toast.message} type={toast.type} />}
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
				{template.questions.map((q, index) => (
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
				
				<View style={styles.copyButtonContainer}>
					<TouchableOpacity
						style={[styles.copyButton, {backgroundColor: primaryColor}]}
						onPress={handleCopyTemplate}
					>
						<IconSymbol name="doc.on.doc" size={20} color="#fff"/>
						<ThemedText style={styles.copyButtonText}>Copiar para Meus Questionários</ThemedText>
					</TouchableOpacity>
				</View>
				<View style={{height: 80}}/>
			</ScrollView>
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
	headerSubtitle: {
		fontSize: 12,
		opacity: 0.7,
		marginTop: 2,
	},
	content: {
		padding: 20,
	},
	card: {
		marginBottom: 16,
	},
	questionTitle: {
		marginBottom: 12,
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
		marginLeft: 12,
	},
});
