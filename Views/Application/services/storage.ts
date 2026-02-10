import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';

// ============= CONSTANTS =============
const STORAGE_PLATFORM = {
	WEB: 'web',
} as const;

// ============= UTILITY FUNCTIONS =============
const isWebPlatform = (): boolean => Platform.OS === STORAGE_PLATFORM.WEB;

const setItemWeb = (key: string, value: string): void => {
	localStorage.setItem(key, value);
};

const setItemSecure = async (key: string, value: string): Promise<void> => {
	await SecureStore.setItemAsync(key, value);
};

const getItemWeb = (key: string): string | null => {
	return localStorage.getItem(key);
};

const getItemSecure = async (key: string): Promise<string | null> => {
	return await SecureStore.getItemAsync(key);
};

const deleteItemWeb = (key: string): void => {
	localStorage.removeItem(key);
};

const deleteItemSecure = async (key: string): Promise<void> => {
	await SecureStore.deleteItemAsync(key);
};

// ============= STORAGE SERVICE =============
export const storage = {
	/**
	 * Store a key-value pair
	 * Web: localStorage | Mobile: SecureStore
	 */
	setItem: (key: string, value: string): Promise<void> => {
		if (isWebPlatform()) {
			return Promise.resolve(setItemWeb(key, value));
		} else {
			return setItemSecure(key, value);
		}
	},

	/**
	 * Retrieve a stored value by key
	 * Web: localStorage | Mobile: SecureStore
	 */
	getItem: async (key: string): Promise<string | null> => {
		if (isWebPlatform()) {
			return getItemWeb(key);
		} else {
			return await getItemSecure(key);
		}
	},

	/**
	 * Remove a stored value by key
	 * Web: localStorage | Mobile: SecureStore
	 */
	deleteItem: (key: string): Promise<void> => {
		if (isWebPlatform()) {
			return Promise.resolve(deleteItemWeb(key));
		} else {
			return deleteItemSecure(key);
		}
	},
};

// ============= STORAGE KEYS CONSTANTS =============
export const STORAGE_KEYS = {
	TOKEN: 'token',
	USER_ID: 'userId',
	APP_ENV: 'app_env',
	REFRESH_TOKEN: 'refreshToken',
} as const;
