import axios, {AxiosInstance} from 'axios';
import {storage} from './storage';

// ============= TYPES & INTERFACES =============
type UnauthorizedHandler = () => void | Promise<void>;

interface ApiConfig {
	baseURL: string;
	timeout?: number;
}

// ============= CONSTANTS =============
const API_CONFIG: ApiConfig = {
	baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5088/api',
};

const ENVIRONMENT_DOMAINS = {
	DEV: '@reframe.gandrei.dev.br',
	HOMOLOG: '@reframe-homolog.gandrei.dev.br',
} as const;

const DEFAULT_ENVIRONMENT = 'Prod';
const STORAGE_KEYS = {
	APP_ENV: 'app_env',
	TOKEN: 'token',
} as const;

const HTTP_STATUS = {
	UNAUTHORIZED: 401,
} as const;

const HEADERS = {
	CONTENT_TYPE: 'Content-Type',
	CONTENT_JSON: 'application/json',
	AUTHORIZATION: 'Authorization',
	CONTEXT_APP: 'X-Context-Application',
} as const;

// ============= API INSTANCE =============
const api: AxiosInstance = axios.create({
	baseURL: API_CONFIG.baseURL,
	headers: {
		[HEADERS.CONTENT_TYPE]: HEADERS.CONTENT_JSON,
	},
});

// ============= STATE =============
let onUnauthorized: UnauthorizedHandler | null = null;
let isHandling401 = false;

// ============= UTILITY FUNCTIONS =============
const getEnvironmentFromEmail = (email: string): string => {
	const lowerEmail = email.toLowerCase();

	if (lowerEmail.includes(ENVIRONMENT_DOMAINS.DEV)) {
		return 'Dev';
	}

	if (lowerEmail.includes(ENVIRONMENT_DOMAINS.HOMOLOG)) {
		return 'Homolog';
	}

	return DEFAULT_ENVIRONMENT;
};

const extractEmailFromRequestData = (data: any): string | null => {
	try {
		const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
		return parsedData?.username || parsedData?.email || null;
	} catch {
		return null;
	}
};

// ============= HANDLERS =============
export const registerUnauthorizedHandler = (handler: UnauthorizedHandler): void => {
	onUnauthorized = handler;
};

const handleUnauthorized = async (): Promise<void> => {
	if (isHandling401 || !onUnauthorized) {
		return;
	}

	isHandling401 = true;
	try {
		await onUnauthorized();
	} finally {
		isHandling401 = false;
	}
};

// ============= INTERCEPTORS =============
api.interceptors.request.use(
	(config) => {
		let env = process.env.EXPO_PUBLIC_APP_ENV || null;

		// Attempt to get environment from storage if not set
		if (!env) {
			storage.getItem(STORAGE_KEYS.APP_ENV)
				.then((storedEnv) => {
					if (storedEnv) {
						env = storedEnv;
					}
				})
				.catch(() => {
					// Silently fail - will use email or default
				});
		}

		// Extract environment from request email if still not set
		if (!env && config.data) {
			const email = extractEmailFromRequestData(config.data);
			if (email) {
				env = getEnvironmentFromEmail(email);
			}
		}

		config.headers[HEADERS.CONTEXT_APP] = env || DEFAULT_ENVIRONMENT;

		// Add token from storage
		return storage.getItem(STORAGE_KEYS.TOKEN)
			.then((token) => {
				if (token) {
					config.headers[HEADERS.AUTHORIZATION] = `Bearer ${token}`;
				}
				return config;
			})
			.catch(() => config);
	},
	(error) => Promise.reject(error)
);

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
			return handleUnauthorized()
				.then(() => Promise.reject(error))
				.catch(() => Promise.reject(error));
		}

		return Promise.reject(error);
	}
);

export default api;