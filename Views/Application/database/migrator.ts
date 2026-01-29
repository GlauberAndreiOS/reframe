import { getConnection } from './connection';
import migrations from './migrations';
import * as SQLite from 'expo-sqlite';

type Migration = {
    version: number;
    name: string;
    up: (db: SQLite.SQLiteDatabase) => Promise<void>;
};

export const runMigrations = async () => {
    const db = getConnection();

    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS _migrations (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           name TEXT NOT NULL,
           executed_at TEXT NOT NULL
        );
    `);

    const result = await db.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version;'
    );

    const currentVersion = result?.user_version ?? 0;

    const sorted = (migrations as Migration[])
        .sort((a, b) => a.version - b.version);

    for (const migration of sorted) {
        if (migration.version > currentVersion) {
            console.log(`🚀 Migration ${migration.version}: ${migration.name}`);

            await db.withTransactionAsync(async () => {
                await migration.up(db);

                await db.runAsync(
                    `INSERT INTO _migrations (name, executed_at) VALUES (?, ?)`,
                    [migration.name, new Date().toISOString()]
                );

                await db.execAsync(`PRAGMA user_version = ${migration.version}`);
            });

            console.log(`✅ Migration ${migration.version} concluída`);
        }
    }
};
