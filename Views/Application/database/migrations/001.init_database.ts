import type * as SQLite from 'expo-sqlite';

export default {
	version: 1,
	name: 'initial_schema',

	up: async (db: SQLite.SQLiteDatabase) => {
		await db.execAsync(`
            CREATE TABLE IF NOT EXISTS automatic_thoughts
            (
                id
                TEXT
                PRIMARY
                KEY
                NOT
                NULL,
                date
                TEXT
                NOT
                NULL,
                situation
                TEXT,
                thought
                TEXT,
                emotion
                TEXT,
                behavior
                TEXT,
                evidencePro
                TEXT,
                evidenceContra
                TEXT,
                alternativeThoughts
                TEXT,
                reevaluation
                TEXT,
                deleted_at
                TEXT,
                synced
                INTEGER
                DEFAULT
                0
            );
        `);
	}
};
