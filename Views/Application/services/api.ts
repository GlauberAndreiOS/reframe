import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
	baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5088/api',
	headers: {
		'Content-Type': 'application/json',
	},
});

api.interceptors.request.use(
	async (config) => {
		const token = await SecureStore.getItemAsync('token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		console.log('API Error:', error.response?.status, error.response?.data || error.message);
		return Promise.reject(error);
	}
);

export default api;
