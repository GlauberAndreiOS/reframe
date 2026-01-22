import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

export async function loadFonts() {
	try {
		await Font.loadAsync({
			...Ionicons.font,

		});
	} catch (error) {
		console.error('Failed to load fonts', error);
	}
}
