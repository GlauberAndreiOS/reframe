import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { loadAuth } from '@/bootstrap/loadAuth';
import { loadFonts } from '@/bootstrap/loadFonts';

type BootstrapResult = {
	auth: {
		token: string | null;
		userType: number | null;
	};
};

export function useBootstrap() {
	const [ready, setReady] = useState(false);
	const [data, setData] = useState<BootstrapResult | null>(null);

	useEffect(() => {
		let mounted = true;

		const bootstrap = async () => {
			try {

				await SplashScreen.preventAutoHideAsync();

				const [auth] = await Promise.all([
					loadAuth(),
					loadFonts(),
				]);

				if (!mounted) return;

				setData({ auth });
				setReady(true);
			} catch (err) {
				console.error('Bootstrap failed', err);

				setReady(true);
			}
		};

		bootstrap();

		return () => {
			mounted = false;
		};
	}, []);

	return { ready, data };
}
