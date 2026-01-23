import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';

interface AuthState {
	token: string | null;
	userType: number | null;
}

interface AuthContextType extends AuthState {
	signIn: (token: string, userType: number, email?: string) => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	token: null,
	userType: null,
	signIn: async () => {},
	signOut: async () => {},
});

export function useAuth() {
	return useContext(AuthContext);
}

interface AuthProviderProps {
	children: ReactNode;
	initialAuth?: AuthState;
}

export function AuthProvider({ children, initialAuth }: AuthProviderProps) {
	const [auth, setAuth] = useState<AuthState>(initialAuth || {
		token: null,
		userType: null,
	});

	const router = useRouter();
	const segments = useSegments();
	
	useEffect(() => {
		// @ts-ignore
		if (segments.length === 0) return;

		// @ts-ignore
		const inAuthGroup = segments[0] === '(auth)';

		if (!auth.token) {
			if (!inAuthGroup) {
				router.replace('/(auth)/login');
			}
			return;
		}

		if (inAuthGroup) {
			if (auth.userType === 0) {
				// @ts-ignore
				router.replace('/(psychologist)');
			} else if (auth.userType === 1) {
				// @ts-ignore
				router.replace('/(patient)');
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [auth, segments]);

	const signIn = async (token: string, userType: number, email?: string) => {
		const promises = [
			SecureStore.setItemAsync('token', token),
			SecureStore.setItemAsync('userType', userType.toString()),
		];

		if (email) {
			let env = 'Prod'; // Default
			const lower = email.toLowerCase();
			if (lower.includes('@reframe.gandrei.dev.br')) env = 'Dev';
			if (lower.includes('@reframe-homolog.gandrei.dev.br')) env = 'Homolog';
			promises.push(SecureStore.setItemAsync('app_env', env));
		}

		await Promise.all(promises);

		setAuth({
			token,
			userType,
		});
	};

	const signOut = async () => {
		await Promise.all([
			SecureStore.deleteItemAsync('token'),
			SecureStore.deleteItemAsync('userType'),
			SecureStore.deleteItemAsync('app_env'),
		]);

		setAuth({
			token: null,
			userType: null,
		});

		router.replace('/(auth)/login');
	};

	return (
		<AuthContext.Provider
			value={{
				token: auth.token,
				userType: auth.userType,
				signIn,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
