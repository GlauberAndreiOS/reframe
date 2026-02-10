import React, {useCallback, useState} from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import {useRouter} from 'expo-router';
import {api} from '@/services';
import {useToast} from '@/context';
import {useThemeColor} from '@/hooks';
import {
	ThemedView,
	AmbientBackground,
	GlassInput,
	ReframeLogo,
	AnimatedEntry,
} from '@/components';

// ============= TYPES & INTERFACES =============
interface PasswordResetRequest {
	email: string;
}

// ============= CONSTANTS =============
const VALIDATION_MESSAGES = {
	FILL_EMAIL: 'Por favor, insira seu e-mail.',
	RESET_SUCCESS: 'Instruções enviadas para o seu e-mail.',
	RESET_ERROR: 'Falha ao solicitar recuperação de senha.',
} as const;

const API_ENDPOINTS = {
	FORGOT_PASSWORD: '/Auth/forgot-password',
} as const;

const NAVIGATION_DELAYS = {
	BACK_DELAY: 2000,
} as const;

const DESCRIPTION_TEXT = 'Insira seu e-mail para receber as instruções de redefinição de senha.';

// ============= UTILITY FUNCTIONS =============
const validateEmail = (email: string): boolean => {
	return email.trim().length > 0;
};

// ============= ERROR HANDLING =============
const handlePasswordResetError = (error: any): string => {
	if (error.response?.data) {
		return typeof error.response.data === 'string'
			? error.response.data
			: VALIDATION_MESSAGES.RESET_ERROR;
	}
	return VALIDATION_MESSAGES.RESET_ERROR;
};

// ============= MAIN COMPONENT =============
export default function ForgetPassword() {
	const router = useRouter();
	const {showToast} = useToast();

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const mutedColor = useThemeColor({}, 'muted');

	// ============= FORM STATE =============
	const [email, setEmail] = useState<PasswordResetRequest>({
		email: '',
	});
	const [isLoading, setIsLoading] = useState(false);

	// ============= EMAIL HANDLER =============
	const updateEmail = (value: string) => {
		setEmail({email: value});
	};

	// ============= PASSWORD RESET LOGIC =============
	const handleResetPassword = useCallback(() => {
		if (!validateEmail(email.email)) {
			showToast(VALIDATION_MESSAGES.FILL_EMAIL, 'error');
			return;
		}

		setIsLoading(true);

		api
			.post(API_ENDPOINTS.FORGOT_PASSWORD, email)
			.then(() => {
				showToast(VALIDATION_MESSAGES.RESET_SUCCESS, 'success');
				setTimeout(() => router.back(), NAVIGATION_DELAYS.BACK_DELAY);
			})
			.catch(error => {
				console.error('Forgot password error:', error);
				const errorMessage = handlePasswordResetError(error);
				showToast(errorMessage, 'error');
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [email, showToast, router]);

	// ============= NAVIGATION HANDLERS =============
	const handleBackToLogin = () => {
		router.back();
	};

	// ============= RENDER COMPONENTS =============
	const renderDescription = () => (
		<Text style={[styles.description, {color: mutedColor}]}>
			{DESCRIPTION_TEXT}
		</Text>
	);

	const renderEmailInput = () => (
		<View style={styles.inputGroup}>
			<GlassInput
				placeholder="E-mail cadastrado"
				value={email.email}
				onChangeText={updateEmail}
				autoCapitalize="none"
				keyboardType="email-address"
			/>
		</View>
	);

	const renderSubmitButton = () => (
		<TouchableOpacity
			style={[styles.primaryButton, {backgroundColor: tintColor}]}
			onPress={handleResetPassword}
			disabled={isLoading}
			activeOpacity={0.8}
		>
			{isLoading ? (
				<ActivityIndicator color="#FFFFFF"/>
			) : (
				<Text style={styles.primaryButtonText}>ENVIAR INSTRUÇÕES</Text>
			)}
		</TouchableOpacity>
	);

	const renderBackButton = () => (
		<TouchableOpacity onPress={handleBackToLogin} style={styles.backButton}>
			<Text style={[styles.backButtonText, {color: mutedColor}]}>Voltar para Login</Text>
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
						{renderDescription()}
						{renderEmailInput()}
						{renderSubmitButton()}
						{renderBackButton()}
					</View>
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
	description: {
		textAlign: 'center',
		fontSize: 14,
		lineHeight: 20,
		opacity: 0.8,
	},
	inputGroup: {
		gap: 16,
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
	backButton: {
		alignItems: 'center',
		padding: 10,
	},
	backButtonText: {
		fontSize: 14,
		fontWeight: '600',
	},
});
