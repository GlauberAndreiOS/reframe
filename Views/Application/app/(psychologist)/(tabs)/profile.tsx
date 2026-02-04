import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '@/context/AuthContext';
import api from '@/services/api';
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useToast} from '@/context/ToastContext';
import {AnimatedEntry} from '@/components/ui/animated-entry';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Avatar} from '@/components/ui/avatar';

interface PsychologistProfile {
    id: number;
    name: string;
    crp: string;
    email: string;
    profilePictureUrl?: string;
}

export default function ProfileScreen() {
	const {signOut, token} = useAuth();
	const {showToast} = useToast();
	const [profile, setProfile] = useState<PsychologistProfile | null>(null);
	const [loading, setLoading] = useState(true);

	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const cardColor = useThemeColor({}, 'card');

	const fetchProfile = useCallback(async () => {
		try {
			const response = await api.get('/Psychologist/profile');
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

	const handleUpload = async (formData: any) => {
		try {
			const response = await api.post('/Profile/upload-picture', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					Authorization: `Bearer ${token}`
				},
			});
            
			if (profile) {
				setProfile({...profile, profilePictureUrl: response.data.url});
			}
			showToast('Foto de perfil atualizada!', 'success');
		} catch (error) {
			console.error('Upload error:', error);
			showToast('Erro ao atualizar foto.', 'error');
		}
	};

	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={tintColor}/>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>
			<SafeAreaView style={styles.safeArea}>
				<AnimatedEntry style={styles.content}>
					<View style={styles.header}>
						<View style={{marginBottom: 16}}>
							<Avatar 
								uri={profile?.profilePictureUrl} 
								size={100} 
								editable={true}
								onUpload={handleUpload}
								name={profile?.name}
							/>
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
						<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>INFORMAÇÕES
							PROFISSIONAIS</ThemedText>
						<View style={[
							styles.card,
							{
								backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
								borderColor: borderColor
							}
						]}>
							<View style={styles.infoRow}>
								<View style={[styles.iconBox, {backgroundColor: tintColor + '15'}]}>
									<IconSymbol name="doc.text.fill" size={18} color={tintColor}/>
								</View>
								<View>
									<ThemedText style={styles.label}>CRP</ThemedText>
									<ThemedText style={styles.value}>{profile?.crp}</ThemedText>
								</View>
							</View>

							<View style={[styles.divider, {backgroundColor: borderColor}]}/>

							<View style={styles.infoRow}>
								<View style={[styles.iconBox, {backgroundColor: tintColor + '15'}]}>
									<IconSymbol name="envelope.fill" size={18} color={tintColor}/>
								</View>
								<View>
									<ThemedText style={styles.label}>Email</ThemedText>
									<ThemedText style={styles.value}>{profile?.email}</ThemedText>
								</View>
							</View>
						</View>
					</View>

					<TouchableOpacity
						style={[styles.logoutButton, {borderColor: '#EF4444'}]}
						onPress={signOut}
					>
						<IconSymbol name="arrow.right.square" size={20} color="#EF4444"/>
						<ThemedText style={styles.logoutText}>Sair da conta</ThemedText>
					</TouchableOpacity>
				</AnimatedEntry>
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
		borderRadius: 20,
		borderWidth: 1,
		overflow: 'hidden',
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		gap: 16,
	},
	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	label: {
		fontSize: 12,
		opacity: 0.6,
		marginBottom: 2,
	},
	value: {
		fontSize: 16,
		fontWeight: '600',
	},
	divider: {
		height: 1,
		opacity: 0.5,
		marginLeft: 72,
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
