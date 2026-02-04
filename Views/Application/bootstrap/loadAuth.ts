import * as SecureStore from 'expo-secure-store';

export async function loadAuth() {
	try {
		const [token, userType] = await Promise.all([
			SecureStore.getItemAsync('token'),
			SecureStore.getItemAsync('userType'),
		]);

		return {
			token,
			userType: userType ? Number(userType) : null,
		};
	} catch (error) {
		console.error('Failed to load auth state', error);
		return {token: null, userType: null};
	}
}
