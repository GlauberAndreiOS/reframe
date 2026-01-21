import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

interface AutomaticThought {
    id: number;
    date: string;
    situation: string;
    thought: string;
    emotion: string;
    behavior?: string;
    evidencePro?: string;
    evidenceContra?: string;
    alternativeThoughts?: string;
    reevaluation?: string;
}

export default function PatientThoughtsScreen() {
	const { id, name } = useLocalSearchParams();
	const borderColor = useThemeColor({}, 'text');
	const cardBackgroundColor = useThemeColor({}, 'background');
	const tintColor = useThemeColor({}, 'tint');

	const [thoughts, setThoughts] = useState<AutomaticThought[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (id) {
			void fetchThoughts();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id]);

	const fetchThoughts = async () => {
		try {
			const response = await api.get(`/AutomaticThought/patient/${id}`);
			setThoughts(response.data);
		} catch (error) {
			console.error('Failed to fetch patient thoughts:', error);
			Alert.alert('Erro', 'Não foi possível carregar os pensamentos do paciente.');
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
	};

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<Stack.Screen options={{ title: name as string, headerBackTitle: 'Voltar' }} />
        
				<View style={[styles.header, { borderBottomColor: borderColor + '33' }]}>
					<ThemedText type="title" style={styles.title}>Pensamentos de {name}</ThemedText>
				</View>

				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator size="large" color={tintColor} />
					</View>
				) : (
					<FlatList
						data={thoughts}
						keyExtractor={(item) => item.id.toString()}
						contentContainerStyle={styles.list}
						ListEmptyComponent={
							<ThemedText style={styles.emptyText}>Nenhum pensamento registrado por este paciente.</ThemedText>
						}
						renderItem={({ item }) => (
							<View style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor: borderColor + '33' }]}>
								<View style={styles.cardHeader}>
									<ThemedText style={styles.date}>{formatDate(item.date)}</ThemedText>
									<ThemedText style={[styles.emotion, { color: tintColor }]}>{item.emotion}</ThemedText>
								</View>

								<ThemedText style={styles.label}>Situação:</ThemedText>
								<ThemedText style={styles.content}>{item.situation}</ThemedText>

								<ThemedText style={styles.label}>Pensamento:</ThemedText>
								<ThemedText style={styles.content}>{item.thought}</ThemedText>

								{!!item.behavior && (
									<>
										<ThemedText style={styles.label}>Comportamento:</ThemedText>
										<ThemedText style={styles.content}>{item.behavior}</ThemedText>
									</>
								)}

								{!!item.evidencePro && (
									<>
										<ThemedText style={styles.label}>Evidências a favor:</ThemedText>
										<ThemedText style={styles.content}>{item.evidencePro}</ThemedText>
									</>
								)}

								{!!item.evidenceContra && (
									<>
										<ThemedText style={styles.label}>Evidências contra:</ThemedText>
										<ThemedText style={styles.content}>{item.evidenceContra}</ThemedText>
									</>
								)}

								{!!item.alternativeThoughts && (
									<>
										<ThemedText style={styles.label}>Pensamentos Alternativos:</ThemedText>
										<ThemedText style={styles.content}>{item.alternativeThoughts}</ThemedText>
									</>
								)}

								{!!item.reevaluation && (
									<>
										<ThemedText style={styles.label}>Reavaliação:</ThemedText>
										<ThemedText style={styles.content}>{item.reevaluation}</ThemedText>
									</>
								)}
							</View>
						)}
					/>
				)}
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	header: {
		padding: 20,
		borderBottomWidth: 1,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	list: {
		padding: 20,
	},
	card: {
		padding: 15,
		borderRadius: 10,
		marginBottom: 15,
		borderWidth: 1,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	date: {
		fontSize: 12,
		opacity: 0.7,
	},
	emotion: {
		fontSize: 12,
		fontWeight: 'bold',
	},
	label: {
		fontSize: 12,
		opacity: 0.6,
		marginTop: 10,
		fontWeight: '600',
	},
	content: {
		fontSize: 16,
		marginBottom: 0,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 50,
		opacity: 0.6,
		fontSize: 16,
	},
});
