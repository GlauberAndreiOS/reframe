import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const connectDatabase = async () => {
	if (db) return db;

	db = await SQLite.openDatabaseAsync('reframe.db');
	return db;
};

export const getConnection = () => {
	if (!db) throw new Error('Database not connected');
	return db;
};