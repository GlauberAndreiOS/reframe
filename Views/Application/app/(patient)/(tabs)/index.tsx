import React, { useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

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

export default function ThoughtsScreen() {
	const router = useRouter();

	const colorScheme = useColorScheme() ?? 'light';
	const colors = Colors[colorScheme];

	const [thoughts, setThoughts] = useState<AutomaticThought[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchThoughts = async () => {
		setLoading(true);
		try {
			const response = await api.get('/AutomaticThought');
			setThoughts(response.data);
		} catch (error) {
			console.error('Failed to fetch thoughts:', error);
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		React.useCallback(() => {
			fetchThoughts();
		}, [])
	);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
	};

	const styles = StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background,
		},
		center: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
		},
		header: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 20,
			paddingVertical: 15,
		},
		title: {
			fontSize: 24,
			fontWeight: 'bold',
			color: colors.text,
		},
		list: {
			paddingHorizontal: 20,
			paddingBottom: 70,
		},
		card: {
			backgroundColor: colors.card || '#f9f9f9',
			padding: 15,
			borderRadius: 10,
			marginBottom: 15,
			borderWidth: 1,
			borderColor: colors.border || '#eee',
		},
		cardHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginBottom: 10,
		},
		date: {
			fontSize: 12,
			color: colors.icon || '#666',
		},
		emotion: {
			fontSize: 12,
			fontWeight: 'bold',
			color: colors.tint,
		},
		label: {
			fontSize: 12,
			color: colors.icon || '#888',
			marginTop: 10,
			fontWeight: '600',
		},
		content: {
			fontSize: 16,
			color: colors.text,
		},
		emptyText: {
			textAlign: 'center',
			color: colors.icon || '#999',
			marginTop: 50,
			fontSize: 16,
		},
	});

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Meus Pensamentos</Text>

				<TouchableOpacity
					onPress={() => router.push('/new-thought')}
					style={{ padding: 5 }}
				>
					<IconSymbol
						name="plus.circle.fill"
						size={32}
						color={colors.tint}
					/>
				</TouchableOpacity>
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={colors.tint} />
				</View>
			) : (
				<FlatList
					data={thoughts}
					keyExtractor={(item) => item.id.toString()}
					contentContainerStyle={styles.list}
					ListEmptyComponent={
						<Text style={styles.emptyText}>
							Nenhum pensamento registrado ainda.
						</Text>
					}
					renderItem={({ item }) => (
						<View style={styles.card}>
							<View style={styles.cardHeader}>
								<Text style={styles.date}>
									{formatDate(item.date)}
								</Text>
								<Text style={styles.emotion}>
									{item.emotion}
								</Text>
							</View>

							<Text style={styles.label}>Situação:</Text>
							<Text style={styles.content}>{item.situation}</Text>

							<Text style={styles.label}>Pensamento:</Text>
							<Text style={styles.content}>{item.thought}</Text>

							{!!item.behavior && (
								<>
									<Text style={styles.label}>Comportamento:</Text>
									<Text style={styles.content}>{item.behavior}</Text>
								</>
							)}

							{!!item.evidencePro && (
								<>
									<Text style={styles.label}>Evidências a favor:</Text>
									<Text style={styles.content}>{item.evidencePro}</Text>
								</>
							)}

							{!!item.evidenceContra && (
								<>
									<Text style={styles.label}>Evidências contra:</Text>
									<Text style={styles.content}>{item.evidenceContra}</Text>
								</>
							)}

							{!!item.alternativeThoughts && (
								<>
									<Text style={styles.label}>Pensamentos Alternativos:</Text>
									<Text style={styles.content}>{item.alternativeThoughts}</Text>
								</>
							)}

							{!!item.reevaluation && (
								<>
									<Text style={styles.label}>Reavaliação:</Text>
									<Text style={styles.content}>{item.reevaluation}</Text>
								</>
							)}
						</View>
					)}
				/>
			)}
		</SafeAreaView>
	);
}
