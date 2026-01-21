import React, { useState } from 'react';
import {
	View,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';

export default function Login() {
	const router = useRouter();
	const { signIn } = useAuth();
  
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const textColor = useThemeColor({}, 'text');
	const tintColor = useThemeColor({}, 'tint');
  
	const buttonTextColor = '#FFFFFF';

	const handleLogin = async () => {
		if (!username || !password) {
			Alert.alert('Erro', 'Preencha usuário e senha.');
			return;
		}

		setIsLoading(true);

		try {
			const response = await api.post('/Auth/login', {
				username,
				password
			});

			const { token, userType } = response.data;
			console.log('Login API success:', { token: '***', userType });
      
			// Update context state
			await signIn(token, userType);
      
			// Force navigation immediately after state update
			console.log('Forcing navigation to tabs...');
			if (userType === 0) {
				router.replace('/(psychologist)');
			} else {
				router.replace('/(patient)');
			}
      
		} catch (error: any) {
			console.error('Login error:', error);
			const errorMessage = error.response?.data || 'Falha ao realizar login.';
			Alert.alert('Erro', typeof errorMessage === 'string' ? errorMessage : 'Falha ao realizar login.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<KeyboardAvoidingView 
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardView}
			>
				<View style={styles.formContainer}>
					<View style={styles.logoContainer}>
						<Image 
							source={require('@/assets/images/favicon.png')} 
							style={styles.logo}
							contentFit="none"
						/>
					</View>
					<ThemedText type="title" style={styles.title}>Bem-vindo de volta!</ThemedText>
          
					<TextInput
						style={[styles.input, { color: textColor, borderColor: textColor }]}
						placeholder="Usuário ou Email"
						placeholderTextColor="#999"
						value={username}
						onChangeText={setUsername}
						autoCapitalize="none"
						keyboardType="email-address"
					/>
          
					<TextInput
						style={[styles.input, { color: textColor, borderColor: textColor }]}
						placeholder="Senha"
						placeholderTextColor="#999"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>

					<TouchableOpacity 
						style={[styles.button, { backgroundColor: tintColor }, isLoading && styles.buttonDisabled]} 
						onPress={handleLogin}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color={buttonTextColor} />
						) : (
							<ThemedText style={[styles.buttonText, { color: buttonTextColor }]}>Entrar</ThemedText>
						)}
					</TouchableOpacity>

					<View style={styles.footer}>
						<TouchableOpacity onPress={() => router.push('/(auth)/forgetpassword')}>
							<ThemedText style={[styles.linkText, { color: tintColor }]}>Esqueci minha senha</ThemedText>
						</TouchableOpacity>
            
						<View style={styles.registerContainer}>
							<ThemedText style={styles.text}>Não tem uma conta? </ThemedText>
							<TouchableOpacity onPress={() => router.push('/(auth)/register')}>
								<ThemedText style={[styles.linkTextBold, { color: tintColor }]}>Cadastre-se</ThemedText>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	keyboardView: {
		flex: 1,
		justifyContent: 'center',
		padding: 20,
	},
	formContainer: {
		width: '100%',
		maxWidth: 400,
		alignSelf: 'center',
	},
	logoContainer: {
		alignItems: 'center',
	},
	logo: {
		width: 300,
		height: 300,
	},
	title: {
		marginBottom: 40,
		textAlign: 'center',
	},
	input: {
		width: '100%',
		height: 50,
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 15,
		marginBottom: 15,
		fontSize: 16,
	},
	button: {
		width: '100%',
		height: 50,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 10,
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	footer: {
		marginTop: 30,
		alignItems: 'center',
		gap: 15,
	},
	registerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	text: {
		fontSize: 16,
	},
	linkText: {
		fontSize: 16,
	},
	linkTextBold: {
		fontSize: 16,
		fontWeight: 'bold',
	},
});
