import React, {useCallback, useEffect, useState} from 'react';
import {
	ActivityIndicator,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import {useRouter} from 'expo-router';
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

// ============= TYPES & INTERFACES =============
type UserType = 'patient' | 'psychologist' | null;
type RegistrationStep = 0 | 1 | 2;

interface Psychologist {
	id: number;
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
	name: string;
	password: string;
	confirmPassword: string;
	crp: string;
	uf: string;
}

interface PsychologistFilterState {
	searchQuery: string;
	selectedPsychologistId: number | null;
}

// ============= CONSTANTS =============
const REGISTRATION_STEPS = {
	AUTH: 0,
	USER_TYPE: 1,
	DETAILS: 2,
} as const;

const USER_TYPES = {
	PATIENT: 'patient' as const,
	PSYCHOLOGIST: 'psychologist' as const,
} as const;

const VALIDATION_MESSAGES = {
	FILL_ALL_FIELDS: 'Preencha todos os campos.',
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

// ============= UTILITY FUNCTIONS =============
const validateEmail = (email: string): boolean => {
	return EMAIL_REGEX.test(email);
};

const formatCrpNumber = (text: string): string => {
	const cleanedDigits = text.replace(/\D/g, '');
	if (cleanedDigits.length > CRP_FORMAT.DIGITS_BEFORE_SEPARATOR) {
		const beforeSeparator = cleanedDigits.slice(0, CRP_FORMAT.DIGITS_BEFORE_SEPARATOR);
		const afterSeparator = cleanedDigits.slice(CRP_FORMAT.DIGITS_BEFORE_SEPARATOR);
		return `${beforeSeparator}${CRP_FORMAT.SEPARATOR}${afterSeparator}`;
	}
	return cleanedDigits;
};

const buildPsychologistRegistrationPayload = (
	username: string,
	password: string,
	name: string,
	crp: string,
	uf: string
) => ({
	username,
	password,
	name,
	userType: 0,
	crpNumber: crp.split(CRP_FORMAT.SEPARATOR)[0],
	crpUf: uf,
});

const buildPatientRegistrationPayload = (
	username: string,
	password: string,
	name: string,
	psychologistId: number | null
) => ({
	username,
	password,
	name,
	userType: 1,
	psychologistId,
});

// ============= ERROR HANDLING =============
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

// ============= MAIN COMPONENT =============
export default function Register() {
	const router = useRouter();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const textColor = useThemeColor({}, 'text');

	// ============= FORM STATE =============
	const [currentStep, setCurrentStep] = useState<RegistrationStep>(REGISTRATION_STEPS.AUTH as RegistrationStep);
	const [userType, setUserType] = useState<UserType>(null);

	const [formData, setFormData] = useState<RegistrationFormState>({
		username: '',
		name: '',
		password: '',
		confirmPassword: '',
		crp: '',
		uf: '',
	});

	const [usernameHelper, setUsernameHelper] = useState<HelperMessage | null>(null);
	const [passwordHelper, setPasswordHelper] = useState<HelperMessage | null>(null);
	const [isCheckingUsername, setIsCheckingUsername] = useState(false);

	// ============= PSYCHOLOGIST LIST STATE =============
	const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
	const [isLoadingPsychologists, setIsLoadingPsychologists] = useState(false);
	const [filterState, setFilterState] = useState<PsychologistFilterState>({
		searchQuery: '',
		selectedPsychologistId: null,
	});

	// ============= FORM DATA HANDLERS =============
	const updateFormData = (updates: Partial<RegistrationFormState>) => {
		setFormData(prev => ({...prev, ...updates}));
	};

	const updateFilterState = (updates: Partial<PsychologistFilterState>) => {
		setFilterState(prev => ({...prev, ...updates}));
	};

	// ============= USERNAME VALIDATION =============
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

	// ============= PASSWORD VALIDATION =============
	useEffect(() => {
		if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
			setPasswordHelper({text: VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH, type: 'error'});
		} else {
			setPasswordHelper(null);
		}
	}, [formData.password, formData.confirmPassword]);

	// ============= PSYCHOLOGISTS DATA FETCHING =============
	const fetchPsychologists = useCallback(() => {
		setIsLoadingPsychologists(true);

		api
			.get('/Psychologist/all')
			.then(response => {
				setPsychologists(response.data);
			})
			.catch(error => {
				console.error('Failed to fetch psychologists:', error);
				const errorMessage = handleApiError(error);
				showToast(errorMessage, 'error');
			})
			.finally(() => {
				setIsLoadingPsychologists(false);
			});
	}, [showToast]);

	useEffect(() => {
		if (currentStep === REGISTRATION_STEPS.DETAILS && userType === USER_TYPES.PATIENT) {
			fetchPsychologists();
		}
	}, [currentStep, userType, fetchPsychologists]);

	// ============= STEP VALIDATION LOGIC =============
	const validateAuthStep = (): boolean => {
		const {username, name, password, confirmPassword} = formData;

		if (!username || !password || !confirmPassword || !name) {
			showToast(VALIDATION_MESSAGES.FILL_ALL_FIELDS, 'error');
			return false;
		}

		if (usernameHelper?.type === 'error') {
			showToast(VALIDATION_MESSAGES.INVALID_EMAIL, 'error');
			return false;
		}

		if (password !== confirmPassword) {
			showToast(VALIDATION_MESSAGES.PASSWORDS_DONT_MATCH, 'error');
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

	const validateProfessionalDetails = (): boolean => {
		const {crp, uf} = formData;
		if (!crp || !uf) {
			showToast(VALIDATION_MESSAGES.FILL_PROFESSIONAL_DATA, 'error');
			return false;
		}
		return true;
	};

	// ============= NAVIGATION =============
	const handleNextStep = () => {
		if (currentStep === REGISTRATION_STEPS.AUTH && validateAuthStep()) {
			setCurrentStep(REGISTRATION_STEPS.USER_TYPE as RegistrationStep);
		} else if (currentStep === REGISTRATION_STEPS.USER_TYPE && validateUserTypeStep()) {
			setCurrentStep(REGISTRATION_STEPS.DETAILS as RegistrationStep);
		}
	};

	const handlePreviousStep = () => {
		if (currentStep > 0) {
			setCurrentStep((currentStep - 1) as RegistrationStep);
		}
	};

	const handleBackButton = () => {
		if (currentStep === 0) {
			router.back();
		} else {
			handlePreviousStep();
		}
	};

	// ============= REGISTRATION =============
	const handleRegister = useCallback(() => {
		if (userType === USER_TYPES.PSYCHOLOGIST) {
			if (!validateProfessionalDetails()) return;
		}

		const payload = userType === USER_TYPES.PSYCHOLOGIST
			? buildPsychologistRegistrationPayload(
				formData.username,
				formData.password,
				formData.name,
				formData.crp,
				formData.uf
			)
			: buildPatientRegistrationPayload(
				formData.username,
				formData.password,
				formData.name,
				filterState.selectedPsychologistId
			);

		api
			.post('/Auth/register', payload)
			.then(() => {
				showToast(VALIDATION_MESSAGES.REGISTRATION_SUCCESS, 'success');
				setTimeout(() => router.replace('/(auth)/login'), REDIRECT_DELAY_MS);
			})
			.catch(error => {
				console.error('Registration error:', error);
				const errorMessage = handleRegistrationError(error);
				showToast(errorMessage, 'error');
			});
	}, [formData, filterState.selectedPsychologistId, showToast, router, userType]);

	// ============= RENDER COMPONENTS =============
	const renderAuthStep = () => {
		const isNextDisabled = 
			!(formData.username && formData.password && formData.confirmPassword && formData.name) ||
			usernameHelper?.type === 'error' ||
			isCheckingUsername ||
			passwordHelper?.type === 'error';

		return (
			<View style={styles.formSection}>
				<Text style={[styles.stepTitle, {color: textColor}]}>Vamos criar uma conta!</Text>

				<View style={styles.inputGroup}>
					<GlassInput
						placeholder="Nome Completo"
						value={formData.name}
						onChangeText={(text) => updateFormData({name: text})}
						autoCapitalize="words"
					/>

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
						rightAdornment={
							isCheckingUsername ? (
								<ActivityIndicator size="small" color={tintColor}/>
							) : null
						}
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
						userType === USER_TYPES.PATIENT && {backgroundColor: tintColor}
					]}
					onPress={() => setUserType(USER_TYPES.PATIENT)}
				>
					<Text style={[
						styles.typeButtonText,
						{color: tintColor},
						userType === USER_TYPES.PATIENT && styles.typeButtonTextSelected
					]}>Paciente</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.typeButton,
						{borderColor: tintColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff'},
						userType === USER_TYPES.PSYCHOLOGIST && {backgroundColor: tintColor}
					]}
					onPress={() => setUserType(USER_TYPES.PSYCHOLOGIST)}
				>
					<Text style={[
						styles.typeButtonText,
						{color: tintColor},
						userType === USER_TYPES.PSYCHOLOGIST && styles.typeButtonTextSelected
					]}>Psicólogo</Text>
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

	const renderPsychologistDetails = () => {
		const isFinishDisabled = !formData.crp || !formData.uf;
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
				</View>
				<TouchableOpacity
					style={[styles.primaryButton, {backgroundColor: tintColor}, isFinishDisabled && styles.buttonDisabled]}
					onPress={handleRegister}
					disabled={isFinishDisabled}
				>
					<Text style={styles.primaryButtonText}>FINALIZAR CADASTRO</Text>
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
				borderColor: borderColor,
				backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff'
			}]}>
				<View style={{marginRight: 12}}>
					<Avatar uri={psychologist.profilePictureUrl} size={40} name={psychologist.name} />
				</View>
				<View style={styles.psychologistInfo}>
					<Text style={[styles.psychologistName, {color: textColor}]}>{psychologist.name}</Text>
					<Text style={[styles.psychologistCrp, {color: mutedColor}]}>CRP: {psychologist.crp}</Text>
				</View>
				<TouchableOpacity
					style={[
						styles.linkButton,
						{backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee'},
						isSelected && {backgroundColor: '#34C759'}
					]}
					onPress={() => updateFilterState({selectedPsychologistId: psychologist.id})}
				>
					<Text style={[
						styles.linkButtonText,
						{color: textColor},
						isSelected && {color: '#fff'}
					]}>
						{isSelected ? 'Vinculado' : 'Vincular'}
					</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const renderPatientDetails = () => {
		const filteredPsychologists = getFilteredPsychologists();

		return (
			<View style={[styles.formSection, {flex: 1}]}>
				<Text style={[styles.stepTitle, {color: textColor}]}>Vincular Psicólogo</Text>
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
						keyExtractor={(item) => item.id.toString()}
						style={styles.list}
						contentContainerStyle={{gap: 10}}
						renderItem={({item}) => renderPsychologistItem(item)}
					/>
				)}

				<TouchableOpacity 
					style={[styles.primaryButton, {backgroundColor: tintColor}]} 
					onPress={handleRegister}
				>
					<Text style={styles.primaryButtonText}>FINALIZAR CADASTRO</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const renderHeader = () => (
		<View style={styles.header}>
			<TouchableOpacity 
				onPress={handleBackButton} 
				style={styles.backButton}
			>
				<Text style={[styles.backButtonText, {color: mutedColor}]}>
					{currentStep === 0 ? 'Cancelar' : 'Voltar'}
				</Text>
			</TouchableOpacity>
		</View>
	);

	const renderStep = () => {
		switch (currentStep) {
		case REGISTRATION_STEPS.AUTH:
			return renderAuthStep();
		case REGISTRATION_STEPS.USER_TYPE:
			return renderTypeStep();
		case REGISTRATION_STEPS.DETAILS:
			return userType === USER_TYPES.PSYCHOLOGIST 
				? renderPsychologistDetails()
				: renderPatientDetails();
		default:
			return null;
		}
	};

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardView}
			>
				<AnimatedEntry style={styles.contentContainer}>
					{renderHeader()}
					{renderStep()}
				</AnimatedEntry>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

// ============= STYLES =============
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
	inputContainer: {
		width: '100%',
		position: 'relative',
	},
	inputError: {
		borderColor: '#EF4444',
		borderWidth: 1,
	},
	inputSuccess: {
		borderColor: '#10B981',
		borderWidth: 1,
	},
	errorText: {
		color: '#EF4444',
		fontSize: 12,
		marginTop: -10,
		marginLeft: 5,
	},
	successText: {
		color: '#10B981',
		fontSize: 12,
		marginTop: -10,
		marginLeft: 5,
	},
	loader: {
		position: 'absolute',
		right: 15,
		top: 15,
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
