import React, {useCallback, useState} from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import {useRouter} from 'expo-router';
import {useAuth, useToast} from '@/context';
import {api} from '@/services';
import {useThemeColor, useColorScheme} from '@/hooks';
import {
	ThemedView,
	ThemedText,
	AmbientBackground,
	GlassInput,
	ReframeLogo,
	AnimatedEntry,
} from '@/components';

// ============= TYPES & INTERFACES =============
interface LoginCredentials {
	username: string;
	password: string;
}

interface LoginResponse {
	token: string;
	userType: number;
}

// ============= CONSTANTS =============
const VALIDATION_MESSAGES = {
	FILL_CREDENTIALS: 'Preencha usuário e senha.',
	LOGIN_ERROR: 'Falha ao realizar login.',
} as const;

const LOGIN_ENDPOINTS = {
	LOGIN: '/Auth/login',
} as const;

// ============= ERROR HANDLING =============
const handleLoginError = (error: any): string => {
	if (error.response?.data) {
		return typeof error.response.data === 'string'
			? error.response.data
			: VALIDATION_MESSAGES.LOGIN_ERROR;
	}
	return VALIDATION_MESSAGES.LOGIN_ERROR;
};

// ============= UTILITY FUNCTIONS =============
const validateLoginCredentials = (credentials: LoginCredentials): boolean => {
	return !!(credentials.username && credentials.password);
};

// ============= MAIN COMPONENT =============
export default function Login() {
	const router = useRouter();
	const {signIn} = useAuth();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');

	// ============= FORM STATE =============
	const [credentials, setCredentials] = useState<LoginCredentials>({
		username: '',
		password: '',
	});
	const [isLoading, setIsLoading] = useState(false);

	// ============= CREDENTIAL HANDLERS =============
	const updateCredentials = (updates: Partial<LoginCredentials>) => {
		setCredentials(prev => ({...prev, ...updates}));
	};

	// ============= LOGIN LOGIC =============
	const performLogin = useCallback(() => {
		if (!validateLoginCredentials(credentials)) {
			showToast(VALIDATION_MESSAGES.FILL_CREDENTIALS, 'error');
			return;
		}

		setIsLoading(true);

		api
			.post<LoginResponse>(LOGIN_ENDPOINTS.LOGIN, credentials)
			.then(response => {
				const {token, userType} = response.data;
				return signIn(token, userType, credentials.username);
			})
			.catch(error => {
				console.error('Login error:', error);
				const errorMessage = handleLoginError(error);
				showToast(errorMessage, 'error');
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [credentials, showToast, signIn]);

	// ============= NAVIGATION HANDLERS =============
	const handleForgotPassword = () => {
		router.push('/(auth)/forgetpassword');
	};

	const handleSignUp = () => {
		router.push('/(auth)/register');
	};

	// ============= RENDER COMPONENTS =============
	const renderCredentialsForm = () => (
		<View style={styles.inputGroup}>
			<GlassInput
				placeholder="Email profissional ou usuário"
				value={credentials.username}
				onChangeText={(text: string) => updateCredentials({username: text})}
				autoCapitalize="none"
				keyboardType="email-address"
			/>

			<GlassInput
				placeholder="Senha de acesso"
				value={credentials.password}
				onChangeText={(text: string) => updateCredentials({password: text})}
				secureTextEntry
			/>
		</View>
	);

	const renderSecondaryActions = () => (
		<View style={[
			styles.secondaryActionsContainer,
			{
				borderColor: borderColor,
				backgroundColor: isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)'
			}
		]}>
			<TouchableOpacity
				style={styles.secondaryButton}
				onPress={handleForgotPassword}
			>
				<ThemedText style={[styles.secondaryButtonText, {color: mutedColor}]}>
					Esqueci minha senha
				</ThemedText>
			</TouchableOpacity>
			<View style={[styles.separator, {backgroundColor: borderColor}]}/>
			<TouchableOpacity
				style={styles.secondaryButton}
				onPress={handleSignUp}
			>
				<ThemedText style={[styles.secondaryButtonText, {color: tintColor}]}>
					Não tenho conta
				</ThemedText>
			</TouchableOpacity>
		</View>
	);

	const renderLoginButton = () => (
		<TouchableOpacity
			style={[styles.primaryButton, {backgroundColor: tintColor}]}
			onPress={performLogin}
			disabled={isLoading}
			activeOpacity={0.8}
		>
			{isLoading ? (
				<ActivityIndicator color="#FFFFFF"/>
			) : (
				<ThemedText style={styles.primaryButtonText}>INICIAR REESTRUTURAÇÃO</ThemedText>
			)}
		</TouchableOpacity>
	);

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardView}
			>
				<AnimatedEntry style={styles.contentContainer}>
					<ReframeLogo/>

					<View style={styles.formSection}>
						{renderCredentialsForm()}
						{renderSecondaryActions()}
						{renderLoginButton()}
					</View>
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
		justifyContent: 'center',
	},
	contentContainer: {
		paddingHorizontal: 24,
		width: '100%',
		maxWidth: 600,
		alignSelf: 'center',
		alignItems: 'center',
		gap: 40,
	},
	formSection: {
		width: '100%',
		gap: 32,
	},
	inputGroup: {
		gap: 16,
	},
	secondaryActionsContainer: {
		flexDirection: 'row',
		width: '100%',
		borderRadius: 16,
		borderWidth: 1,
		overflow: 'hidden',
	},
	secondaryButton: {
		flex: 1,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	separator: {
		width: 1,
	},
	secondaryButtonText: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 2,
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
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '900',
		letterSpacing: 3,
		textTransform: 'uppercase',
	},
});
