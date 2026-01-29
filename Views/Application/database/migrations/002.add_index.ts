import type * as SQLite from 'expo-sqlite';

export default {
    version: 2,
    name: 'add_index',

    up: async (db: SQLite.SQLiteDatabase) => {
        await db.execAsync(`
            CREATE INDEX IF NOT EXISTS idx_automatic_thoughts_date ON automatic_thoughts (id, date DESC);
        `);
    }
};