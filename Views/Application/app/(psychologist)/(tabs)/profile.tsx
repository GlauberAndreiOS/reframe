import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

interface PsychologistProfile {
    id: number;
    name: string;
    crp: string;
    email: string;
}

export default function ProfileScreen() {
	const { signOut } = useAuth();
	const [profile, setProfile] = useState<PsychologistProfile | null>(null);
	const [loading, setLoading] = useState(true);

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'text');

	useEffect(() => {
		fetchProfile();
	}, []);

	const fetchProfile = async () => {
		try {
			const response = await api.get('/Psychologist/profile');
			setProfile(response.data);
		} catch (error) {
			console.error('Failed to fetch profile:', error);
			Alert.alert('Erro', 'Não foi possível carregar o perfil.');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={tintColor} />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				<ThemedText type="title" style={styles.title}>Meu Perfil</ThemedText>
        
				<View style={styles.content}>
					<View style={[styles.infoCard, { borderColor: borderColor + '33' }]}>
						<ThemedText style={styles.label}>Nome</ThemedText>
						<ThemedText style={styles.value}>{profile?.name}</ThemedText>
					</View>

					<View style={[styles.infoCard, { borderColor: borderColor + '33' }]}>
						<ThemedText style={styles.label}>CRP</ThemedText>
						<ThemedText style={styles.value}>{profile?.crp}</ThemedText>
					</View>

					<View style={[styles.infoCard, { borderColor: borderColor + '33' }]}>
						<ThemedText style={styles.label}>Email</ThemedText>
						<ThemedText style={styles.value}>{profile?.email}</ThemedText>
					</View>
          
					<TouchableOpacity style={styles.button} onPress={signOut}>
						<ThemedText style={styles.buttonText}>Sair</ThemedText>
					</TouchableOpacity>
				</View>
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	title: {
		margin: 20,
		textAlign: 'center',
	},
	content: {
		padding: 20,
	},
	infoCard: {
		marginBottom: 20,
		padding: 15,
		borderRadius: 10,
		borderWidth: 1,
	},
	label: {
		fontSize: 14,
		opacity: 0.7,
		marginBottom: 5,
		fontWeight: '600',
	},
	value: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	button: {
		backgroundColor: '#ff4444',
		paddingVertical: 15,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 20,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
});
