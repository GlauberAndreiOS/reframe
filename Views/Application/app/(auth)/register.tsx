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
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useToast} from '@/context/ToastContext';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {GlassInput, HelperTextType} from '@/components/ui/glass-input';
import {AnimatedEntry} from '@/components/ui/animated-entry';
import {Avatar} from '@/components/ui/avatar';

type UserType = 'patient' | 'psychologist' | null;

interface Psychologist {
    id: number;
    name: string;
    crp: string;
    email: string;
    profilePictureUrl?: string;
}

export default function Register() {
	const router = useRouter();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const [step, setStep] = useState(0);

	const [username, setUsername] = useState('');
	const [name, setName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [userType, setUserType] = useState<UserType>(null);

	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const [usernameHelper, setUsernameHelper] = useState<{ text: string, type: HelperTextType } | null>(null);
	const [passwordHelper, setPasswordHelper] = useState<{ text: string, type: HelperTextType } | null>(null);

	const [crp, setCrp] = useState('');
	const [uf, setUf] = useState('');

	const [searchQuery, setSearchQuery] = useState('');
	const [selectedPsychologistId, setSelectedPsychologistId] = useState<number | null>(null);
	const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
	const [isLoadingPsychologists, setIsLoadingPsychologists] = useState(false);

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const textColor = useThemeColor({}, 'text');

	const validateEmail = (email: string) => {
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return re.test(email);
	};

	const checkUsername = async () => {
		if (!username) {
			setUsernameHelper(null);
			return;
		}

		if (!validateEmail(username)) {
			setUsernameHelper({text: 'Insira um e-mail válido.', type: 'error'});
			return;
		}

		setIsCheckingUsername(true);
		setUsernameHelper(null);

		try {
			const response = await api.get(`/Auth/check-username/${username}`);
			if (response.data.exists) {
				setUsernameHelper({text: 'E-mail já cadastrado.', type: 'error'});
				showToast('Este e-mail já está em uso.', 'error');
			} else {
				setUsernameHelper({text: 'E-mail disponível!', type: 'success'});
			}
		} catch (error) {
			console.error('Failed to check username:', error);
		} finally {
			setIsCheckingUsername(false);
		}
	};

	useEffect(() => {
		if (confirmPassword && password !== confirmPassword) {
			setPasswordHelper({text: 'As senhas não coincidem.', type: 'error'});
		} else {
			setPasswordHelper(null);
		}
	}, [password, confirmPassword]);

	const fetchPsychologists = useCallback(async () => {
		setIsLoadingPsychologists(true);
		try {
			const response = await api.get('/Psychologist/all');
			setPsychologists(response.data);
		} catch (error) {
			console.error('Failed to fetch psychologists:', error);
			showToast('Não foi possível carregar a lista de psicólogos.', 'error');
		} finally {
			setIsLoadingPsychologists(false);
		}
	}, [showToast]);

	useEffect(() => {
		if (step === 2 && userType === 'patient') {
			fetchPsychologists();
		}
	}, [step, userType, fetchPsychologists]);

	const handleNext = () => {
		if (step === 0) {
			if (!username || !password || !confirmPassword || !name) {
				showToast('Preencha todos os campos.', 'error');
				return;
			}
			if (usernameHelper?.type === 'error') {
				showToast('E-mail inválido ou indisponível.', 'error');
				return;
			}
			if (password !== confirmPassword) {
				showToast('As senhas não coincidem.', 'error');
				return;
			}
			setStep(1);
		} else if (step === 1) {
			if (!userType) {
				showToast('Selecione um tipo de usuário.', 'error');
				return;
			}
			setStep(2);
		}
	};

	const handleRegister = async () => {
		if (userType === 'psychologist') {
			if (!crp || !uf) {
				showToast('Preencha CRP e UF.', 'error');
				return;
			}
		}

		const payload = {
			username,
			password,
			name,
			userType: userType === 'patient' ? 1 : 0,
			...(userType === 'psychologist'
				? {
					crpNumber: crp.split('/')[0],
					crpUf: uf
				}
				: {
					psychologistId: selectedPsychologistId
				}
			)
		};

		try {
			await api.post('/Auth/register', payload);

			showToast('Cadastro realizado com sucesso!', 'success');
			setTimeout(() => router.replace('/(auth)/login'), 1500);
		} catch (error: any) {
			console.error(error);
			const errorMessage = error.response?.data || 'Falha ao realizar cadastro.';
			showToast(typeof errorMessage === 'string' ? errorMessage : 'Falha ao realizar cadastro.', 'error');
		}
	};

	const formatCrp = (text: string) => {
		const cleaned = text.replace(/\D/g, '');
		if (cleaned.length > 2) {
			return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 7)}`;
		}
		return cleaned;
	};

	const handleCrpChange = (text: string) => {
		const formatted = formatCrp(text);
		setCrp(formatted);
	};

	const renderAuthStep = () => {
		const isNextDisabled = !(username && password && confirmPassword && name) || usernameHelper?.type === 'error' || isCheckingUsername || passwordHelper?.type === 'error';

		return (
			<View style={styles.formSection}>
				<Text style={[styles.stepTitle, {color: textColor}]}>Vamos criar uma conta!</Text>

				<View style={styles.inputGroup}>
					<GlassInput
						placeholder="Nome Completo"
						value={name}
						onChangeText={setName}
						autoCapitalize="words"
					/>

					<GlassInput
						helperText={usernameHelper}
						placeholder="Email"
						keyboardType="email-address"
						value={username}
						onChangeText={(text) => {
							setUsername(text);
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
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>
					<GlassInput
						helperText={passwordHelper}
						placeholder="Repetir Senha"
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						secureTextEntry
					/>
				</View>

				<TouchableOpacity
					style={[styles.primaryButton, {backgroundColor: tintColor}, isNextDisabled && styles.buttonDisabled]}
					onPress={handleNext}
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
						userType === 'patient' && {backgroundColor: tintColor}
					]}
					onPress={() => setUserType('patient')}
				>
					<Text style={[
						styles.typeButtonText,
						{color: tintColor},
						userType === 'patient' && styles.typeButtonTextSelected
					]}>Paciente</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.typeButton,
						{borderColor: tintColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff'},
						userType === 'psychologist' && {backgroundColor: tintColor}
					]}
					onPress={() => setUserType('psychologist')}
				>
					<Text style={[
						styles.typeButtonText,
						{color: tintColor},
						userType === 'psychologist' && styles.typeButtonTextSelected
					]}>Psicólogo</Text>
				</TouchableOpacity>
			</View>
			<TouchableOpacity
				style={[styles.primaryButton, {backgroundColor: tintColor}, !userType && styles.buttonDisabled]}
				onPress={handleNext}
				disabled={!userType}
			>
				<Text style={styles.primaryButtonText}>PRÓXIMO</Text>
			</TouchableOpacity>
		</View>
	);

	const renderPsychologistDetails = () => {
		const isFinishDisabled = !crp || !uf;
		return (
			<View style={styles.formSection}>
				<Text style={[styles.stepTitle, {color: textColor}]}>Dados Profissionais</Text>
				<View style={styles.inputGroup}>
					<GlassInput
						placeholder="CRP (ex: 06/12345)"
						value={crp}
						onChangeText={handleCrpChange}
						keyboardType="numeric"
						maxLength={8}
					/>
					<GlassInput
						placeholder="UF (ex: SP)"
						value={uf}
						onChangeText={setUf}
						maxLength={2}
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

	const renderPatientDetails = () => {
		const filteredPsychologists = psychologists.filter(p =>
			p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.crp.includes(searchQuery)
		);

		return (
			<View style={[styles.formSection, {flex: 1}]}>
				<Text style={[styles.stepTitle, {color: textColor}]}>Vincular Psicólogo</Text>
				<GlassInput
					placeholder="Buscar por nome ou CRP"
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>

				{isLoadingPsychologists ? (
					<ActivityIndicator size="large" color={tintColor} style={{marginTop: 20}}/>
				) : (
					<FlatList
						data={filteredPsychologists}
						keyExtractor={(item) => item.id.toString()}
						style={styles.list}
						contentContainerStyle={{gap: 10}}
						renderItem={({item}) => (
							<View style={[styles.psychologistItem, {
								borderColor: borderColor,
								backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff'
							}]}>
								<View style={{marginRight: 12}}>
									<Avatar uri={item.profilePictureUrl} size={40} name={item.name} />
								</View>
								<View style={styles.psychologistInfo}>
									<Text style={[styles.psychologistName, {color: textColor}]}>{item.name}</Text>
									<Text style={[styles.psychologistCrp, {color: mutedColor}]}>CRP: {item.crp}</Text>
								</View>
								<TouchableOpacity
									style={[
										styles.linkButton,
										{backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#eee'},
										selectedPsychologistId === item.id && {backgroundColor: '#34C759'}
									]}
									onPress={() => setSelectedPsychologistId(item.id)}
								>
									<Text style={[
										styles.linkButtonText,
										{color: textColor},
										selectedPsychologistId === item.id && {color: '#fff'}
									]}>
										{selectedPsychologistId === item.id ? 'Vinculado' : 'Vincular'}
									</Text>
								</TouchableOpacity>
							</View>
						)}
					/>
				)}

				<TouchableOpacity style={[styles.primaryButton, {backgroundColor: tintColor}]} onPress={handleRegister}>
					<Text style={styles.primaryButtonText}>FINALIZAR CADASTRO</Text>
				</TouchableOpacity>
			</View>
		);
	};

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardView}
			>
				<AnimatedEntry style={styles.contentContainer}>
					<View style={styles.header}>
						{step > 0 && (
							<TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backButton}>
								<Text style={[styles.backButtonText, {color: mutedColor}]}>Voltar</Text>
							</TouchableOpacity>
						)}
						{step === 0 && (
							<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
								<Text style={[styles.backButtonText, {color: mutedColor}]}>Cancelar</Text>
							</TouchableOpacity>
						)}
					</View>

					{step === 0 && renderAuthStep()}
					{step === 1 && renderTypeStep()}
					{step === 2 && userType === 'psychologist' && renderPsychologistDetails()}
					{step === 2 && userType === 'patient' && renderPatientDetails()}
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
