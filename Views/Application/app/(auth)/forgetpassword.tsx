import React, {useState} from 'react';
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
import api from '@/services/api';
import {ThemedView} from '@/components/themed-view';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useToast} from '@/context/ToastContext';

import {AmbientBackground} from '@/components/ui/ambient-background';
import {GlassInput} from '@/components/ui/glass-input';
import {ReframeLogo} from '@/components/ui/reframe-logo';
import {AnimatedEntry} from '@/components/ui/animated-entry';

export default function ForgetPassword() {
	const router = useRouter();
	const {showToast} = useToast();
	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const tintColor = useThemeColor({}, 'tint');
	const mutedColor = useThemeColor({}, 'muted');

	const handleResetPassword = async () => {
		if (!email) {
			showToast('Por favor, insira seu e-mail.', 'error');
			return;
		}

		setIsLoading(true);

		try {
			await api.post('/Auth/forgot-password', {email});

			showToast('Instruções enviadas para o seu e-mail.', 'success');
			setTimeout(() => router.back(), 2000);

		} catch (error: any) {
			console.error('Forgot password error:', error);
			const errorMessage = error.response?.data || 'Falha ao solicitar recuperação de senha.';
			showToast(typeof errorMessage === 'string' ? errorMessage : 'Falha ao solicitar recuperação.', 'error');
		} finally {
			setIsLoading(false);
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
					<ReframeLogo/>

					<View style={styles.formSection}>
						<Text style={[styles.description, {color: mutedColor}]}>
							Insira seu e-mail para receber as instruções de redefinição de senha.
						</Text>

						<View style={styles.inputGroup}>
							<GlassInput
								placeholder="E-mail cadastrado"
								value={email}
								onChangeText={setEmail}
								autoCapitalize="none"
								keyboardType="email-address"
							/>
						</View>

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

						<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
							<Text style={[styles.backButtonText, {color: mutedColor}]}>Voltar para Login</Text>
						</TouchableOpacity>
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
