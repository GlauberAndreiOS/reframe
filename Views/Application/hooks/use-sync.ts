import { useState, useCallback, useEffect } from 'react';
import { useInternetStatus } from '@/hooks/use-internal-status';
import api from '@/services/api';

interface Repository<T> {
    findAllActive: () => Promise<T[]>;
    upsert: (records: T[]) => Promise<void>;
    getUnsynced: () => Promise<T[]>;
    markAsSynced: (ids: string[]) => Promise<void>;
    markAsFailed: (ids: string[]) => Promise<void>;
    softDelete: (id: string) => Promise<void>;
}

export function createSyncHook<T extends { id: string, synced?: number }>(
    repository: Repository<T>,
    apiEndpoint: string,
    syncEndpoint?: string
) {
    const uploadUnsynced = async () => {
        const recordsToSync = await repository.getUnsynced();
        if (recordsToSync.length === 0) return;

        const recordIds = recordsToSync.map(r => r.id);
        try {
            await api.post(syncEndpoint || apiEndpoint, recordsToSync);
            await repository.markAsSynced(recordIds);
        } catch (error) {
            await repository.markAsFailed(recordIds);
            throw error;
        }
    };

    return function useSync() {
        const [data, setData] = useState<T[]>([]);
        const [isSyncing, setIsSyncing] = useState(false);
        const isConnected = useInternetStatus();

        const hasFailedSync = data.some(item => item.synced === -1);

        const loadLocalData = useCallback(async () => {
            try {
                const localData = await repository.findAllActive();
                setData(localData);
            } catch (error) {
                console.error(error);
            }
        }, []);

        const syncWithBackend = useCallback(async () => {
            if (!isConnected || isSyncing) return;

            setIsSyncing(true);
            try {
                await uploadUnsynced();
                const response = await api.get(apiEndpoint);
                if (response.data) {
                    await repository.upsert(response.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                await loadLocalData();
                setIsSyncing(false);
            }
        }, [isConnected, isSyncing, loadLocalData]);
        
        const deleteThought = useCallback(async (id: string) => {
            try {
                await api.delete(`${apiEndpoint}/${id}`);
            } catch (error) {
                console.error('Failed to delete thought on backend, proceeding with local soft delete.', error);
            } finally {
                await repository.softDelete(id);
                await loadLocalData();
            }
        }, [loadLocalData]);

        useEffect(() => {
            void loadLocalData();
            void syncWithBackend();
        }, []);

        return {
            data,
            isSyncing,
            hasFailedSync,
            syncWithBackend,
            deleteThought,
        };
    };
}
