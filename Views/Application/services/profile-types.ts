export interface CommonProfileFields {
	name?: string | null;
	birthDate?: string | null;
	street?: string | null;
	addressNumber?: string | null;
	addressComplement?: string | null;
	neighborhood?: string | null;
	city?: string | null;
	state?: string | null;
	zipCode?: string | null;
	cpf?: string | null;
	biologicalSex?: number | null;
}

export interface PatientDocumentCsvSummaryDto {
	rows: number;
	columns: string[];
}

export interface PatientDocumentDto {
	id: string;
	kind: string;
	displayName?: string | null;
	originalFileName: string;
	mimeType: string;
	extension: string;
	relativePath: string;
	sizeBytes: number;
	uploadedAtUtc: string;
	uploadedByUserId?: string | null;
	csvSummary?: PatientDocumentCsvSummaryDto | null;
}

export interface PatientProfileUpdatePayload extends CommonProfileFields {}

export interface PsychologistProfileUpdatePayload extends CommonProfileFields {
	sessionDurationMinutes?: number | null;
	businessPhone?: string | null;
	specialty?: string | null;
	presentationText?: string | null;
}
