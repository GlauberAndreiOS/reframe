import {storage} from "@/services/storage";

export async function loadAuth() {
	try {
		const [token, userType] = await Promise.all([
			storage.getItem('token'),
			storage.getItem('userType'),
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
