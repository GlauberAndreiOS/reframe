import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ThemedText, ThemedView, AnimatedEntry, IconSymbol, AmbientBackground, Avatar} from '@/components';
import {useAuth, useToast} from '@/context';
import {useThemeColor, useColorScheme} from '@/hooks';
import {api} from '@/services';

// ============= TYPES & INTERFACES =============
interface PsychologistProfile {
	id: number;
	name: string;
	crp: string;
	email: string;
	profilePictureUrl?: string;
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_PROFILE: '/Psychologist/profile',
	UPLOAD_PICTURE: '/Profile/upload-picture',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar o perfil.',
	UPLOAD_SUCCESS: 'Foto de perfil atualizada!',
	UPLOAD_ERROR: 'Erro ao atualizar foto.',
	LOGOUT: 'Sair da conta',
	SECTION_TITLE: 'INFORMAÇÕES PROFISSIONAIS',
	LABEL_CRP: 'CRP',
	LABEL_EMAIL: 'Email',
} as const;

const ICON_BOX_SIZE = 40;
const ICON_BOX_RADIUS = 12;
const DIVIDER_MARGIN_LEFT = 72;

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

	// ============= STATE =============
	const [profile, setProfile] = useState<PsychologistProfile | null>(null);
	const [loading, setLoading] = useState(true);

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

	const handleUpload = (formData: any) => {
		api.post(API_ENDPOINTS.UPLOAD_PICTURE, formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
				Authorization: `Bearer ${token}`,
			},
		})
			.then((response) => {
				if (profile) {
					setProfile({...profile, profilePictureUrl: response.data.url});
				}
				showToast(MESSAGES.UPLOAD_SUCCESS, 'success');
			})
			.catch((error) => {
				console.error('Upload error:', error);
				showToast(MESSAGES.UPLOAD_ERROR, 'error');
			});
	};

	// ============= RENDER FUNCTIONS =============
	const renderProfessionalInfo = () => (
		<View
			style={[
				styles.card,
				{
					backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
					borderColor: borderColor,
				},
			]}
		>
			<View style={styles.infoRow}>
				<View style={[styles.iconBox, {backgroundColor: tintColor + '15'}]}>
					<IconSymbol name="doc.text.fill" size={18} color={tintColor}/>
				</View>
				<View>
					<ThemedText style={styles.label}>{MESSAGES.LABEL_CRP}</ThemedText>
					<ThemedText style={styles.value}>{profile?.crp}</ThemedText>
				</View>
			</View>

			<View style={[styles.divider, {backgroundColor: borderColor}]}/>

			<View style={styles.infoRow}>
				<View style={[styles.iconBox, {backgroundColor: tintColor + '15'}]}>
					<IconSymbol name="envelope.fill" size={18} color={tintColor}/>
				</View>
				<View>
					<ThemedText style={styles.label}>{MESSAGES.LABEL_EMAIL}</ThemedText>
					<ThemedText style={styles.value}>{profile?.email}</ThemedText>
				</View>
			</View>
		</View>
	);

	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={tintColor}/>
			</ThemedView>
		);
	}

	// ============= RENDER =============
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
						{renderProfessionalInfo()}
					</View>

					<TouchableOpacity
						style={[styles.logoutButton, {borderColor: '#EF4444'}]}
						onPress={signOut}
					>
						<IconSymbol name="arrow.right.square" size={20} color="#EF4444"/>
						<ThemedText style={styles.logoutText}>{MESSAGES.LOGOUT}</ThemedText>
					</TouchableOpacity>
				</AnimatedEntry>
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
		width: ICON_BOX_SIZE,
		height: ICON_BOX_SIZE,
		borderRadius: ICON_BOX_RADIUS,
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
		marginLeft: DIVIDER_MARGIN_LEFT,
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
