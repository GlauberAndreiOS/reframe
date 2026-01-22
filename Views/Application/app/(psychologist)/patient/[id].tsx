import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/ToastContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedEntry } from '@/components/ui/animated-entry';
import { IconSymbol } from '@/components/ui/icon-symbol';

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
	const { showToast } = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const cardColor = useThemeColor({}, 'card');
	const mutedColor = useThemeColor({}, 'muted');

	const [thoughts, setThoughts] = useState<AutomaticThought[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchThoughts = useCallback(async () => {
		try {
			const response = await api.get(`/AutomaticThought/patient/${id}`);
			setThoughts(response.data);
		} catch (error) {
			console.error('Failed to fetch patient thoughts:', error);
			showToast('Não foi possível carregar os pensamentos.', 'error');
		} finally {
			setLoading(false);
		}
	}, [id, showToast]);

	useEffect(() => {
		if (id) {
			void fetchThoughts();
		}
	}, [id, fetchThoughts]);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
	};

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<Stack.Screen 
					options={{ 
						title: name as string, 
						headerBackTitle: 'Voltar',
						headerStyle: { backgroundColor: 'transparent' },
						headerTransparent: true,
						headerTintColor: tintColor,
					}} 
				/>
        
				<View style={styles.headerSpacer} />

				<View style={styles.header}>
					<ThemedText type="title">Pensamentos de {name}</ThemedText>
					<ThemedText style={{ color: mutedColor, fontSize: 14 }}>
						Histórico de registros
					</ThemedText>
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
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							<View style={styles.center}>
								<IconSymbol name="doc.text" size={48} color={mutedColor} />
								<ThemedText style={[styles.emptyText, { color: mutedColor }]}>
									Nenhum pensamento registrado por este paciente.
								</ThemedText>
							</View>
						}
						renderItem={({ item, index }) => (
							<AnimatedEntry delay={index * 100} duration={600}>
								<View style={[
									styles.card, 
									{ 
										backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
										borderColor: borderColor 
									}
								]}>
									<View style={styles.cardHeader}>
										<ThemedText style={[styles.date, { color: mutedColor }]}>
											{formatDate(item.date)}
										</ThemedText>
										<View style={[styles.emotionBadge, { backgroundColor: tintColor + '20' }]}>
											<ThemedText style={[styles.emotion, { color: tintColor }]}>
												{item.emotion}
											</ThemedText>
										</View>
									</View>

									<View style={styles.section}>
										<ThemedText style={[styles.label, { color: mutedColor }]}>SITUAÇÃO</ThemedText>
										<ThemedText style={styles.content}>{item.situation}</ThemedText>
									</View>

									<View style={styles.section}>
										<ThemedText style={[styles.label, { color: mutedColor }]}>PENSAMENTO</ThemedText>
										<ThemedText style={styles.content}>{item.thought}</ThemedText>
									</View>

									{!!item.reevaluation && (
										<View style={[styles.section, styles.reevaluationSection, { backgroundColor: tintColor + '10', borderColor: tintColor + '30' }]}>
											<ThemedText style={[styles.label, { color: tintColor }]}>REAVALIAÇÃO</ThemedText>
											<ThemedText style={styles.content}>{item.reevaluation}</ThemedText>
										</View>
									)}
								</View>
							</AnimatedEntry>
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
	headerSpacer: {
		height: 60,
	},
	header: {
		paddingHorizontal: 24,
		paddingBottom: 20,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	list: {
		paddingHorizontal: 24,
		paddingBottom: 40,
	},
	card: {
		padding: 20,
		borderRadius: 24,
		marginBottom: 16,
		borderWidth: 1,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	date: {
		fontSize: 12,
		fontWeight: '500',
	},
	emotionBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	emotion: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	section: {
		marginBottom: 12,
	},
	reevaluationSection: {
		marginTop: 8,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
	},
	label: {
		fontSize: 10,
		fontWeight: '700',
		marginBottom: 4,
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	content: {
		fontSize: 15,
		lineHeight: 22,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 16,
		fontSize: 16,
	},
});
