import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
	token: string | null;
	userType: number | null; // 0 = Psychologist, 1 = Patient
	isLoading: boolean;
	signIn: (token: string, userType: number) => Promise<void>;
	signOut: () => Promise<void>;
}

type AuthState = {
	token: string | null;
	userType: number | null;
	hydrated: boolean;
};

const AuthContext = createContext<AuthContextType>({
	token: null,
	userType: null,
	isLoading: true,
	signIn: async () => {},
	signOut: async () => {},
});

export function useAuth() {
	return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [auth, setAuth] = useState<AuthState>({
		token: null,
		userType: null,
		hydrated: false,
	});

	const router = useRouter();
	const segments = useSegments();

	/**
	 * Hydration — carrega auth do SecureStore de forma atômica
	 */
	useEffect(() => {
		let mounted = true;

		const hydrate = async () => {
			try {
				const [storedToken, storedUserType] = await Promise.all([
					SecureStore.getItemAsync('token'),
					SecureStore.getItemAsync('userType'),
				]);

				if (!mounted) return;

				setAuth({
					token: storedToken,
					userType: storedUserType ? Number(storedUserType) : null,
					hydrated: true,
				});
			} catch {
				if (!mounted) return;

				setAuth({
					token: null,
					userType: null,
					hydrated: true,
				});
			}
		};

		hydrate();

		return () => {
			mounted = false;
		};
	}, []);

	/**
	 * Navigation guard — só roda após hidratação completa
	 */
	useEffect(() => {
		if (!auth.hydrated) return;

		// @ts-ignore
		const inAuthGroup = segments[0] === '(auth)' || segments.length === 0;

		// Usuário NÃO autenticado
		if (!auth.token) {
			if (!inAuthGroup) {
				router.replace('/(auth)/login');
			}
			return;
		}

		// Usuário autenticado
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

	/**
	 * Auth actions
	 */
	const signIn = async (token: string, userType: number) => {
		await Promise.all([
			SecureStore.setItemAsync('token', token),
			SecureStore.setItemAsync('userType', userType.toString()),
		]);

		setAuth({
			token,
			userType,
			hydrated: true,
		});
	};

	const signOut = async () => {
		await Promise.all([
			SecureStore.deleteItemAsync('token'),
			SecureStore.deleteItemAsync('userType'),
		]);

		setAuth({
			token: null,
			userType: null,
			hydrated: true,
		});

		router.replace('/(auth)/login');
	};

	return (
		<AuthContext.Provider
			value={{
				token: auth.token,
				userType: auth.userType,
				isLoading: !auth.hydrated,
				signIn,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
