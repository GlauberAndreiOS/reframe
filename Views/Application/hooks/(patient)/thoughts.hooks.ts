import { createSyncHook } from '@/hooks/use-sync';
import { thoughtsRepository } from '@/database/repositories/thoughts.repository';

export const useThoughts = createSyncHook(thoughtsRepository, '/AutomaticThought', '/AutomaticThought/sync');
