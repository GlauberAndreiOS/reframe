import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/ToastContext';
import { AnimatedEntry } from '@/components/ui/animated-entry';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PsychologistPickerModal } from '@/components/ui/psychologist-picker-modal';

interface PatientProfile {
    id: number;
    name: string;
    psychologist?: {
        id: number;
        name: string;
        crp: string;
    };
}

export default function ProfileScreen() {
	const { signOut } = useAuth();
	const { showToast } = useToast();
	const [profile, setProfile] = useState<PatientProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [isPickerVisible, setIsPickerVisible] = useState(false);
  
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const cardColor = useThemeColor({}, 'card');

	const fetchProfile = useCallback(async () => {
		try {
			const response = await api.get('/Patient/profile');
			setProfile(response.data);
		} catch (error) {
			console.error('Failed to fetch profile:', error);
			showToast('Não foi possível carregar o perfil.', 'error');
		} finally {
			setLoading(false);
		}
	}, [showToast]);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	const handleUpdatePsychologist = async (psychologistId: number | null) => {
		console.log('Updating psychologist link to:', psychologistId);
		setIsPickerVisible(false);
		try {
			await api.put('/Patient/psychologist', { psychologistId });
			
			if (psychologistId === null) {
				showToast('Vínculo removido com sucesso!', 'success');
			} else {
				showToast('Vínculo atualizado com sucesso!', 'success');
			}
			
			fetchProfile();
		} catch (error) {
			console.error('Failed to update psychologist:', error);
			showToast('Falha ao atualizar vínculo.', 'error');
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
				<AnimatedEntry style={styles.content}>
					<View style={styles.header}>
						<View style={[styles.avatarPlaceholder, { backgroundColor: tintColor + '20' }]}>
							<IconSymbol name="person.fill" size={40} color={tintColor} />
						</View>
						<ThemedText 
							type="title" 
							style={styles.name} 
							numberOfLines={1}
						>
							{profile?.name}
						</ThemedText>
					</View>

					<View style={styles.section}>
						<ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>PSICÓLOGO VINCULADO</ThemedText>
						
						<View style={[
							styles.card, 
							{ 
								backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
								borderColor: borderColor 
							}
						]}>
							{profile?.psychologist ? (
								<View style={styles.psychologistContainer}>
									<View style={styles.psychologistInfo}>
										<View style={[styles.miniAvatar, { backgroundColor: tintColor }]}>
											<IconSymbol name="star.fill" size={16} color="#FFF" />
										</View>
										<View style={{ flex: 1 }}>
											<ThemedText 
												style={styles.psychologistName} 
												numberOfLines={1}
											>
												{profile.psychologist.name}
											</ThemedText>
											<ThemedText style={[styles.crp, { color: mutedColor }]}>
												CRP: {profile.psychologist.crp}
											</ThemedText>
										</View>
									</View>
									
									<TouchableOpacity 
										onPress={() => setIsPickerVisible(true)}
										style={[styles.iconButton, { backgroundColor: tintColor + '15' }]}
									>
										<IconSymbol name="arrow.2.squarepath" size={20} color={tintColor} />
									</TouchableOpacity>
								</View>
							) : (
								<View style={styles.emptyStateContainer}>
									<ThemedText style={{ color: mutedColor, fontStyle: 'italic', flex: 1 }}>
										Nenhum psicólogo vinculado
									</ThemedText>
									<TouchableOpacity 
										onPress={() => setIsPickerVisible(true)}
										style={[styles.iconButton, { backgroundColor: tintColor + '15' }]}
									>
										<IconSymbol name="plus" size={20} color={tintColor} />
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>
          
					<TouchableOpacity 
						style={[styles.logoutButton, { borderColor: '#EF4444' }]} 
						onPress={signOut}
					>
						<IconSymbol name="arrow.right.square" size={20} color="#EF4444" />
						<ThemedText style={styles.logoutText}>Sair da conta</ThemedText>
					</TouchableOpacity>
				</AnimatedEntry>

				<PsychologistPickerModal
					visible={isPickerVisible}
					onClose={() => setIsPickerVisible(false)}
					onSelect={handleUpdatePsychologist}
					currentPsychologistId={profile?.psychologist?.id}
				/>
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
	content: {
		padding: 24,
	},
	header: {
		alignItems: 'center',
		marginBottom: 40,
	},
	avatarPlaceholder: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
	},
	name: {
		marginBottom: 4,
		textAlign: 'center',
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '700',
		marginBottom: 12,
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	card: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
	},
	psychologistContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	psychologistInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
		marginRight: 12,
	},
	emptyStateContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	miniAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	psychologistName: {
		fontSize: 16,
		fontWeight: '600',
	},
	crp: {
		fontSize: 12,
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		gap: 8,
		marginTop: 'auto',
	},
	logoutText: {
		color: '#EF4444',
		fontWeight: '600',
	},
});
