import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
	baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5088/api',
	headers: {
		'Content-Type': 'application/json',
	},
});

const getEnvFromEmail = (email: string): string => {
	const lower = email.toLowerCase();
	if (lower.includes('@reframe.gandrei.dev.br')) return 'Dev';
	if (lower.includes('@reframe-homolog.gandrei.dev.br')) return 'Homolog';
	return 'Prod';
};

let onUnauthorized: null | (() => void | Promise<void>) = null;
let isHandling401 = false;

export const registerUnauthorizedHandler = (handler: () => void | Promise<void>) => {
	onUnauthorized = handler;
};

api.interceptors.request.use(
	async (config) => {
		let env = process.env.EXPO_PUBLIC_APP_ENV || await SecureStore.getItemAsync('app_env')

		if (!env && config.data) {
			try {
				const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
				const email = data?.username || data?.email;
				if (email) {
					env = getEnvFromEmail(email);
				}
			} catch {}
		}

		config.headers['X-Context-Application'] = env || 'Prod';

		const token = await SecureStore.getItemAsync('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		return config;
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			if (!isHandling401 && onUnauthorized) {
				isHandling401 = true;
				try {
					await onUnauthorized();
				} finally {
					isHandling401 = false;
				}
			}
		}
		return Promise.reject(error);
	}
);

export default api;