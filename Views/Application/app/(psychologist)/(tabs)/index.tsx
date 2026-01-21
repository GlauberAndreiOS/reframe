import React, { useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

interface Patient {
    id: number;
    name: string;
}

export default function PatientsScreen() {
	const router = useRouter();
	const borderColor = useThemeColor({}, 'text');
	const cardBackgroundColor = useThemeColor({}, 'background');
	const tintColor = useThemeColor({}, 'tint');

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
				<ThemedText type="title" style={styles.title}>Meus Pacientes</ThemedText>
				
				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator size="large" color={tintColor} />
					</View>
				) : (
					<FlatList
						data={patients}
						keyExtractor={(item) => item.id.toString()}
						renderItem={({ item }) => (
							<TouchableOpacity 
								style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor: borderColor + '33' }]}
								onPress={() => router.push({ pathname: '/(psychologist)/patient/[id]', params: { id: item.id, name: item.name } })}
							>
								<ThemedText style={styles.name}>{item.name}</ThemedText>
							</TouchableOpacity>
						)}
						contentContainerStyle={styles.list}
						ListEmptyComponent={
							<ThemedText style={styles.emptyText}>Nenhum paciente vinculado.</ThemedText>
						}
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
	title: {
		margin: 20,
	},
	list: {
		paddingHorizontal: 20,
		paddingBottom: 70,
	},
	card: {
		padding: 15,
		borderRadius: 10,
		marginBottom: 15,
		borderWidth: 1,
	},
	name: {
		fontSize: 18,
		fontWeight: '600',
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 50,
		opacity: 0.6,
		fontSize: 16,
	},
});
