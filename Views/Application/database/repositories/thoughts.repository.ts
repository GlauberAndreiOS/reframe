import {getConnection} from '../connection';
import {randomUUID} from 'expo-crypto';

const TABLE = 'automatic_thoughts';

export type ThoughtSchema = {
    id: string;
    date: string;
    situation: string;
    thought: string;
    emotion: string;
    behavior: string;
    evidencePro: string;
    evidenceContra: string;
    alternativeThoughts: string;
    reevaluation: string;
    deleted_at: string | null;
    synced: number;
};

export type CreateThoughtDTO = Omit<ThoughtSchema, 'id' | 'date' | 'deleted_at' | 'synced'>;

export const thoughtsRepository = {
	async create(dto: CreateThoughtDTO) {
		const db = getConnection();
		const newRecord: ThoughtSchema = {
			id: randomUUID(),
			date: new Date().toISOString(),
			...dto,
			deleted_at: null,
			synced: 0,
		};

		await db.runAsync(
			`INSERT INTO ${TABLE} (id, date, situation, thought, emotion, behavior, evidencePro, evidenceContra,
                                   alternativeThoughts, reevaluation, deleted_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				newRecord.id,
				newRecord.date,
				newRecord.situation,
				newRecord.thought,
				newRecord.emotion,
				newRecord.behavior,
				newRecord.evidencePro,
				newRecord.evidenceContra,
				newRecord.alternativeThoughts,
				newRecord.reevaluation,
				newRecord.deleted_at,
				newRecord.synced,
			]
		);
		return newRecord;
	},

	async findAllActive(): Promise<ThoughtSchema[]> {
		const db = getConnection();
		return db.getAllAsync(
			`SELECT *
             FROM ${TABLE}
             WHERE deleted_at IS NULL
             ORDER BY date DESC`
		);
	},

	async findById(id: string) {
		const db = getConnection();
		return db.getFirstAsync<ThoughtSchema>(
			`SELECT *
             FROM ${TABLE}
             WHERE id = ?`,
			[id]
		);
	},

	async upsert(records: any[]) {
		const db = getConnection();
		for (const record of records) {
			const deletedAt = record.deletedAt || record.deleted_at || null;

			await db.runAsync(
				`INSERT
                OR REPLACE INTO
                ${TABLE}
                (
                id,
                date,
                situation,
                thought,
                emotion,
                behavior,
                evidencePro,
                evidenceContra,
                alternativeThoughts,
                reevaluation,
                deleted_at,
                synced
                )
                VALUES
                (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
                )`,
				[
					record.id,
					record.date,
					record.situation,
					record.thought,
					record.emotion,
					record.behavior,
					record.evidencePro,
					record.evidenceContra,
					record.alternativeThoughts,
					record.reevaluation,
					deletedAt,
					1,
				]
			);
		}
	},

	async update(id: string, data: Partial<ThoughtSchema>) {
		const db = getConnection();
		const fields = Object.keys(data)
			.map(k => `${k} = ?`)
			.join(', ');
		const values = Object.values(data);
		await db.runAsync(
			`UPDATE ${TABLE}
             SET ${fields}
             WHERE id = ?`,
			[...values, id]
		);
	},

	async softDelete(id: string) {
		const db = getConnection();
		await db.runAsync(
			`UPDATE ${TABLE}
             SET deleted_at = ?,
                 synced     = 0
             WHERE id = ?`,
			[new Date().toISOString(), id]
		);
	},

	async markAsSynced(ids: string[]) {
		const db = getConnection();
		const placeholders = ids.map(() => '?').join(',');
		await db.runAsync(
			`UPDATE ${TABLE}
             SET synced = 1
             WHERE id IN (${placeholders})`,
			ids
		);
	},

	async markAsFailed(ids: string[]) {
		const db = getConnection();
		const placeholders = ids.map(() => '?').join(',');
		await db.runAsync(
			`UPDATE ${TABLE}
             SET synced = -1
             WHERE id IN (${placeholders})`,
			ids
		);
	},

	async getUnsynced(): Promise<ThoughtSchema[]> {
		const db = getConnection();
		return db.getAllAsync<ThoughtSchema>(
			`SELECT *
             FROM ${TABLE}
             WHERE synced = 0`
		);
	}
};
