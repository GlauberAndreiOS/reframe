import {initDatabase} from './index';

let bootPromise: Promise<void> | null = null;

export const ensureDbReady = async () => {
	if (!bootPromise) {
		bootPromise = initDatabase();
	}
	await bootPromise;
};
