import { connectDatabase } from './connection';
import { runMigrations } from './migrator';

let initialized = false;

export const initDatabase = async () => {
    if (initialized) return;

    await connectDatabase();
    await runMigrations();

    initialized = true;
};
