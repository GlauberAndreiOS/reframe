import {useEffect, useState} from 'react';
import * as SplashScreen from 'expo-splash-screen';
import {ensureDbReady} from '@/database/bootstrap';
import {storage} from "@/services/storage";

SplashScreen.preventAutoHideAsync();

export function useBootstrap() {
	const [ready, setReady] = useState(false);
	const [data, setData] = useState<{ auth: { token: string | null, userType: number | null } }>({
		auth: {
			token: null,
			userType: null
		}
	});

	useEffect(() => {
		async function prepare() {
			try {
				const dbPromise = ensureDbReady();

				const tokenPromise = storage.getItem('token');
				const userTypePromise = storage.getItem('userType');

				const [token, userType] = await Promise.all([
					tokenPromise,
					userTypePromise,
					dbPromise,
				]);

				setData({
					auth: {
						token,
						userType: userType ? parseInt(userType, 10) : null,
					},
				});

			} catch (e) {
				console.warn(e);
			} finally {
				setReady(true);
				await SplashScreen.hideAsync();
			}
		}

		void prepare();
	}, []);

	return {ready, data};
}
