import React, { useState } from 'react';
import {
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/context/ToastContext';
import { AmbientBackground } from '@/components/ui/ambient-background';
import { GlassInput } from '@/components/ui/glass-input';
import { ReframeLogo } from '@/components/ui/reframe-logo';
import { AnimatedEntry } from '@/components/ui/animated-entry';

export default function Login() {
	const router = useRouter();
	const { signIn } = useAuth();
	const { showToast } = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';
  
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');

	const handleLogin = async () => {
		if (!username || !password) {
			showToast('Preencha usuário e senha.', 'error');
			return;
		}

		setIsLoading(true);

		try {
			const response = await api.post('/Auth/login', {
				username,
				password
			});

			const { token, userType } = response.data;
			await signIn(token, userType);
      
		} catch (error: any) {
			console.error('Login error:', error);
			const errorMessage = error.response?.data || 'Falha ao realizar login.';
			showToast(typeof errorMessage === 'string' ? errorMessage : 'Falha ao realizar login.', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground />

			<KeyboardAvoidingView 
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardView}
			>
				<AnimatedEntry style={styles.contentContainer}>
					<ReframeLogo />
          
					<View style={styles.formSection}>
						<View style={styles.inputGroup}>
							<GlassInput 
								placeholder="Email profissional ou usuário"
								value={username}
								onChangeText={setUsername}
								autoCapitalize="none"
								keyboardType="email-address"
							/>
              
							<GlassInput 
								placeholder="Senha de acesso"
								value={password}
								onChangeText={setPassword}
								secureTextEntry
							/>
						</View>

						<View style={[
							styles.secondaryActionsContainer, 
							{ 
								borderColor: borderColor,
								backgroundColor: isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.01)'
							}
						]}>
							<TouchableOpacity 
								style={styles.secondaryButton}
								onPress={() => router.push('/(auth)/forgetpassword')}
							>
								<ThemedText style={[styles.secondaryButtonText, { color: mutedColor }]}>Esqueci minha senha</ThemedText>
							</TouchableOpacity>
							<View style={[styles.separator, { backgroundColor: borderColor }]} />
							<TouchableOpacity 
								style={styles.secondaryButton}
								onPress={() => router.push('/(auth)/register')}
							>
								<ThemedText style={[styles.secondaryButtonText, { color: tintColor }]}>Não tenho conta</ThemedText>
							</TouchableOpacity>
						</View>
            
						<TouchableOpacity 
							style={[styles.primaryButton, { backgroundColor: tintColor }]}
							onPress={handleLogin}
							disabled={isLoading}
							activeOpacity={0.8}
						>
							{isLoading ? (
								<ActivityIndicator color="#FFFFFF" />
							) : (
								<ThemedText style={styles.primaryButtonText}>INICIAR REESTRUTURAÇÃO</ThemedText>
							)}
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
