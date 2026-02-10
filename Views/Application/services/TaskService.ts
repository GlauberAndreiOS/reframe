import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Network from 'expo-network';
import {thoughtsRepository} from '@/database/repositories/thoughts.repository';
import api from './api';

// ============= TYPES & INTERFACES =============
interface SyncResult {
	succeeded: boolean;
	errorMessage?: string;
}

// ============= CONSTANTS =============
const BACKGROUND_TASKS = {
	SYNC_TASK: 'background-sync-task',
} as const;

const API_ENDPOINTS = {
	SYNC_THOUGHTS: '/AutomaticThought/sync',
} as const;

// ============= UTILITY FUNCTIONS =============
const checkNetworkConnectivity = Network.getNetworkStateAsync().then((state) => state.isConnected).catch(() => false)

const getSyncableThoughts = async () => {
	return thoughtsRepository.getUnsynced();
};

const syncThoughtsWithBackend = (thoughts: any[]): Promise<void> => {
	return api.post(API_ENDPOINTS.SYNC_THOUGHTS, thoughts)
		.then((response) => response.data)
		.catch((error) => {
			console.error('Error syncing thoughts:', error);
			throw error;
		});
};

const markThoughtsAsSynced = async (thoughtIds: string[]): Promise<void> => {
	return thoughtsRepository.markAsSynced(thoughtIds);
};

const markThoughtsAsFailed = async (thoughtIds: string[]): Promise<void> => {
	return thoughtsRepository.markAsFailed(thoughtIds);
};

// ============= SYNC SERVICE =============
export const uploadUnsyncedThoughts = async (): Promise<SyncResult> => {
	try {
		const thoughtsToSync = await getSyncableThoughts();

		if (thoughtsToSync.length === 0) {
			return {succeeded: true};
		}

		const thoughtIds = thoughtsToSync.map((t) => t.id);

		return syncThoughtsWithBackend(thoughtsToSync)
			.then(async () => {
				await markThoughtsAsSynced(thoughtIds);
				return {succeeded: true};
			})
			.catch(async (error) => {
				await markThoughtsAsFailed(thoughtIds);
				return {
					succeeded: false,
					errorMessage: error.message || 'Failed to sync thoughts',
				};
			});
	} catch (error) {
		return {
			succeeded: false,
			errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
		};
	}
};

// ============= BACKGROUND TASK DEFINITION =============
TaskManager.defineTask(
	BACKGROUND_TASKS.SYNC_TASK,
	async (): Promise<BackgroundFetch.BackgroundFetchResult> => {
		try {
			const isConnected = await checkNetworkConnectivity();

			if (!isConnected) {
				console.log('No network connection available');
				return BackgroundFetch.BackgroundFetchResult.NoData;
			}

			const result = await uploadUnsyncedThoughts();

			if (result.succeeded) {
				return BackgroundFetch.BackgroundFetchResult.NewData;
			} else {
				console.error('Background sync failed:', result.errorMessage);
				return BackgroundFetch.BackgroundFetchResult.Failed;
			}
		} catch (error) {
			console.error('Background task error:', error);
			return BackgroundFetch.BackgroundFetchResult.Failed;
		}
	}
);

// ============= EXPORTS =============
export const SYNC_TASK_NAME = BACKGROUND_TASKS.SYNC_TASK;
