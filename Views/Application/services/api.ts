import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
	baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5088/api',
	headers: {
		'Content-Type': 'application/json',
	},
});

// Add a request interceptor to inject the token
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

// Logger
api.interceptors.response.use(
	(response) => response,
	(error) => console.log(error)
)

export default api;
