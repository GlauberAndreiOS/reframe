import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ThemedText, ThemedView, AnimatedEntry, IconSymbol, PsychologistPickerModal, AmbientBackground, Avatar} from '@/components';
import {useAuth, useToast} from '@/context';
import {useThemeColor, useColorScheme} from '@/hooks';
import {api} from '@/services';

// ============= TYPES & INTERFACES =============
interface PatientProfile {
	id: string;
	name: string;
	profilePictureUrl?: string;
	hasPendingLinkRequest?: boolean;
	psychologist?: {
		id: string;
		name: string;
		crp: string;
		profilePictureUrl?: string;
	};
	pendingPsychologist?: {
		id: string;
		name: string;
		crp: string;
		profilePictureUrl?: string;
	};
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_PROFILE: '/Patient/profile',
	UPLOAD_PICTURE: '/Profile/upload-picture',
	UPDATE_PSYCHOLOGIST: '/Patient/psychologist',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar o perfil.',
	UPLOAD_SUCCESS: 'Foto de perfil atualizada!',
	UPLOAD_ERROR: 'Erro ao atualizar foto.',
	LINK_REMOVED: 'Vínculo removido com sucesso!',
	LINK_REQUESTED: 'Solicitação de vínculo enviada com sucesso!',
	LINK_ERROR: 'Falha ao atualizar vínculo.',
	NO_PSYCHOLOGIST: 'Nenhum psicólogo vinculado',
	PENDING_TITLE: 'SOLICITACAO PENDENTE',
	PENDING_MESSAGE: 'Aguardando aprovacao do psicologo',
	LOGOUT: 'Sair da conta',
	SECTION_TITLE: 'PSICÓLOGO VINCULADO',
} as const;

// ============= COMPONENT =============
export default function ProfileScreen() {
	const {signOut, token} = useAuth();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const cardColor = useThemeColor({}, 'card');
	const warningColor = '#F59E0B';

	// ============= STATE =============
	const [profile, setProfile] = useState<PatientProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [isPickerVisible, setIsPickerVisible] = useState(false);

	// ============= EFFECTS =============
	useEffect(() => {
		fetchProfile();
	}, []);

	// ============= HANDLERS =============
	const fetchProfile = useCallback(() => {
		api.get(API_ENDPOINTS.GET_PROFILE)
			.then((response) => {
				setProfile(response.data);
			})
			.catch((error) => {
				console.error('Failed to fetch profile:', error);
				showToast(MESSAGES.LOAD_ERROR, 'error');
			})
			.finally(() => {
				setLoading(false);
			});
	}, [showToast]);

	const handleUpload = async (formData: any): Promise<void> => {
		try {
			const response = await api.post(API_ENDPOINTS.UPLOAD_PICTURE, formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					Authorization: `Bearer ${token}`,
				},
			});
			if (profile) {
				setProfile({...profile, profilePictureUrl: response.data.url});
			}
			showToast(MESSAGES.UPLOAD_SUCCESS, 'success');
		} catch (error) {
			console.error('Upload error:', error);
			showToast(MESSAGES.UPLOAD_ERROR, 'error');
		}
	};

	const handleUpdatePsychologist = (psychologistId: string | null) => {
		setIsPickerVisible(false);

		api.put(API_ENDPOINTS.UPDATE_PSYCHOLOGIST, {psychologistId})
			.then(() => {
				const message = psychologistId === null ? MESSAGES.LINK_REMOVED : MESSAGES.LINK_REQUESTED;
				showToast(message, 'success');
				fetchProfile();
			})
			.catch((error) => {
				console.error('Failed to update psychologist:', error);
				showToast(MESSAGES.LINK_ERROR, 'error');
			});
	};

	// ============= RENDER FUNCTIONS =============
	const renderPsychologistInfo = () => {
		if (profile?.psychologist) {
			return (
				<View style={styles.psychologistContainer}>
					<View style={styles.psychologistInfo}>
						<View style={{marginRight: 12}}>
							<Avatar
								uri={profile.psychologist.profilePictureUrl}
								size={40}
								editable={false}
								name={profile.psychologist.name}
							/>
						</View>
						<View style={{flex: 1}}>
							<ThemedText style={styles.psychologistName} numberOfLines={1}>
								{profile.psychologist.name}
							</ThemedText>
							<ThemedText style={[styles.crp, {color: mutedColor}]}>
								CRP: {profile.psychologist.crp}
							</ThemedText>
						</View>
					</View>

					<TouchableOpacity
						onPress={() => setIsPickerVisible(true)}
						style={[styles.iconButton, {backgroundColor: tintColor + '15'}]}
					>
						<IconSymbol name="arrow.2.squarepath" size={20} color={tintColor}/>
					</TouchableOpacity>
				</View>
			);
		}

		return (
			<View style={styles.emptyStateContainer}>
				<ThemedText style={{color: mutedColor, fontStyle: 'italic', flex: 1}}>
					{MESSAGES.NO_PSYCHOLOGIST}
				</ThemedText>
				<TouchableOpacity
					onPress={() => setIsPickerVisible(true)}
					style={[styles.iconButton, {backgroundColor: tintColor + '15'}]}
				>
					<IconSymbol name="plus" size={20} color={tintColor}/>
				</TouchableOpacity>
			</View>
		);
	};

	const renderPendingRequest = () => {
		if (!profile?.hasPendingLinkRequest || !profile.pendingPsychologist) return null;

		return (
			<View style={[styles.pendingCard, {borderColor: warningColor, backgroundColor: warningColor + '14'}]}>
				<View style={styles.pendingHeader}>
					<IconSymbol name="clock.fill" size={16} color={warningColor}/>
					<ThemedText style={[styles.pendingTitle, {color: warningColor}]}>{MESSAGES.PENDING_TITLE}</ThemedText>
				</View>
				<View style={styles.pendingContent}>
					<View style={{marginRight: 12}}>
						<Avatar
							uri={profile.pendingPsychologist.profilePictureUrl}
							size={40}
							editable={false}
							name={profile.pendingPsychologist.name}
						/>
					</View>
					<View style={{flex: 1}}>
						<ThemedText style={styles.psychologistName} numberOfLines={1}>
							{profile.pendingPsychologist.name}
						</ThemedText>
						<ThemedText style={[styles.crp, {color: mutedColor}]}>
							CRP: {profile.pendingPsychologist.crp}
						</ThemedText>
						<ThemedText style={[styles.pendingDescription, {color: mutedColor}]}>
							{MESSAGES.PENDING_MESSAGE}
						</ThemedText>
					</View>
				</View>
			</View>
		);
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
						<ThemedText type="title" style={styles.name} numberOfLines={1}>
							{profile?.name}
						</ThemedText>
					</View>

					<View style={styles.section}>
						<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>
							{MESSAGES.SECTION_TITLE}
						</ThemedText>

						{renderPendingRequest()}

						<View
							style={[
								styles.card,
								{
									backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
									borderColor: borderColor,
								},
							]}
						>
							{renderPsychologistInfo()}
						</View>
					</View>

					<TouchableOpacity
						style={[styles.logoutButton, {borderColor: '#EF4444'}]}
						onPress={signOut}
					>
						<IconSymbol name="arrow.right.square" size={20} color="#EF4444"/>
						<ThemedText style={styles.logoutText}>{MESSAGES.LOGOUT}</ThemedText>
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

// ============= STYLES =============
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
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
	},
	pendingCard: {
		padding: 14,
		borderRadius: 14,
		borderWidth: 1,
		marginBottom: 12,
	},
	pendingHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	pendingTitle: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
	},
	pendingContent: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	pendingDescription: {
		fontSize: 12,
		marginTop: 2,
	},
	psychologistContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	psychologistInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},
	emptyStateContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
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
