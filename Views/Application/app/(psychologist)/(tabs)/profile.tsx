import React, {useCallback, useEffect, useState} from 'react';
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {
	ThemedText,
	ThemedView,
	AnimatedEntry,
	IconSymbol,
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
import {
	maskCPF,
	maskDate,
	maskPhone,
	maskZipCode,
	unmaskCPF,
	unmaskPhone,
	unmaskZipCode,
	BIOLOGICAL_SEX_LABELS,
	formatDateToMask,
	toIsoDate,
} from '@/utils';

interface PsychologistProfile {
	id: string;
	name: string;
	crp: string;
	email: string;
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
	sessionDurationMinutes?: number | null;
	businessPhone?: string | null;
	specialty?: string | null;
	presentationText?: string | null;
}

const API_ENDPOINTS = {
	GET_PROFILE: '/Psychologist/profile',
	PUT_PROFILE: '/Psychologist/profile',
	UPLOAD_PICTURE: '/Profile/upload-picture',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Nao foi possivel carregar o perfil.',
	UPLOAD_SUCCESS: 'Foto de perfil atualizada!',
	UPLOAD_ERROR: 'Erro ao atualizar foto.',
	SAVE_SUCCESS: 'Perfil atualizado com sucesso!',
	SAVE_ERROR: 'Erro ao atualizar perfil.',
	LOGOUT: 'Sair da conta',
	PROFESSIONAL_SECTION: 'INFORMACOES PROFISSIONAIS',
	PERSONAL_SECTION: 'DADOS PESSOAIS',
	ADDRESS_SECTION: 'ENDEREÇO',
	EDIT_BUTTON: 'Editar',
	CANCEL: 'Cancelar',
	SAVE: 'Salvar',
	NOT_INFORMED: 'Nao informado',
	MODAL_PERSONAL: 'Editar dados pessoais',
	MODAL_ADDRESS: 'Editar endereço',
	MODAL_PROFESSIONAL: 'Editar dados profissionais',
} as const;
const FLOATING_TABS_BOTTOM_SPACE = 30;
const SECTION_TOOLTIPS = {
	PERSONAL: 'Informacoes basicas do profissional.',
	ADDRESS: 'Endereço utilizado para contato e cadastro.',
	PROFESSIONAL: 'Dados de atendimento e apresentacao clinica.',
} as const;

export default function ProfileScreen() {
	const insets = useSafeAreaInsets();
	const {signOut, token} = useAuth();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const cardColor = useThemeColor({}, 'card');

	const [profile, setProfile] = useState<PsychologistProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [isPersonalModalVisible, setIsPersonalModalVisible] = useState(false);
	const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
	const [isProfessionalModalVisible, setIsProfessionalModalVisible] = useState(false);

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
	const [sessionDurationMinutes, setSessionDurationMinutes] = useState('');
	const [businessPhone, setBusinessPhone] = useState('');
	const [specialty, setSpecialty] = useState('');
	const [presentationText, setPresentationText] = useState('');

	const hydrateForm = (nextProfile: PsychologistProfile) => {
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
		setSessionDurationMinutes(nextProfile.sessionDurationMinutes === null || nextProfile.sessionDurationMinutes === undefined ? '' : String(nextProfile.sessionDurationMinutes));
		setBusinessPhone(maskPhone(nextProfile.businessPhone || ''));
		setSpecialty(nextProfile.specialty || '');
		setPresentationText(nextProfile.presentationText || '');
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
				sessionDurationMinutes: sessionDurationMinutes === '' ? null : Number(sessionDurationMinutes),
				businessPhone: unmaskPhone(businessPhone) || null,
				specialty: specialty || null,
				presentationText: presentationText || null,
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

	const renderCardHeader = (title: string, tooltipMessage: string, onEdit: () => void) => (
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
			<TouchableOpacity style={[styles.smallEditButton, {borderColor: tintColor}]} onPress={onEdit}>
				<ThemedText style={[styles.smallEditButtonText, {color: tintColor}]}>{MESSAGES.EDIT_BUTTON}</ThemedText>
			</TouchableOpacity>
		</View>
	);

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
							{renderCardHeader(MESSAGES.PROFESSIONAL_SECTION, SECTION_TOOLTIPS.PROFESSIONAL, () => setIsProfessionalModalVisible(true))}
							{renderInfoRow('CRP', profile?.crp)}
							{renderInfoRow('Email', profile?.email)}
							{renderInfoRow('Duracao da sessao (min)', sessionDurationMinutes || MESSAGES.NOT_INFORMED)}
							{renderInfoRow('Telefone comercial', businessPhone || MESSAGES.NOT_INFORMED)}
							{renderInfoRow('Especialidade', specialty || MESSAGES.NOT_INFORMED)}
							{renderInfoRow('Apresentacao', presentationText || MESSAGES.NOT_INFORMED)}
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

				<Modal visible={isProfessionalModalVisible} animationType="slide" transparent onRequestClose={() => setIsProfessionalModalVisible(false)}>
					<View style={styles.modalOverlay}>
						<View style={[styles.modalCard, {backgroundColor: isDark ? '#1f1f1f' : '#ffffff'}]}>
							<ThemedText type="subtitle" style={styles.modalTitle}>{MESSAGES.MODAL_PROFESSIONAL}</ThemedText>
							<ScrollView contentContainerStyle={styles.modalForm}>
								<LabeledField label="Duracao da sessao (min)" labelColor={mutedColor}>
									<GlassInput
										placeholder="Duracao da sessao (min)"
										value={sessionDurationMinutes}
										onChangeText={(text) => setSessionDurationMinutes(text.replace(/\D/g, '').slice(0, 3))}
										keyboardType="numeric"
									/>
								</LabeledField>
								<LabeledField label="Telefone comercial" labelColor={mutedColor}>
									<GlassInput
										placeholder="Telefone comercial"
										value={businessPhone}
										onChangeText={(text) => setBusinessPhone(maskPhone(text))}
										keyboardType="phone-pad"
										maxLength={15}
									/>
								</LabeledField>
								<LabeledField label="Especialidade" labelColor={mutedColor}><GlassInput placeholder="Especialidade" value={specialty} onChangeText={setSpecialty}/></LabeledField>
								<LabeledField label="Texto de apresentacao" labelColor={mutedColor}>
									<GlassInput placeholder="Texto de apresentacao" value={presentationText} onChangeText={setPresentationText} multiline/>
								</LabeledField>
							</ScrollView>
							<View style={[styles.modalActions, {paddingBottom: insets.bottom}]}>
								<TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsProfessionalModalVisible(false)}>
									<ThemedText style={styles.cancelButtonText}>{MESSAGES.CANCEL}</ThemedText>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.modalButton, {backgroundColor: tintColor}, saving && {opacity: 0.6}]}
									onPress={() => handleSaveProfile(() => setIsProfessionalModalVisible(false))}
									disabled={saving}
								>
									<ThemedText style={styles.saveText}>{saving ? 'Salvando...' : MESSAGES.SAVE}</ThemedText>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>
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
	infoRow: {marginBottom: 6},
	infoLabel: {fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4},
	infoValue: {fontSize: 14, lineHeight: 20},
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
