import React, {useCallback, useEffect, useState} from 'react';
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import {useRouter} from 'expo-router';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {
	ThemedText,
	ThemedView,
	AnimatedEntry,
	IconSymbol,
	PsychologistPickerModal,
	AmbientBackground,
	Avatar,
	GlassInput,
	LabeledField,
	BiologicalSexRadio,
	SectionTooltip,
} from '@/components';
import {useAuth, useToast} from '@/context';
import {useThemeColor, useColorScheme} from '@/hooks';
import {api} from '@/services';
import type {PatientDocumentDto} from '@/services';
import {
	maskCPF,
	maskDate,
	maskZipCode,
	unmaskCPF,
	unmaskZipCode,
	BIOLOGICAL_SEX_LABELS,
	formatDateToMask,
	toIsoDate,
} from '@/utils';

interface PatientProfile {
	id: string;
	name: string;
	profilePictureUrl?: string;
	birthDate?: string | null;
	street?: string | null;
	addressNumber?: string | null;
	addressComplement?: string | null;
	neighborhood?: string | null;
	city?: string | null;
	state?: string | null;
	zipCode?: string | null;
	cpf?: string | null;
	biologicalSex?: number | null;
	documents?: PatientDocumentDto[] | null;
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

const API_ENDPOINTS = {
	GET_PROFILE: '/Patient/profile',
	PUT_PROFILE: '/Patient/profile',
	UPLOAD_PICTURE: '/Profile/upload-picture',
	UPDATE_PSYCHOLOGIST: '/Patient/psychologist',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Nao foi possivel carregar o perfil.',
	UPLOAD_SUCCESS: 'Foto de perfil atualizada!',
	UPLOAD_ERROR: 'Erro ao atualizar foto.',
	SAVE_SUCCESS: 'Perfil atualizado com sucesso!',
	SAVE_ERROR: 'Erro ao atualizar perfil.',
	LINK_REMOVED: 'Vinculo removido com sucesso!',
	LINK_REQUESTED: 'Solicitacao de vinculo enviada com sucesso!',
	LINK_ERROR: 'Falha ao atualizar vinculo.',
	NO_PSYCHOLOGIST: 'Nenhum psicologo vinculado',
	PENDING_TITLE: 'SOLICITACAO PENDENTE',
	PENDING_MESSAGE: 'Aguardando aprovacao do psicologo',
	LOGOUT: 'Sair da conta',
	PSYCHOLOGIST_SECTION: 'PSICOLOGO VINCULADO',
	PERSONAL_SECTION: 'DADOS PESSOAIS',
	ADDRESS_SECTION: 'ENDEREÇO',
	DOCUMENTS_SECTION: 'DOCUMENTOS',
	EDIT_BUTTON: 'Editar',
	CANCEL: 'Cancelar',
	SAVE: 'Salvar',
	NOT_INFORMED: 'Nao informado',
	MODAL_PERSONAL: 'Editar dados pessoais',
	MODAL_ADDRESS: 'Editar endereco',
} as const;

const FLOATING_TABS_BOTTOM_SPACE = 30;
const SECTION_TOOLTIPS = {
	PERSONAL: 'Informacoes basicas da conta da paciente.',
	ADDRESS: 'Endereco usado no perfil e contato.',
	DOCUMENTS: 'Arquivos anexados, com acesso rapido.',
	PSYCHOLOGIST: 'Profissional vinculado e status de solicitacao.',
} as const;

export default function ProfileScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const {signOut, token} = useAuth();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const cardColor = useThemeColor({}, 'card');
	const warningColor = '#F59E0B';

	const [profile, setProfile] = useState<PatientProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isPickerVisible, setIsPickerVisible] = useState(false);

	const [isPersonalModalVisible, setIsPersonalModalVisible] = useState(false);
	const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);

	const [name, setName] = useState('');
	const [birthDate, setBirthDate] = useState('');
	const [cpf, setCpf] = useState('');
	const [biologicalSex, setBiologicalSex] = useState('');
	const [street, setStreet] = useState('');
	const [addressNumber, setAddressNumber] = useState('');
	const [addressComplement, setAddressComplement] = useState('');
	const [neighborhood, setNeighborhood] = useState('');
	const [city, setCity] = useState('');
	const [state, setState] = useState('');
	const [zipCode, setZipCode] = useState('');
	const [isLoadingZipCode, setIsLoadingZipCode] = useState(false);

	const hydrateForm = (nextProfile: PatientProfile) => {
		setName(nextProfile.name || '');
		setBirthDate(formatDateToMask(nextProfile.birthDate));
		setCpf(maskCPF(nextProfile.cpf || ''));
		setBiologicalSex(nextProfile.biologicalSex === null || nextProfile.biologicalSex === undefined ? '' : String(nextProfile.biologicalSex));
		setStreet(nextProfile.street || '');
		setAddressNumber(nextProfile.addressNumber || '');
		setAddressComplement(nextProfile.addressComplement || '');
		setNeighborhood(nextProfile.neighborhood || '');
		setCity(nextProfile.city || '');
		setState((nextProfile.state || '').toUpperCase());
		setZipCode(maskZipCode(nextProfile.zipCode || ''));
	};

	const fetchProfile = useCallback(() => {
		api.get(API_ENDPOINTS.GET_PROFILE)
			.then((response) => {
				setProfile(response.data);
				hydrateForm(response.data);
			})
			.catch((error) => {
				console.error('Failed to fetch profile:', error);
				showToast(MESSAGES.LOAD_ERROR, 'error');
			})
			.finally(() => {
				setLoading(false);
			});
	}, [showToast]);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	const handleZipCodeLookup = useCallback(() => {
		const digits = unmaskZipCode(zipCode);
		if (digits.length !== 8) return;

		setIsLoadingZipCode(true);
		api.get(`/Profile/zip-code/${digits}`)
			.then((response) => {
				const data = response.data;
				setZipCode(maskZipCode(data.cep || digits));
				setStreet(data.logradouro || '');
				setAddressComplement(data.complemento || addressComplement);
				setNeighborhood(data.bairro || '');
				setCity(data.cidade || '');
				setState((data.estado || '').toUpperCase());
				showToast('Endereço preenchido pelo CEP.', 'success');
			})
			.catch((error) => {
				console.error('CEP lookup failed:', error);
			})
			.finally(() => {
				setIsLoadingZipCode(false);
			});
	}, [addressComplement, showToast, zipCode]);

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

	const handleSaveProfile = async (closeModal: () => void) => {
		setSaving(true);
		try {
			await api.put(API_ENDPOINTS.PUT_PROFILE, {
				name,
				birthDate: toIsoDate(birthDate),
				cpf: unmaskCPF(cpf) || null,
				biologicalSex: biologicalSex === '' ? null : Number(biologicalSex),
				street: street || null,
				addressNumber: addressNumber || null,
				addressComplement: addressComplement || null,
				neighborhood: neighborhood || null,
				city: city || null,
				state: state.toUpperCase() || null,
				zipCode: unmaskZipCode(zipCode) || null,
			});
			showToast(MESSAGES.SAVE_SUCCESS, 'success');
			closeModal();
			fetchProfile();
		} catch (error) {
			console.error('Failed to update profile:', error);
			showToast(MESSAGES.SAVE_ERROR, 'error');
		} finally {
			setSaving(false);
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

	const getDocumentsCount = (): number => profile?.documents?.length ?? 0;
	const getLastUploadText = (): string => {
		const docs = profile?.documents ?? [];
		if (!docs.length) return MESSAGES.NOT_INFORMED;
		const sorted = [...docs].sort((a, b) => new Date(b.uploadedAtUtc).getTime() - new Date(a.uploadedAtUtc).getTime());
		return new Date(sorted[0].uploadedAtUtc).toLocaleString('pt-BR');
	};

	const formatAddress = (): string => {
		const line1 = [street, addressNumber, addressComplement].filter(Boolean).join(', ');
		const line2 = [neighborhood, city, state, zipCode].filter(Boolean).join(' - ');
		const result = [line1, line2].filter(Boolean).join('\n');
		return result || MESSAGES.NOT_INFORMED;
	};

	const zipCodeAdornment = (
		<View style={styles.zipCodeAdornment}>
			{isLoadingZipCode ? <ActivityIndicator size="small" color={tintColor}/> : null}
		</View>
	);

	const renderInfoRow = (label: string, value?: string | null) => (
		<View style={styles.infoRow}>
			<ThemedText style={[styles.infoLabel, {color: mutedColor}]}>{label}</ThemedText>
			<ThemedText style={styles.infoValue}>{value || MESSAGES.NOT_INFORMED}</ThemedText>
		</View>
	);

	const renderCardHeader = (title: string, tooltipMessage: string, onEdit?: () => void) => (
		<View style={styles.cardHeader}>
			<View style={styles.cardTitleRow}>
				<ThemedText style={[styles.cardTitle, {color: mutedColor}]}>{title}</ThemedText>
				<SectionTooltip
					message={tooltipMessage}
					mutedColor={mutedColor}
					borderColor={borderColor}
					isDark={isDark}
				/>
			</View>
			{onEdit ? (
				<TouchableOpacity style={[styles.smallEditButton, {borderColor: tintColor}]} onPress={onEdit}>
					<ThemedText style={[styles.smallEditButtonText, {color: tintColor}]}>{MESSAGES.EDIT_BUTTON}</ThemedText>
				</TouchableOpacity>
			) : null}
		</View>
	);

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
							<ThemedText style={[styles.crp, {color: mutedColor}]}>CRP: {profile.psychologist.crp}</ThemedText>
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
				<ThemedText style={{color: mutedColor, fontStyle: 'italic', flex: 1}}>{MESSAGES.NO_PSYCHOLOGIST}</ThemedText>
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
						<ThemedText style={styles.psychologistName} numberOfLines={1}>{profile.pendingPsychologist.name}</ThemedText>
						<ThemedText style={[styles.crp, {color: mutedColor}]}>CRP: {profile.pendingPsychologist.crp}</ThemedText>
						<ThemedText style={[styles.pendingDescription, {color: mutedColor}]}>{MESSAGES.PENDING_MESSAGE}</ThemedText>
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
					<ScrollView contentContainerStyle={{paddingBottom: insets.bottom + FLOATING_TABS_BOTTOM_SPACE}}>
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
							<ThemedText type="title" style={styles.name} numberOfLines={1}>{profile?.name}</ThemedText>
						</View>

						<View style={[styles.card, {backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor, borderColor}]}>
							{renderCardHeader(MESSAGES.PERSONAL_SECTION, SECTION_TOOLTIPS.PERSONAL, () => setIsPersonalModalVisible(true))}
							{renderInfoRow('Nome', name)}
							{renderInfoRow('Aniversario', birthDate || MESSAGES.NOT_INFORMED)}
							{renderInfoRow('CPF', cpf || MESSAGES.NOT_INFORMED)}
							{renderInfoRow('Sexo biologico', BIOLOGICAL_SEX_LABELS[biologicalSex] || MESSAGES.NOT_INFORMED)}
						</View>

						<View style={[styles.card, {backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor, borderColor}]}>
							{renderCardHeader(MESSAGES.ADDRESS_SECTION, SECTION_TOOLTIPS.ADDRESS, () => setIsAddressModalVisible(true))}
							{renderInfoRow('Localizacao', formatAddress())}
						</View>

						<View style={[styles.card, {backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor, borderColor}]}>
							{renderCardHeader(MESSAGES.DOCUMENTS_SECTION, SECTION_TOOLTIPS.DOCUMENTS, () => router.push('/(patient)/documents'))}
							{renderInfoRow('Total de documentos', String(getDocumentsCount()))}
							{renderInfoRow('Ultimo upload', getLastUploadText())}
						</View>

						<View style={styles.section}>
							{renderPendingRequest()}
							<View style={[styles.card, {backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor, borderColor}]}>
								{renderCardHeader(MESSAGES.PSYCHOLOGIST_SECTION, SECTION_TOOLTIPS.PSYCHOLOGIST)}
								{renderPsychologistInfo()}
							</View>
						</View>

						<TouchableOpacity style={[styles.logoutButton, {borderColor: '#EF4444'}]} onPress={signOut}>
							<IconSymbol name="arrow.right.square" size={20} color="#EF4444"/>
							<ThemedText style={styles.logoutText}>{MESSAGES.LOGOUT}</ThemedText>
						</TouchableOpacity>
					</ScrollView>
				</AnimatedEntry>

				<Modal visible={isPersonalModalVisible} animationType="slide" transparent onRequestClose={() => setIsPersonalModalVisible(false)}>
					<View style={styles.modalOverlay}>
						<View style={[styles.modalCard, {backgroundColor: isDark ? '#1f1f1f' : '#ffffff'}]}>
							<ThemedText type="subtitle" style={styles.modalTitle}>{MESSAGES.MODAL_PERSONAL}</ThemedText>
							<ScrollView contentContainerStyle={styles.modalForm}>
								<LabeledField label="Nome" labelColor={mutedColor}>
									<GlassInput placeholder="Nome" value={name} onChangeText={setName}/>
								</LabeledField>
								<LabeledField label="Aniversario" labelColor={mutedColor}>
									<GlassInput
										placeholder="Aniversario (DD/MM/AAAA)"
										value={birthDate}
										onChangeText={(text) => setBirthDate(maskDate(text))}
										keyboardType="numeric"
										maxLength={10}
									/>
								</LabeledField>
								<LabeledField label="CPF" labelColor={mutedColor}>
									<GlassInput
										placeholder="CPF"
										value={cpf}
										onChangeText={(text) => setCpf(maskCPF(text))}
										keyboardType="numeric"
										maxLength={14}
									/>
								</LabeledField>
								<LabeledField label="Sexo biologico" labelColor={mutedColor}>
									<BiologicalSexRadio
										value={biologicalSex}
										onChange={setBiologicalSex}
										tintColor={tintColor}
										borderColor={borderColor}
										mutedColor={mutedColor}
										isDark={isDark}
									/>
								</LabeledField>
							</ScrollView>
							<View style={[styles.modalActions, {paddingBottom: insets.bottom}]}>
								<TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsPersonalModalVisible(false)}>
									<ThemedText style={styles.cancelButtonText}>{MESSAGES.CANCEL}</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.modalButton, {backgroundColor: tintColor}, saving && {opacity: 0.6}]}
									onPress={() => handleSaveProfile(() => setIsPersonalModalVisible(false))}
									disabled={saving}
								>
									<ThemedText style={styles.saveText}>{saving ? 'Salvando...' : MESSAGES.SAVE}</ThemedText>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>

				<Modal visible={isAddressModalVisible} animationType="slide" transparent onRequestClose={() => setIsAddressModalVisible(false)}>
					<View style={styles.modalOverlay}>
						<View style={[styles.modalCard, {backgroundColor: isDark ? '#1f1f1f' : '#ffffff'}]}>
							<ThemedText type="subtitle" style={styles.modalTitle}>{MESSAGES.MODAL_ADDRESS}</ThemedText>
							<ScrollView contentContainerStyle={styles.modalForm}>
								<LabeledField label="CEP" labelColor={mutedColor}>
									<GlassInput
										placeholder="CEP"
										value={zipCode}
										onChangeText={(text) => setZipCode(maskZipCode(text))}
										onBlur={handleZipCodeLookup}
										keyboardType="numeric"
										maxLength={9}
										rightAdornment={zipCodeAdornment}
									/>
								</LabeledField>
								<LabeledField label="Logradouro" labelColor={mutedColor}><GlassInput placeholder="Logradouro" value={street} onChangeText={setStreet}/></LabeledField>
								<LabeledField label="Numero" labelColor={mutedColor}><GlassInput placeholder="Numero" value={addressNumber} onChangeText={setAddressNumber}/></LabeledField>
								<LabeledField label="Complemento" labelColor={mutedColor}><GlassInput placeholder="Complemento" value={addressComplement} onChangeText={setAddressComplement}/></LabeledField>
								<LabeledField label="Bairro" labelColor={mutedColor}><GlassInput placeholder="Bairro" value={neighborhood} onChangeText={setNeighborhood}/></LabeledField>
								<LabeledField label="Cidade" labelColor={mutedColor}><GlassInput placeholder="Cidade" value={city} onChangeText={setCity}/></LabeledField>
								<LabeledField label="Estado (UF)" labelColor={mutedColor}>
									<GlassInput placeholder="Estado (UF)" value={state} onChangeText={(text) => setState(text.toUpperCase().slice(0, 2))} maxLength={2}/>
								</LabeledField>
							</ScrollView>
							<View style={[styles.modalActions, {paddingBottom: insets.bottom}]}>
								<TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsAddressModalVisible(false)}>
									<ThemedText style={styles.cancelButtonText}>{MESSAGES.CANCEL}</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.modalButton, {backgroundColor: tintColor}, saving && {opacity: 0.6}]}
									onPress={() => handleSaveProfile(() => setIsAddressModalVisible(false))}
									disabled={saving}
								>
									<ThemedText style={styles.saveText}>{saving ? 'Salvando...' : MESSAGES.SAVE}</ThemedText>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>

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
	container: {flex: 1},
	safeArea: {flex: 1},
	loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
	content: {flex: 1, padding: 24},
	header: {alignItems: 'center', marginBottom: 20},
	name: {marginBottom: 8, textAlign: 'center'},
	section: {marginBottom: 16},
	card: {padding: 16, borderRadius: 16, borderWidth: 1, gap: 10, marginBottom: 14},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	cardTitle: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.7,
		textTransform: 'uppercase',
	},
	cardTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	smallEditButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderWidth: 1,
		borderRadius: 10,
	},
	smallEditButtonText: {
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
	},
	pendingCard: {padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12},
	pendingHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10},
	pendingTitle: {fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase'},
	pendingContent: {flexDirection: 'row', alignItems: 'center'},
	pendingDescription: {fontSize: 12, marginTop: 2},
	psychologistContainer: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
	psychologistInfo: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12},
	emptyStateContainer: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
	psychologistName: {fontSize: 16, fontWeight: '600'},
	crp: {fontSize: 12},
	infoRow: {marginBottom: 6},
	infoLabel: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4},
	infoValue: {fontSize: 14, lineHeight: 20},
	iconButton: {width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center'},
	logoutButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		gap: 8,
		marginTop: 8,
	},
	logoutText: {color: '#EF4444', fontWeight: '600'},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		maxHeight: '88%',
	},
	modalTitle: {
		textAlign: 'center',
		marginBottom: 14,
	},
	modalForm: {
		gap: 12,
		paddingBottom: 10,
	},
	modalActions: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 16,
	},
	modalButton: {
		flex: 1,
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelButton: {
		backgroundColor: '#e5e7eb',
	},
	cancelButtonText: {
		color: '#111827',
		fontWeight: '700',
	},
	saveText: {color: '#fff', fontWeight: '700'},
	zipCodeAdornment: {
		width: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
