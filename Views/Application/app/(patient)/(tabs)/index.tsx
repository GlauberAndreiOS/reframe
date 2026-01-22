import React, { useState } from 'react';
import {
	View,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedEntry } from '@/components/ui/animated-entry';

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
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const cardColor = useThemeColor({}, 'card');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');

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

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<View>
						<ThemedText type="title">Meus Pensamentos</ThemedText>
						<ThemedText style={{ color: mutedColor, fontSize: 14 }}>
							Registro diário de emoções
						</ThemedText>
					</View>

					<TouchableOpacity
						onPress={() => router.push('/(patient)/new-thought')}
						style={styles.addButton}
					>
						<IconSymbol
							name="plus.circle.fill"
							size={32}
							color={tintColor}
						/>
					</TouchableOpacity>
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
									Nenhum pensamento registrado ainda.
								</ThemedText>
								<TouchableOpacity 
									onPress={() => router.push('/(patient)/new-thought')}
									style={{ marginTop: 20 }}
								>
									<ThemedText style={{ color: tintColor, fontWeight: '600' }}>
										Registrar meu primeiro pensamento
									</ThemedText>
								</TouchableOpacity>
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

									{!!item.behavior && (
										<View style={styles.section}>
											<ThemedText style={[styles.label, { color: mutedColor }]}>COMPORTAMENTO</ThemedText>
											<ThemedText style={styles.content}>{item.behavior}</ThemedText>
										</View>
									)}

									{!!item.evidencePro && (
										<View style={styles.section}>
											<ThemedText style={[styles.label, { color: mutedColor }]}>EVIDÊNCIAS A FAVOR</ThemedText>
											<ThemedText style={styles.content}>{item.evidencePro}</ThemedText>
										</View>
									)}

									{!!item.evidenceContra && (
										<View style={styles.section}>
											<ThemedText style={[styles.label, { color: mutedColor }]}>EVIDÊNCIAS CONTRA</ThemedText>
											<ThemedText style={styles.content}>{item.evidenceContra}</ThemedText>
										</View>
									)}

									{!!item.alternativeThoughts && (
										<View style={styles.section}>
											<ThemedText style={[styles.label, { color: mutedColor }]}>PENSAMENTOS ALTERNATIVOS</ThemedText>
											<ThemedText style={styles.content}>{item.alternativeThoughts}</ThemedText>
										</View>
									)}

									{!!item.reevaluation && (
										<View style={styles.section}>
											<ThemedText style={[styles.label, { color: mutedColor }]}>REAVALIAÇÃO</ThemedText>
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
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 20,
	},
	addButton: {
		padding: 4,
	},
	list: {
		paddingHorizontal: 24,
		paddingBottom: 100,
	},
	card: {
		padding: 20,
		borderRadius: 24,
		marginBottom: 16,
		borderWidth: 1,
	},
	cardHeader: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		marginBottom: 16,
		gap: 8,
	},
	date: {
		fontSize: 12,
		fontWeight: '500',
	},
	emotionBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		alignSelf: 'flex-start',
	},
	emotion: {
		fontSize: 14,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	section: {
		marginBottom: 12,
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
