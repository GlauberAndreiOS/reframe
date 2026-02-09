import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState,} from 'react';
import {useRouter, useSegments} from 'expo-router';
import {useInternetStatus} from '@/hooks/use-internal-status';
import {registerUnauthorizedHandler} from "@/services/api";
import {storage} from "@/services/storage";

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
	signIn: async () => {
	},
	signOut: async () => {
	},
});

export function useAuth() {
	return useContext(AuthContext);
}

interface AuthProviderProps {
    children: ReactNode;
    initialAuth?: AuthState;
}

export function AuthProvider({children, initialAuth}: AuthProviderProps) {
	const [auth, setAuth] = useState<AuthState>(initialAuth || {
		token: null,
		userType: null,
	});

	const router = useRouter();
	const segments = useSegments();
	const isConnected = useInternetStatus();

	useEffect(() => {
		// @ts-ignore
		if (segments.length === 0) return;
		
		const inAuthGroup = segments[0] === '(auth)';

		if (!auth.token) {
			if (!inAuthGroup) {
				router.replace('/(auth)/login');
			}
			return;
		}

		if (isConnected && inAuthGroup) {
			if (auth.userType === 0) {
				// @ts-ignore
				router.replace('/(psychologist)');
			} else if (auth.userType === 1) {
				// @ts-ignore
				router.replace('/(patient)');
			}
		}

	}, [auth, segments, isConnected, router]);

	const signIn = async (token: string, userType: number, email?: string) => {
		const promises = [
			storage.setItem('token', token),
			storage.setItem('userType', userType.toString()),
		];

		if (email) {
			let env = 'Prod';
			const lower = email.toLowerCase();
			if (lower.includes('@reframe.gandrei.dev.br')) env = 'Dev';
			if (lower.includes('@reframe-homolog.gandrei.dev.br')) env = 'Homolog';
			promises.push(storage.setItem('app_env', env));
		}

		await Promise.all(promises)

		setAuth({
			token,
			userType,
		});
	};

	const signOut = useCallback(async () => {
		await Promise.all([
			storage.deleteItem('token'),
			storage.deleteItem('userType'),
			storage.deleteItem('app_env'),
		]);

		setAuth({
			token: null,
			userType: null,
		});

		router.replace('/(auth)/login');
	}, [router]);

	useEffect(() => {
		registerUnauthorizedHandler(signOut);
	}, [signOut]);

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
