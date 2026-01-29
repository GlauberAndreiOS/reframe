import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
	baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5088/api',
	headers: {
		'Content-Type': 'application/json',
	},
});

/**
 * ================================
 * ENV baseado no email
 * ================================
 */
const getEnvFromEmail = (email: string) => {
	const lower = email.toLowerCase();
	if (lower.includes('@reframe.gandrei.dev.br')) return 'Dev';
	if (lower.includes('@reframe-homolog.gandrei.dev.br')) return 'Homolog';
	return 'Prod';
};

/**
 * ================================
 * Handler global de 401 (bridge)
 * ================================
 */
let onUnauthorized: null | (() => void | Promise<void>) = null;
let isHandling401 = false;

export const registerUnauthorizedHandler = (
	handler: () => void | Promise<void>
) => {
	onUnauthorized = handler;
};

/**
 * ================================
 * REQUEST INTERCEPTOR
 * ================================
 */
api.interceptors.request.use(
	async (config) => {
		let env = 'Prod';

		if (config.data) {
			try {
				const data =
					typeof config.data === 'string'
						? JSON.parse(config.data)
						: config.data;

				const email = data.username || data.email;

				if (email) {
					env = getEnvFromEmail(email);
				}
			} catch {
				// ignora erro de parse
			}
		}

		const storedEnv = await SecureStore.getItemAsync('app_env');
		if (storedEnv) {
			const data = config.data
				? typeof config.data === 'string'
					? JSON.parse(config.data)
					: config.data
				: {};

			if (!data.username && !data.email) {
				env = storedEnv;
			}
		}

		config.headers['X-Context-Application'] = env;

		const token = await SecureStore.getItemAsync('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		return config;
	},
	(error) => Promise.reject(error)
);

/**
 * ================================
 * RESPONSE INTERCEPTOR
 * ================================
 */
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			console.log('401 detectado — sessão inválida');

			if (!isHandling401 && onUnauthorized) {
				isHandling401 = true;
				try {
					await onUnauthorized();
				} finally {
					isHandling401 = false;
				}
			}
		} else {
			console.log(
				'API Error:',
				error.response?.status,
				error.response?.data || error.message
			);
		}

		return Promise.reject(error);
	}
);

export default api;
