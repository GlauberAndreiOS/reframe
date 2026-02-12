import React, {useCallback, useEffect, useState} from 'react';
import {
	ActivityIndicator,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import {useRouter} from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {api} from '@/services';
import {
	ThemedView,
	AmbientBackground,
	GlassInput,
	AnimatedEntry,
	Avatar,
} from '@/components';
import type {HelperTextType} from '@/components';
import {useThemeColor, useColorScheme} from '@/hooks';
import {useToast} from '@/context';
import {maskCPF, maskDate, maskPhone, unmaskCPF, unmaskPhone} from '@/utils';

type UserType = 'patient' | 'psychologist' | null;
type RegistrationStep = 0 | 1 | 2 | 3 | 4 | 5;

interface Psychologist {
	id: string;
	name: string;
	crp: string;
	email: string;
	profilePictureUrl?: string;
}

interface HelperMessage {
	text: string;
	type: HelperTextType;
}

interface RegistrationFormState {
	username: string;
	password: string;
	confirmPassword: string;
	name: string;
	birthDate: string;
	cpf: string;
	biologicalSex: string;
	street: string;
	addressNumber: string;
	addressComplement: string;
	neighborhood: string;
	city: string;
	state: string;
	zipCode: string;
	crp: string;
	uf: string;
	sessionDurationMinutes: string;
	businessPhone: string;
	specialty: string;
	presentationText: string;
}

interface PsychologistFilterState {
	searchQuery: string;
	selectedPsychologistId: string | null;
}

const REGISTRATION_STEPS = {
	AUTH: 0,
	COMMON_DATA: 1,
	ADDRESS: 2,
	USER_TYPE: 3,
	RECORD_IMPORT: 4,
	FINAL: 5,
} as const;

const USER_TYPES = {
	PATIENT: 'patient' as const,
	PSYCHOLOGIST: 'psychologist' as const,
} as const;

const BIOLOGICAL_SEX = {
	FEMALE: '0',
	MALE: '1',
	INTERSEX: '2',
	NOT_INFORMED: '3',
} as const;

const BIOLOGICAL_SEX_OPTIONS = [
	{value: BIOLOGICAL_SEX.FEMALE, label: 'Mulher'},
	{value: BIOLOGICAL_SEX.MALE, label: 'Homem'},
	{value: BIOLOGICAL_SEX.INTERSEX, label: 'Intersexo'},
	{value: BIOLOGICAL_SEX.NOT_INFORMED, label: 'Prefiro não informar'},
] as const;

const VALIDATION_MESSAGES = {
	FILL_ALL_FIELDS: 'Preencha os campos obrigatórios.',
	INVALID_EMAIL: 'Insira um e-mail válido.',
	EMAIL_TAKEN: 'E-mail já cadastrado.',
	EMAIL_AVAILABLE: 'E-mail disponível!',
	PASSWORDS_DONT_MATCH: 'As senhas não coincidem.',
	SELECT_USER_TYPE: 'Selecione um tipo de usuário.',
	FILL_PROFESSIONAL_DATA: 'Preencha CRP e UF.',
	REGISTRATION_SUCCESS: 'Cadastro realizado com sucesso!',
	REGISTRATION_ERROR: 'Falha ao realizar cadastro.',
	PSYCHOLOGISTS_ERROR: 'Não foi possível carregar a lista de psicólogos.',
} as const;

const CRP_FORMAT = {
	MAX_LENGTH: 8,
	SEPARATOR: '/',
	DIGITS_BEFORE_SEPARATOR: 2,
	DIGITS_AFTER_SEPARATOR: 5,
} as const;

const UF_MAX_LENGTH = 2;
const REDIRECT_DELAY_MS = 1500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): boolean => EMAIL_REGEX.test(email);

const formatCrpNumber = (text: string): string => {
	const cleanedDigits = text.replace(/\D/g, '');
	if (cleanedDigits.length > CRP_FORMAT.DIGITS_BEFORE_SEPARATOR) {
		const beforeSeparator = cleanedDigits.slice(0, CRP_FORMAT.DIGITS_BEFORE_SEPARATOR);
		const afterSeparator = cleanedDigits.slice(CRP_FORMAT.DIGITS_BEFORE_SEPARATOR);
		return `${beforeSeparator}${CRP_FORMAT.SEPARATOR}${afterSeparator}`;
	}
	return cleanedDigits;
};

const maskZipCode = (value: string): string => {
	const digits = value.replace(/\D/g, '').slice(0, 8);
	if (digits.length <= 5) return digits;
	return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const toIsoDate = (maskedDate: string): string | null => {
	if (!maskedDate) return null;
	const parts = maskedDate.split('/');
	if (parts.length !== 3) return null;
	const [day, month, year] = parts;
	if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
	return `${year}-${month}-${day}`;
};

const buildCommonPayload = (form: RegistrationFormState) => ({
	name: form.name || null,
	birthDate: toIsoDate(form.birthDate),
	cpf: unmaskCPF(form.cpf) || null,
	biologicalSex: form.biologicalSex ? Number(form.biologicalSex) : null,
	street: form.street || null,
	addressNumber: form.addressNumber || null,
	addressComplement: form.addressComplement || null,
	neighborhood: form.neighborhood || null,
	city: form.city || null,
	state: form.state || null,
	zipCode: form.zipCode || null,
});

const buildPsychologistRegistrationPayload = (form: RegistrationFormState) => ({
	username: form.username,
	password: form.password,
	userType: 0,
	crpNumber: form.crp.split(CRP_FORMAT.SEPARATOR)[0],
	crpUf: form.uf,
	...buildCommonPayload(form),
	sessionDurationMinutes: form.sessionDurationMinutes ? Number(form.sessionDurationMinutes) : null,
	businessPhone: unmaskPhone(form.businessPhone) || null,
	specialty: form.specialty || null,
	presentationText: form.presentationText || null,
});

const buildPatientRegistrationPayload = (form: RegistrationFormState, psychologistId: string | null) => ({
	username: form.username,
	password: form.password,
	userType: 1,
	psychologistId,
	...buildCommonPayload(form),
});

const handleRegistrationError = (error: any): string => {
	if (error.response?.data) {
		return typeof error.response.data === 'string'
			? error.response.data
			: VALIDATION_MESSAGES.REGISTRATION_ERROR;
	}
	return VALIDATION_MESSAGES.REGISTRATION_ERROR;
};

const handleApiError = (error: any): string => {
	if (error.response?.data) {
		return typeof error.response.data === 'string'
			? error.response.data
			: VALIDATION_MESSAGES.PSYCHOLOGISTS_ERROR;
	}
	return VALIDATION_MESSAGES.PSYCHOLOGISTS_ERROR;
};

export default function Register() {
	const router = useRouter();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const textColor = useThemeColor({}, 'text');

	const [currentStep, setCurrentStep] = useState<RegistrationStep>(REGISTRATION_STEPS.AUTH);
	const [userType, setUserType] = useState<UserType>(null);
	const [selectedExternalRecordFile, setSelectedExternalRecordFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
	const [selectedObstetricFile, setSelectedObstetricFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

	const [formData, setFormData] = useState<RegistrationFormState>({
		username: '',
		password: '',
		confirmPassword: '',
		name: '',
		birthDate: '',
		cpf: '',
		biologicalSex: '',
		street: '',
		addressNumber: '',
		addressComplement: '',
		neighborhood: '',
		city: '',
		state: '',
		zipCode: '',
		crp: '',
		uf: '',
		sessionDurationMinutes: '',
		businessPhone: '',
		specialty: '',
		presentationText: '',
	});

	const [usernameHelper, setUsernameHelper] = useState<HelperMessage | null>(null);
	const [passwordHelper, setPasswordHelper] = useState<HelperMessage | null>(null);
	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const [isLoadingZipCode, setIsLoadingZipCode] = useState(false);
	const [isRegistering, setIsRegistering] = useState(false);

	const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
	const [isLoadingPsychologists, setIsLoadingPsychologists] = useState(false);
	const [filterState, setFilterState] = useState<PsychologistFilterState>({
		searchQuery: '',
		selectedPsychologistId: null,
	});

	const updateFormData = (updates: Partial<RegistrationFormState>) => {
		setFormData(prev => ({...prev, ...updates}));
	};

	const updateFilterState = (updates: Partial<PsychologistFilterState>) => {
		setFilterState(prev => ({...prev, ...updates}));
	};

	const checkUsername = useCallback(() => {
		if (!formData.username) {
			setUsernameHelper(null);
			return;
		}

		if (!validateEmail(formData.username)) {
			setUsernameHelper({text: VALIDATION_MESSAGES.INVALID_EMAIL, type: 'error'});
			return;
		}

		setIsCheckingUsername(true);
		setUsernameHelper(null);

		api
			.get(`/Auth/check-username/${formData.username}`)
			.then(response => {
				if (response.data.exists) {
					setUsernameHelper({text: VALIDATION_MESSAGES.EMAIL_TAKEN, type: 'error'});
				} else {
					setUsernameHelper({text: VALIDATION_MESSAGES.EMAIL_AVAILABLE, type: 'success'});
				}
			})
			.catch(error => {
				console.error('Failed to check username:', error);
			})
			.finally(() => {
				setIsCheckingUsername(false);
			});
	}, [formData.username]);

	const fetchPsychologists = useCallback(() => {
		setIsLoadingPsychologists(true);

		api
			.get('/Psychologist/all')
			.then(response => {
				setPsychologists(response.data);
			})
			.catch(error => {
				console.error('Failed to fetch psychologists:', error);
				showToast(handleApiError(error), 'error');
			})
			.finally(() => {
				setIsLoadingPsychologists(false);
			});
	}, [showToast]);

	useEffect(() => {
		if (currentStep === REGISTRATION_STEPS.FINAL && userType === USER_TYPES.PATIENT) {
			fetchPsychologists();
		}
	}, [currentStep, userType, fetchPsychologists]);

	const handleZipCodeLookup = useCallback(() => {
		const digits = formData.zipCode.replace(/\D/g, '');
		if (digits.length !== 8) return;

		setIsLoadingZipCode(true);
		api.get(`/Profile/zip-code/${digits}`)
			.then((response) => {
				const data = response.data;
				updateFormData({
					zipCode: maskZipCode(data.cep || digits),
					street: data.logradouro || '',
					addressComplement: data.complemento || formData.addressComplement,
					neighborhood: data.bairro || '',
					city: data.cidade || '',
					state: data.estado || '',
				});
				showToast('Endereço preenchido pelo CEP.', 'success');
			})
			.catch((error) => {
				console.error('CEP lookup failed:', error);
			})
			.finally(() => {
				setIsLoadingZipCode(false);
			});
	}, [formData.zipCode, formData.addressComplement, showToast]);

	useEffect(() => {
		if (!formData.confirmPassword) {
			setPasswordHelper(null);
			return;
		}

		if (formData.password !== formData.confirmPassword) {
			setPasswordHelper({text: VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH, type: 'error'});
			return;
		}

		setPasswordHelper(null);
	}, [formData.password, formData.confirmPassword]);

	const validateAuthStep = (): boolean => {
		if (!formData.username || !formData.password || !formData.confirmPassword) {
			showToast(VALIDATION_MESSAGES.FILL_ALL_FIELDS, 'error');
			return false;
		}

		if (formData.password !== formData.confirmPassword) {
			showToast(VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH, 'error');
			return false;
		}

		if (usernameHelper?.type === 'error') {
			showToast(VALIDATION_MESSAGES.INVALID_EMAIL, 'error');
			return false;
		}

		return true;
	};

	const validateUserTypeStep = (): boolean => {
		if (!userType) {
			showToast(VALIDATION_MESSAGES.SELECT_USER_TYPE, 'error');
			return false;
		}
		return true;
	};

	const validatePsychologistFinalStep = useCallback((): boolean => {
		if (!formData.crp || !formData.uf) {
			showToast(VALIDATION_MESSAGES.FILL_PROFESSIONAL_DATA, 'error');
			return false;
		}
		return true;
	}, [formData.crp, formData.uf, showToast]);

	const handleNextStep = () => {
		switch (currentStep) {
		case REGISTRATION_STEPS.AUTH:
			if (validateAuthStep()) setCurrentStep(REGISTRATION_STEPS.COMMON_DATA);
			break;
		case REGISTRATION_STEPS.COMMON_DATA:
			setCurrentStep(REGISTRATION_STEPS.ADDRESS);
			break;
		case REGISTRATION_STEPS.ADDRESS:
			setCurrentStep(REGISTRATION_STEPS.USER_TYPE);
			break;
		case REGISTRATION_STEPS.USER_TYPE:
			if (validateUserTypeStep()) {
				if (userType === USER_TYPES.PSYCHOLOGIST) {
					setCurrentStep(REGISTRATION_STEPS.FINAL);
				} else {
					setCurrentStep(REGISTRATION_STEPS.RECORD_IMPORT);
				}
			}
			break;
		case REGISTRATION_STEPS.RECORD_IMPORT:
			setCurrentStep(REGISTRATION_STEPS.FINAL);
			break;
		default:
			break;
		}
	};

	const handlePreviousStep = () => {
		if (currentStep > 0) {
			if (currentStep === REGISTRATION_STEPS.FINAL && userType === USER_TYPES.PSYCHOLOGIST) {
				setCurrentStep(REGISTRATION_STEPS.USER_TYPE);
				return;
			}
			setCurrentStep((currentStep - 1) as RegistrationStep);
		}
	};

	const handleBackButton = () => {
		if (currentStep === REGISTRATION_STEPS.AUTH) {
			router.back();
			return;
		}
		handlePreviousStep();
	};

	const handleRegister = useCallback(() => {
		if (isRegistering) return;

		const uploadDocument = async (
			token: string,
			kind: 'external_record' | 'obstetric_data',
			documentFile: DocumentPicker.DocumentPickerAsset,
			displayName?: string
		) => {
			const form = new FormData();
			form.append('file', {
				uri: documentFile.uri,
				name: documentFile.name,
				type: documentFile.mimeType || 'application/octet-stream',
			} as any);
			form.append('kind', kind);
			if (displayName) form.append('displayName', displayName);

			await api.post('/Patient/documents/upload', form, {
				headers: {
					'Content-Type': 'multipart/form-data',
					Authorization: `Bearer ${token}`,
				},
			});
		};

		const uploadExternalRecordIfNeeded = async () => {
			if (userType !== USER_TYPES.PATIENT || !selectedExternalRecordFile) return;

			const loginResponse = await api.post('/Auth/login', {
				username: formData.username,
				password: formData.password,
			});

			const token = loginResponse.data?.token;
			if (!token) return;

			await uploadDocument(token, 'external_record', selectedExternalRecordFile, 'Prontuario externo');

			if (selectedObstetricFile) {
				await uploadDocument(token, 'obstetric_data', selectedObstetricFile, 'Dados obstetricos');
			}
		};

		const execute = async () => {
			if (userType === USER_TYPES.PSYCHOLOGIST && !validatePsychologistFinalStep()) {
				return;
			}

			const payload = userType === USER_TYPES.PSYCHOLOGIST
				? buildPsychologistRegistrationPayload(formData)
				: buildPatientRegistrationPayload(formData, filterState.selectedPsychologistId);

			await api.post('/Auth/register', payload);
			await uploadExternalRecordIfNeeded();
			showToast(VALIDATION_MESSAGES.REGISTRATION_SUCCESS, 'success');
			setTimeout(() => router.replace('/(auth)/login'), REDIRECT_DELAY_MS);
		};

		setIsRegistering(true);
		execute()
			.catch(error => {
				console.error('Registration error:', error);
				showToast(handleRegistrationError(error), 'error');
			})
			.finally(() => {
				setIsRegistering(false);
			});
	}, [formData, filterState.selectedPsychologistId, isRegistering, router, showToast, userType, validatePsychologistFinalStep, selectedExternalRecordFile, selectedObstetricFile]);

	const handlePickExternalRecordFile = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
				copyToCacheDirectory: true,
				multiple: false,
			});

			if (result.canceled || !result.assets?.length) return;
			setSelectedExternalRecordFile(result.assets[0]);
		} catch (error) {
			console.error('External record pick error:', error);
			showToast('Não foi possível selecionar o arquivo.', 'error');
		}
	};

	const handlePickObstetricFile = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: ['*/*'],
				copyToCacheDirectory: true,
				multiple: false,
			});

			if (result.canceled || !result.assets?.length) return;
			setSelectedObstetricFile(result.assets[0]);
		} catch (error) {
			console.error('Obstetric file pick error:', error);
			showToast('Não foi possível selecionar o arquivo obstétrico.', 'error');
		}
	};

	const renderAuthStep = () => {
		const isNextDisabled =
			!(formData.username && formData.password && formData.confirmPassword) ||
			formData.password !== formData.confirmPassword ||
			usernameHelper?.type === 'error' ||
			isCheckingUsername;

		return (
			<View style={styles.formSection}>
				<Text style={[styles.stepTitle, {color: textColor}]}>Vamos criar uma conta</Text>
				<View style={styles.inputGroup}>
					<GlassInput
						helperText={usernameHelper}
						placeholder="Email"
						keyboardType="email-address"
						value={formData.username}
						onChangeText={(text) => {
							updateFormData({username: text});
							setUsernameHelper(null);
						}}
						onBlur={checkUsername}
						autoCapitalize="none"
						rightAdornment={isCheckingUsername ? <ActivityIndicator size="small" color={tintColor}/> : null}
					/>

					<GlassInput
						placeholder="Senha"
						value={formData.password}
						onChangeText={(text) => updateFormData({password: text})}
						secureTextEntry
					/>
					<GlassInput
						helperText={passwordHelper}
						placeholder="Repetir Senha"
						value={formData.confirmPassword}
						onChangeText={(text) => updateFormData({confirmPassword: text})}
						secureTextEntry
					/>
				</View>

				<TouchableOpacity
					style={[styles.primaryButton, {backgroundColor: tintColor}, isNextDisabled && styles.buttonDisabled]}
					onPress={handleNextStep}
					disabled={isNextDisabled}
				>
					<Text style={styles.primaryButtonText}>PRÓXIMO</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const renderTypeStep = () => (
		<View style={styles.formSection}>
			<Text style={[styles.stepTitle, {color: textColor}]}>Você é?</Text>
			<View style={styles.typeSelectionContainer}>
				<TouchableOpacity
					style={[
						styles.typeButton,
						{borderColor: tintColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff'},
						userType === USER_TYPES.PATIENT && {backgroundColor: tintColor},
					]}
					onPress={() => setUserType(USER_TYPES.PATIENT)}
				>
					<Text style={[styles.typeButtonText, {color: tintColor}, userType === USER_TYPES.PATIENT && styles.typeButtonTextSelected]}>
						Paciente
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.typeButton,
						{borderColor: tintColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff'},
						userType === USER_TYPES.PSYCHOLOGIST && {backgroundColor: tintColor},
					]}
					onPress={() => setUserType(USER_TYPES.PSYCHOLOGIST)}
				>
					<Text style={[styles.typeButtonText, {color: tintColor}, userType === USER_TYPES.PSYCHOLOGIST && styles.typeButtonTextSelected]}>
						Psicólogo
					</Text>
				</TouchableOpacity>
			</View>
			<TouchableOpacity
				style={[styles.primaryButton, {backgroundColor: tintColor}, !userType && styles.buttonDisabled]}
				onPress={handleNextStep}
				disabled={!userType}
			>
				<Text style={styles.primaryButtonText}>PRÓXIMO</Text>
			</TouchableOpacity>
		</View>
	);

	const renderCommonDataStep = () => (
		<View style={styles.formSection}>
			<Text style={[styles.stepTitle, {color: textColor}]}>Dados Pessoais</Text>
			<View style={styles.inputGroup}>
				<GlassInput placeholder="Nome completo" value={formData.name} onChangeText={(text) => updateFormData({name: text})} autoCapitalize="words" />
				<GlassInput
					placeholder="CPF"
					value={formData.cpf}
					onChangeText={(text) => updateFormData({cpf: maskCPF(text)})}
					keyboardType="numeric"
					maxLength={14}
				/>
				<GlassInput
					placeholder="Aniversário (DD/MM/AAAA)"
					value={formData.birthDate}
					onChangeText={(text) => updateFormData({birthDate: maskDate(text)})}
					keyboardType="numeric"
					maxLength={10}
				/>
				<View style={styles.radioGroup}>
					<Text style={[styles.radioGroupTitle, {color: mutedColor}]}>Sexo biológico</Text>
					{BIOLOGICAL_SEX_OPTIONS.map((option) => {
						const selected = formData.biologicalSex === option.value;
						return (
							<TouchableOpacity
								key={option.value}
								style={[
									styles.radioOption,
									{
										borderColor: selected ? tintColor : borderColor,
										backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
									},
								]}
								onPress={() => {
									updateFormData({biologicalSex: option.value});
									if (option.value !== BIOLOGICAL_SEX.FEMALE) {
										setSelectedObstetricFile(null);
									}
								}}
							>
								<View style={[styles.radioCircle, {borderColor: selected ? tintColor : mutedColor}]}>
									{selected && <View style={[styles.radioDot, {backgroundColor: tintColor}]}/>}
								</View>
								<Text style={[styles.radioLabel, {color: textColor}]}>{option.label}</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>
			<TouchableOpacity style={[styles.primaryButton, {backgroundColor: tintColor}]} onPress={handleNextStep}>
				<Text style={styles.primaryButtonText}>PRÓXIMO</Text>
			</TouchableOpacity>
		</View>
	);

	const renderAddressStep = () => (
		<View style={styles.formSection}>
			<ScrollView
				style={styles.addressScroll}
				contentContainerStyle={styles.inputGroup}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<Text style={[styles.stepTitle, {color: textColor}]}>Endereço</Text>
				<GlassInput
					placeholder="CEP"
					value={formData.zipCode}
					onChangeText={(text) => updateFormData({zipCode: maskZipCode(text)})}
					onBlur={handleZipCodeLookup}
					keyboardType="numeric"
					maxLength={9}
					rightAdornment={isLoadingZipCode ? <ActivityIndicator size="small" color={tintColor}/> : null}
				/>
				<GlassInput placeholder="Logradouro" value={formData.street} onChangeText={(text) => updateFormData({street: text})} />
				<GlassInput placeholder="Número" value={formData.addressNumber} onChangeText={(text) => updateFormData({addressNumber: text})} />
				<GlassInput placeholder="Complemento" value={formData.addressComplement} onChangeText={(text) => updateFormData({addressComplement: text})} />
				<GlassInput placeholder="Bairro" value={formData.neighborhood} onChangeText={(text) => updateFormData({neighborhood: text})} />
				<GlassInput placeholder="Cidade" value={formData.city} onChangeText={(text) => updateFormData({city: text})} />
				<GlassInput placeholder="Estado (UF)" value={formData.state} onChangeText={(text) => updateFormData({state: text.toUpperCase()})} maxLength={2} />
				<TouchableOpacity style={[styles.primaryButton, {backgroundColor: tintColor}]} onPress={handleNextStep}>
					<Text style={styles.primaryButtonText}>PRÓXIMO</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);

	const renderRecordImportStep = () => {
		const isFemale = formData.biologicalSex === BIOLOGICAL_SEX.FEMALE;
		const isPatient = userType === USER_TYPES.PATIENT;

		return (
			<View style={styles.formSection}>
				<Text style={[styles.stepTitle, {color: textColor}]}>Dados Complementares</Text>
				<View style={styles.inputGroup}>
					{isPatient && (
						<TouchableOpacity
							style={[styles.secondaryButton, {borderColor: tintColor}]}
							onPress={handlePickExternalRecordFile}
						>
							<Text style={[styles.secondaryButtonText, {color: tintColor}]}>
								{selectedExternalRecordFile ? `PRONTUARIO: ${selectedExternalRecordFile.name}` : 'SELECIONAR PRONTUARIO (PDF/CSV)'}
							</Text>
						</TouchableOpacity>
					)}

					{isPatient && isFemale && (
						<>
							<TouchableOpacity
								style={[styles.secondaryButton, {borderColor: tintColor}]}
								onPress={handlePickObstetricFile}
							>
								<Text style={[styles.secondaryButtonText, {color: tintColor}]}>
									{selectedObstetricFile ? `ARQUIVO OBSTÉTRICO: ${selectedObstetricFile.name}` : 'SELECIONAR DADOS OBSTÉTRICOS'}
								</Text>
							</TouchableOpacity>
						</>
					)}
				</View>

				<TouchableOpacity style={[styles.primaryButton, {backgroundColor: tintColor}]} onPress={handleNextStep}>
					<Text style={styles.primaryButtonText}>PRÓXIMO</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const getFilteredPsychologists = (): Psychologist[] => {
		return psychologists.filter(psychologist =>
			psychologist.name.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
			psychologist.crp.includes(filterState.searchQuery)
		);
	};

	const renderPsychologistItem = (psychologist: Psychologist) => {
		const isSelected = filterState.selectedPsychologistId === psychologist.id;

		return (
			<View key={psychologist.id} style={[styles.psychologistItem, {
				borderColor,
				backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
			}]}> 
				<View style={{marginRight: 12}}>
					<Avatar uri={psychologist.profilePictureUrl} size={40} name={psychologist.name}/>
				</View>
				<View style={styles.psychologistInfo}>
					<Text style={[styles.psychologistName, {color: textColor}]}>{psychologist.name}</Text>
					<Text style={[styles.psychologistCrp, {color: mutedColor}]}>CRP: {psychologist.crp}</Text>
				</View>
				<TouchableOpacity
					style={[
						styles.linkButton,
						{backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee'},
						isSelected && {backgroundColor: '#34C759'},
					]}
					onPress={() => updateFilterState({selectedPsychologistId: psychologist.id})}
				>
					<Text style={[styles.linkButtonText, {color: textColor}, isSelected && {color: '#fff'}]}>
						{isSelected ? 'Vinculado' : 'Vincular'}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const renderFinalStep = () => {
		const isPsychologist = userType === USER_TYPES.PSYCHOLOGIST;
		if (isPsychologist) {
			const isFinishDisabled = !formData.crp || !formData.uf || isRegistering;
			return (
				<View style={styles.formSection}>
					<Text style={[styles.stepTitle, {color: textColor}]}>Dados Profissionais</Text>
					<View style={styles.inputGroup}>
						<GlassInput
							placeholder="CRP (ex: 06/12345)"
							value={formData.crp}
							onChangeText={(text) => updateFormData({crp: formatCrpNumber(text)})}
							keyboardType="numeric"
							maxLength={CRP_FORMAT.MAX_LENGTH}
						/>
						<GlassInput
							placeholder="UF (ex: SP)"
							value={formData.uf}
							onChangeText={(text) => updateFormData({uf: text})}
							maxLength={UF_MAX_LENGTH}
							autoCapitalize="characters"
						/>
						<GlassInput
							placeholder="Duração da sessão (minutos)"
							value={formData.sessionDurationMinutes}
							onChangeText={(text) => updateFormData({sessionDurationMinutes: text})}
							keyboardType="numeric"
						/>
						<GlassInput
							placeholder="Telefone comercial"
							value={formData.businessPhone}
							onChangeText={(text) => updateFormData({businessPhone: maskPhone(text)})}
							keyboardType="phone-pad"
							maxLength={15}
						/>
						<GlassInput placeholder="Especialidade" value={formData.specialty} onChangeText={(text) => updateFormData({specialty: text})} />
						<GlassInput
							placeholder="Texto de apresentação"
							value={formData.presentationText}
							onChangeText={(text) => updateFormData({presentationText: text})}
							multiline
						/>
					</View>
					<TouchableOpacity
						style={[styles.primaryButton, {backgroundColor: tintColor}, isFinishDisabled && styles.buttonDisabled]}
						onPress={handleRegister}
						disabled={isFinishDisabled}
					>
						{isRegistering ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<Text style={styles.primaryButtonText}>FINALIZAR CADASTRO</Text>
						)}
					</TouchableOpacity>
				</View>
			);
		}

		const filteredPsychologists = getFilteredPsychologists();
		return (
			<View style={[styles.formSection, {flex: 1}]}> 
				<Text style={[styles.stepTitle, {color: textColor}]}>Vincular Psicólogo</Text>
				<TouchableOpacity
					style={[styles.secondaryButton, {borderColor: tintColor}]}
					onPress={handlePickExternalRecordFile}
				>
					<Text style={[styles.secondaryButtonText, {color: tintColor}]}>
						{selectedExternalRecordFile ? `ARQUIVO: ${selectedExternalRecordFile.name}` : 'SELECIONAR PRONTUÁRIO (PDF/CSV)'}
					</Text>
				</TouchableOpacity>
				<GlassInput
					placeholder="Buscar por nome ou CRP"
					value={filterState.searchQuery}
					onChangeText={(text) => updateFilterState({searchQuery: text})}
				/>

				{isLoadingPsychologists ? (
					<ActivityIndicator size="large" color={tintColor} style={{marginTop: 20}}/>
				) : (
					<FlatList
						data={filteredPsychologists}
						keyExtractor={(item) => item.id}
						style={styles.list}
						contentContainerStyle={{gap: 10}}
						renderItem={({item}) => renderPsychologistItem(item)}
					/>
				)}

				<TouchableOpacity
					style={[styles.primaryButton, {backgroundColor: tintColor}, isRegistering && styles.buttonDisabled]}
					onPress={handleRegister}
					disabled={isRegistering}
				>
					{isRegistering ? (
						<ActivityIndicator size="small" color="#FFFFFF" />
					) : (
						<Text style={styles.primaryButtonText}>FINALIZAR CADASTRO</Text>
					)}
				</TouchableOpacity>
			</View>
		);
	};

	const renderHeader = () => (
		<View style={styles.header}>
			<TouchableOpacity onPress={handleBackButton} style={styles.backButton}>
				<Text style={[styles.backButtonText, {color: mutedColor}]}>
					{currentStep === REGISTRATION_STEPS.AUTH ? 'Cancelar' : 'Voltar'}
				</Text>
			</TouchableOpacity>
		</View>
	);

	const renderStep = () => {
		switch (currentStep) {
		case REGISTRATION_STEPS.AUTH:
			return renderAuthStep();
		case REGISTRATION_STEPS.COMMON_DATA:
			return renderCommonDataStep();
		case REGISTRATION_STEPS.ADDRESS:
			return renderAddressStep();
		case REGISTRATION_STEPS.USER_TYPE:
			return renderTypeStep();
		case REGISTRATION_STEPS.RECORD_IMPORT:
			return renderRecordImportStep();
		case REGISTRATION_STEPS.FINAL:
			return renderFinalStep();
		default:
			return null;
		}
	};

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
				<AnimatedEntry style={styles.contentContainer}>
					{renderHeader()}
					{renderStep()}
				</AnimatedEntry>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: 'relative',
	},
	keyboardView: {
		flex: 1,
	},
	contentContainer: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 60,
		width: '100%',
		maxWidth: 600,
		alignSelf: 'center',
	},
	header: {
		marginBottom: 20,
		alignSelf: 'flex-start',
	},
	backButton: {
		padding: 8,
	},
	backButtonText: {
		fontSize: 16,
		fontWeight: '600',
	},
	formSection: {
		width: '100%',
		gap: 24,
		flex: 1,
	},
	stepTitle: {
		fontSize: 28,
		fontWeight: '900',
		textAlign: 'center',
		marginBottom: 10,
		letterSpacing: 1,
	},
	inputGroup: {
		gap: 16,
	},
	addressScroll: {
		flex: 1,
	},
	primaryButton: {
		width: '100%',
		height: 64,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 10,
		},
		shadowOpacity: 0.3,
		shadowRadius: 20,
		elevation: 10,
		marginTop: 20,
		marginBottom: 40,
	},
	secondaryButton: {
		height: 52,
		borderRadius: 14,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryButtonText: {
		fontSize: 12,
		fontWeight: '900',
		letterSpacing: 2,
		textTransform: 'uppercase',
	},
	radioGroup: {
		gap: 10,
	},
	radioGroupTitle: {
		fontSize: 12,
		fontWeight: '500',
		marginLeft: 12,
	},
	radioOption: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderWidth: 1,
		borderRadius: 16,
		paddingVertical: 18,
		paddingHorizontal: 24,
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	radioLabel: {
		fontSize: 14,
		fontWeight: '600',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '900',
		letterSpacing: 3,
		textTransform: 'uppercase',
	},
	typeSelectionContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		gap: 16,
		marginTop: 20,
	},
	typeButton: {
		flex: 1,
		height: 120,
		borderWidth: 2,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	typeButtonText: {
		fontSize: 16,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
	typeButtonTextSelected: {
		color: '#fff',
	},
	list: {
		width: '100%',
		flex: 1,
	},
	psychologistItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
	},
	psychologistInfo: {
		flex: 1,
		justifyContent: 'center',
	},
	psychologistName: {
		fontSize: 16,
		fontWeight: '600',
	},
	psychologistCrp: {
		fontSize: 12,
	},
	linkButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
	},
	linkButtonText: {
		fontSize: 12,
		fontWeight: '700',
	},
});
