import React, { useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AnimatedEntry } from '@/components/ui/animated-entry';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Patient {
    id: number;
    name: string;
}

export default function PatientsScreen() {
	const router = useRouter();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const cardColor = useThemeColor({}, 'card');
	const mutedColor = useThemeColor({}, 'muted');

	const [patients, setPatients] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchPatients = async () => {
		setLoading(true);
		try {
			const response = await api.get('/Psychologist/patients');
			setPatients(response.data);
		} catch (error) {
			console.error('Failed to fetch patients:', error);
		} finally {
			setLoading(false);
		}
	};

	useFocusEffect(
		React.useCallback(() => {
			fetchPatients();
		}, [])
	);

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<ThemedText type="title">Meus Pacientes</ThemedText>
					<ThemedText style={{ color: mutedColor, fontSize: 14 }}>
						Acompanhamento clínico
					</ThemedText>
				</View>
				
				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator size="large" color={tintColor} />
					</View>
				) : (
					<FlatList
						data={patients}
						keyExtractor={(item) => item.id.toString()}
						contentContainerStyle={styles.list}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							<View style={styles.center}>
								<IconSymbol name="person.2" size={48} color={mutedColor} />
								<ThemedText style={[styles.emptyText, { color: mutedColor }]}>
									Nenhum paciente vinculado.
								</ThemedText>
							</View>
						}
						renderItem={({ item, index }) => (
							<AnimatedEntry delay={index * 100} duration={600}>
								<TouchableOpacity 
									style={[
										styles.card, 
										{ 
											backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
											borderColor: borderColor 
										}
									]}
									onPress={() => router.push({ pathname: '/(psychologist)/patient/[id]', params: { id: item.id, name: item.name } })}
									activeOpacity={0.7}
								>
									<View style={[styles.avatar, { backgroundColor: tintColor + '20' }]}>
										<IconSymbol name="person.fill" size={20} color={tintColor} />
									</View>
									<View style={styles.info}>
										<ThemedText style={styles.name}>{item.name}</ThemedText>
										<ThemedText style={{ color: mutedColor, fontSize: 12 }}>Ver registros</ThemedText>
									</View>
									<IconSymbol name="chevron.right" size={20} color={mutedColor} />
								</TouchableOpacity>
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
	header: {
		paddingHorizontal: 24,
		paddingVertical: 20,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	list: {
		paddingHorizontal: 24,
		paddingBottom: 100,
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 20,
		marginBottom: 12,
		borderWidth: 1,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 16,
	},
	info: {
		flex: 1,
	},
	name: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 16,
		fontSize: 16,
	},
});
