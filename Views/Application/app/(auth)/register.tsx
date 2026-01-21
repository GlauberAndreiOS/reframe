import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import api from '@/services/api';

type UserType = 'patient' | 'psychologist' | null;

interface Psychologist {
    id: number;
    name: string;
    crp: string;
    email: string;
}

export default function Register() {
	const router = useRouter();
	const [step, setStep] = useState(0); // 0: Auth, 1: Type, 2: Details
  
	// Form State
	const [username, setUsername] = useState('');
	const [name, setName] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [userType, setUserType] = useState<UserType>(null);
  
	// Username Validation State
	const [isCheckingUsername, setIsCheckingUsername] = useState(false);
	const [usernameError, setUsernameError] = useState<string | null>(null);
	const [usernameSuccess, setUsernameSuccess] = useState<boolean>(false);

	// Password Validation State
	const [passwordError, setPasswordError] = useState<string | null>(null);

	// Psychologist Details
	const [crp, setCrp] = useState('');
	const [uf, setUf] = useState('');
  
	// Patient Details
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedPsychologistId, setSelectedPsychologistId] = useState<number | null>(null);
	const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
	const [isLoadingPsychologists, setIsLoadingPsychologists] = useState(false);

	const validateEmail = (email: string) => {
		const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return re.test(email);
	};

	const checkUsername = async () => {
		if (!username) {
			setUsernameError(null);
			setUsernameSuccess(false);
			return;
		}

		if (!validateEmail(username)) {
			setUsernameError('Insira um e-mail válido.');
			setUsernameSuccess(false);
			return;
		}

		setIsCheckingUsername(true);
		setUsernameError(null);
		setUsernameSuccess(false);

		try {
			const response = await api.get(`/Auth/check-username/${username}`);
			if (response.data.exists) {
				setUsernameError('E-mail já cadastrado.');
			} else {
				setUsernameSuccess(true);
			}
		} catch (error) {
			console.error('Failed to check username:', error);
		} finally {
			setIsCheckingUsername(false);
		}
	};

	useEffect(() => {
		if (confirmPassword && password !== confirmPassword) {
			setPasswordError('As senhas não coincidem.');
		} else {
			setPasswordError(null);
		}
	}, [password, confirmPassword]);

	useEffect(() => {
		if (step === 2 && userType === 'patient') {
			fetchPsychologists();
		}
	}, [step, userType]);

	const fetchPsychologists = async () => {
		setIsLoadingPsychologists(true);
		try {
			const response = await api.get('/Psychologist/all');
			setPsychologists(response.data);
		} catch (error) {
			console.error('Failed to fetch psychologists:', error);
			Alert.alert('Erro', 'Não foi possível carregar a lista de psicólogos.');
		} finally {
			setIsLoadingPsychologists(false);
		}
	};

	const handleNext = () => {
		if (step === 0) {
			if (!username || !password || !confirmPassword || !name) {
				Alert.alert('Erro', 'Preencha todos os campos.');
				return;
			}
			if (usernameError) {
				Alert.alert('Erro', 'E-mail inválido ou indisponível.');
				return;
			}
			if (password !== confirmPassword) {
				Alert.alert('Erro', 'As senhas não coincidem.');
				return;
			}
			setStep(1);
		} else if (step === 1) {
			if (!userType) {
				Alert.alert('Erro', 'Selecione um tipo de usuário.');
				return;
			}
			setStep(2);
		}
	};

	const handleRegister = async () => {
		// Validation for final step
		if (userType === 'psychologist') {
			if (!crp || !uf) {
				Alert.alert('Erro', 'Preencha CRP e UF.');
				return;
			}
		} else if (userType === 'patient') {
			// It's optional to link now or later, but based on requirements we assume they might want to link.
			// If linking is mandatory:
			// if (!selectedPsychologistId) { Alert.alert('Erro', 'Vincule um psicólogo.'); return; }
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

		console.log('Posting to backend:', payload);

		try {
			await api.post('/Auth/register', payload);
      
			Alert.alert('Sucesso', 'Cadastro realizado com sucesso!', [
				{ text: 'OK', onPress: () => router.replace('/(auth)/login') }
			]);
		} catch (error: any) {
			console.error(error);
			const errorMessage = error.response?.data || 'Falha ao realizar cadastro.';
			Alert.alert('Erro', typeof errorMessage === 'string' ? errorMessage : 'Falha ao realizar cadastro.');
		}
	};

	const formatCrp = (text: string) => {
		const cleaned = text.replace(/\D/g, '');
    
		// Format as 00/00000
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
		const isNextDisabled = !(username && password && confirmPassword && name) || !!usernameError || isCheckingUsername || !!passwordError;

		return (
			<View style={styles.stepContainer}>
				<Text style={styles.stepTitle}>Vamos criar uma conta!</Text>
        
				<TextInput
					style={styles.input}
					placeholder="Nome Completo"
					value={name}
					onChangeText={setName}
					autoCapitalize="words"
				/>

				<View style={styles.inputContainer}>
					<TextInput
						style={[
							styles.input, 
							!!usernameError && styles.inputError,
							usernameSuccess && styles.inputSuccess
						]}
						placeholder="Email"
						keyboardType="email-address"
						value={username}
						onChangeText={(text) => {
							setUsername(text);
							setUsernameError(null);
							setUsernameSuccess(false);
						}}
						onBlur={checkUsername}
						autoCapitalize="none"
					/>
					{isCheckingUsername && (
						<ActivityIndicator style={styles.loader} size="small" color="#007AFF" />
					)}
				</View>
				{usernameError && <Text style={styles.errorText}>{usernameError}</Text>}
				{usernameSuccess && <Text style={styles.successText}>E-mail disponível!</Text>}

				<TextInput
					style={styles.input}
					placeholder="Senha"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
				/>
				<TextInput
					style={[styles.input, !!passwordError && styles.inputError]}
					placeholder="Repetir Senha"
					value={confirmPassword}
					onChangeText={setConfirmPassword}
					secureTextEntry
				/>
				{passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

				<TouchableOpacity 
					style={[styles.button, isNextDisabled && styles.buttonDisabled]} 
					onPress={handleNext} 
					disabled={isNextDisabled}
				>
					<Text style={styles.buttonText}>Próximo</Text>
				</TouchableOpacity>
			</View>
		);
	};

	const renderTypeStep = () => (
		<View style={styles.stepContainer}>
			<Text style={styles.stepTitle}>Você é?</Text>
			<View style={styles.typeSelectionContainer}>
				<TouchableOpacity
					style={[styles.typeButton, userType === 'patient' && styles.typeButtonSelected]}
					onPress={() => setUserType('patient')}
				>
					<Text style={[styles.typeButtonText, userType === 'patient' && styles.typeButtonTextSelected]}>Paciente</Text>
				</TouchableOpacity>
        
				<TouchableOpacity
					style={[styles.typeButton, userType === 'psychologist' && styles.typeButtonSelected]}
					onPress={() => setUserType('psychologist')}
				>
					<Text style={[styles.typeButtonText, userType === 'psychologist' && styles.typeButtonTextSelected]}>Psicólogo</Text>
				</TouchableOpacity>
			</View>
			<TouchableOpacity 
				style={[styles.button, !userType && styles.buttonDisabled]} 
				onPress={handleNext}
				disabled={!userType}
			>
				<Text style={styles.buttonText}>Próximo</Text>
			</TouchableOpacity>
		</View>
	);

	const renderPsychologistDetails = () => {
		const isFinishDisabled = !crp || !uf;
		return (
			<View style={styles.stepContainer}>
				<Text style={styles.stepTitle}>Dados Profissionais</Text>
				<TextInput
					style={styles.input}
					placeholder="CRP (ex: 06/12345)"
					value={crp}
					onChangeText={handleCrpChange}
					keyboardType="numeric"
					maxLength={8} // 2 digits + / + 5 digits
				/>
				<TextInput
					style={styles.input}
					placeholder="UF (ex: SP)"
					value={uf}
					onChangeText={setUf}
					maxLength={2}
					autoCapitalize="characters"
				/>
				<TouchableOpacity 
					style={[styles.button, isFinishDisabled && styles.buttonDisabled]} 
					onPress={handleRegister}
					disabled={isFinishDisabled}
				>
					<Text style={styles.buttonText}>Finalizar Cadastro</Text>
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
			<View style={[styles.stepContainer, { flex: 1 }]}>
				<Text style={styles.stepTitle}>Vincular Psicólogo</Text>
				<TextInput
					style={styles.input}
					placeholder="Buscar por nome ou CRP"
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>
        
				{isLoadingPsychologists ? (
					<ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
				) : (
					<FlatList
						data={filteredPsychologists}
						keyExtractor={(item) => item.id.toString()}
						style={styles.list}
						renderItem={({ item }) => (
							<View style={styles.psychologistItem}>
								<Image source={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=random` }} style={styles.avatar} />
								<View style={styles.psychologistInfo}>
									<Text style={styles.psychologistName}>{item.name}</Text>
									<Text style={styles.psychologistCrp}>CRP: {item.crp}</Text>
								</View>
								<TouchableOpacity 
									style={[
										styles.linkButton, 
										selectedPsychologistId === item.id && styles.linkButtonSelected
									]}
									onPress={() => setSelectedPsychologistId(item.id)}
								>
									<Text style={styles.linkButtonText}>
										{selectedPsychologistId === item.id ? 'Vinculado' : 'Vincular'}
									</Text>
								</TouchableOpacity>
							</View>
						)}
					/>
				)}

				<TouchableOpacity style={styles.button} onPress={handleRegister}>
					<Text style={styles.buttonText}>Finalizar Cadastro</Text>
				</TouchableOpacity>
			</View>
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<KeyboardAvoidingView 
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={{ flex: 1 }}
			>
				<View style={styles.header}>
					{step > 0 && (
						<TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backButton}>
							<Text style={styles.backButtonText}>Voltar</Text>
						</TouchableOpacity>
					)}
					{step === 0 && (
						<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
							<Text style={styles.backButtonText}>Cancelar</Text>
						</TouchableOpacity>
					)}
				</View>

				<View style={styles.content}>
					{step === 0 && renderAuthStep()}
					{step === 1 && renderTypeStep()}
					{step === 2 && userType === 'psychologist' && renderPsychologistDetails()}
					{step === 2 && userType === 'patient' && renderPatientDetails()}
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
	},
	backButton: {
		padding: 8,
	},
	backButtonText: {
		color: '#007AFF',
		fontSize: 16,
	},
	content: {
		flex: 1,
		padding: 20,
	},
	stepContainer: {
		width: '100%',
		alignItems: 'center',
	},
	stepTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 30,
		textAlign: 'center',
	},
	inputContainer: {
		width: '100%',
		position: 'relative',
	},
	input: {
		width: '100%',
		height: 50,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		paddingHorizontal: 15,
		marginBottom: 15,
		fontSize: 16,
	},
	inputError: {
		borderColor: 'red',
		borderWidth: 1,
		backgroundColor: '#FFF0F0',
		paddingHorizontal: 15,
	},
	inputSuccess: {
		borderColor: 'green',
		borderWidth: 1,
		backgroundColor: '#F0FFF0',
		paddingHorizontal: 15,
	},
	errorText: {
		color: 'red',
		alignSelf: 'flex-start',
		marginBottom: 10,
		marginTop: -10,
		marginLeft: 5,
	},
	successText: {
		color: 'green',
		alignSelf: 'flex-start',
		marginBottom: 10,
		marginTop: -10,
		marginLeft: 5,
	},
	loader: {
		position: 'absolute',
		right: 15,
		top: 15,
	},
	button: {
		width: '100%',
		height: 50,
		backgroundColor: '#007AFF',
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 10,
	},
	buttonDisabled: {
		backgroundColor: '#A0A0A0',
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
	typeSelectionContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		marginBottom: 20,
		gap: 10,
	},
	typeButton: {
		flex: 1,
		height: 100,
		borderWidth: 2,
		borderColor: '#007AFF',
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	typeButtonSelected: {
		backgroundColor: '#007AFF',
	},
	typeButtonText: {
		fontSize: 18,
		color: '#007AFF',
		fontWeight: '600',
	},
	typeButtonTextSelected: {
		color: '#fff',
	},
	list: {
		width: '100%',
		marginBottom: 20,
	},
	psychologistItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	avatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginRight: 12,
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
		fontSize: 14,
		color: '#666',
	},
	linkButton: {
		paddingVertical: 6,
		paddingHorizontal: 12,
		backgroundColor: '#eee',
		borderRadius: 6,
	},
	linkButtonSelected: {
		backgroundColor: '#34C759',
	},
	linkButtonText: {
		fontSize: 14,
		color: '#333',
	},
});
