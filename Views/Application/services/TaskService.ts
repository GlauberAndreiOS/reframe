import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Network from 'expo-network';
import { thoughtsRepository } from '@/database/repositories/thoughts.repository';
import api from './api';

const SYNC_TASK_NAME = 'background-sync-task';

export const uploadUnsyncedThoughts = async () => {
    const thoughtsToSync = await thoughtsRepository.getUnsynced();

    if (thoughtsToSync.length === 0) {
        return;
    }

    const thoughtIds = thoughtsToSync.map(t => t.id);

    try {
        await api.post('/AutomaticThought/sync', thoughtsToSync);
        await thoughtsRepository.markAsSynced(thoughtIds);
    } catch (error) {
        await thoughtsRepository.markAsFailed(thoughtIds);
        throw error;
    }
};

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    try {
        await uploadUnsyncedThoughts();
        return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});
