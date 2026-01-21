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
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';

export default function ForgetPassword() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const textColor = useThemeColor({}, 'text');
	const tintColor = useThemeColor({}, 'tint');
	const buttonTextColor = '#FFFFFF';

	const handleResetPassword = async () => {
		if (!email) {
			Alert.alert('Erro', 'Por favor, insira seu e-mail.');
			return;
		}

		setIsLoading(true);

		try {
			// Assuming the endpoint is /Auth/forgot-password
			await api.post('/Auth/forgot-password', { email });
			
			Alert.alert(
				'Sucesso', 
				'Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.',
				[{ text: 'OK', onPress: () => router.back() }]
			);
		} catch (error: any) {
			console.error('Forgot password error:', error);
			const errorMessage = error.response?.data || 'Falha ao solicitar recuperação de senha.';
			Alert.alert('Erro', typeof errorMessage === 'string' ? errorMessage : 'Falha ao solicitar recuperação de senha.');
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
							contentFit="contain"
						/>
					</View>
					<ThemedText type="title" style={styles.title}>Recuperar Senha</ThemedText>
					
					<ThemedText style={styles.description}>
						Insira seu e-mail para receber as instruções de redefinição de senha.
					</ThemedText>

					<TextInput
						style={[styles.input, { color: textColor, borderColor: textColor }]}
						placeholder="E-mail"
						placeholderTextColor="#999"
						value={email}
						onChangeText={setEmail}
						autoCapitalize="none"
						keyboardType="email-address"
					/>

					<TouchableOpacity 
						style={[styles.button, { backgroundColor: tintColor }, isLoading && styles.buttonDisabled]} 
						onPress={handleResetPassword}
						disabled={isLoading}
					>
						{isLoading ? (
							<ActivityIndicator color={buttonTextColor} />
						) : (
							<ThemedText style={[styles.buttonText, { color: buttonTextColor }]}>Enviar</ThemedText>
						)}
					</TouchableOpacity>

					<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
						<ThemedText style={[styles.linkText, { color: tintColor }]}>Voltar para Login</ThemedText>
					</TouchableOpacity>
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
		width: 120,
		height: 120,
		marginBottom: 20,
	},
	title: {
		marginBottom: 10,
		textAlign: 'center',
	},
	description: {
		textAlign: 'center',
		marginBottom: 30,
		fontSize: 16,
		opacity: 0.8,
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
	backButton: {
		marginTop: 20,
		alignItems: 'center',
	},
	linkText: {
		fontSize: 16,
	},
});
