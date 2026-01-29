import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { ensureDbReady } from '@/database/bootstrap';

SplashScreen.preventAutoHideAsync();

export function useBootstrap() {
    const [ready, setReady] = useState(false);
    const [data, setData] = useState<{ auth: { token: string | null, userType: number | null } }>({ auth: { token: null, userType: null } });

    useEffect(() => {
        async function prepare() {
            try {
                const dbPromise = ensureDbReady();

                const tokenPromise = SecureStore.getItemAsync('token');
                const userTypePromise = SecureStore.getItemAsync('userType');

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

    return { ready, data };
}
