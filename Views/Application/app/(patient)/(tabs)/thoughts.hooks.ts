import { createSyncHook } from '@/hooks/use-sync';
import { thoughtsRepository } from '@/database/repositories/thoughts.repository';

//#TODO verificar um jeito de remover a warn do expo-router tentando interpretar isso como um react component e não como um hook
export const useThoughts = createSyncHook(thoughtsRepository, '/AutomaticThought', '/AutomaticThought/sync');
