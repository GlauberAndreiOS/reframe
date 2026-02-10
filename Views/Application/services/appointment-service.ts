import api from './api';

// ============= TYPES & INTERFACES =============
export interface Appointment {
	id: string;
	psychologistId: string;
	patientId?: string;
	patientName?: string;
	start: string;
	end: string;
	status: number;
	reason?: string;
}

interface AppointmentRequest {
	slotId: string;
	reason?: string;
}

interface StatusUpdate {
	status: number;
	newStart?: string;
	newEnd?: string;
}

export interface PatientDayStatus {
	dateKey: string; // yyyy-MM-dd
	status: number;
}

interface AssignPatientPayload {
	patientId: string;
}

interface ReschedulePayload {
	newStart: string;
	newEnd: string;
	createIfMissing: boolean;
}

interface PatientReschedulePayload {
	targetSlotId: string;
}

interface SlotsGenerationRequest {
	date: string;
	times: string[];
	durationMinutes: number;
	offsetMinutes: number;
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_SLOTS: '/Appointment/slots',
	REQUEST_APPOINTMENT: '/Appointment/request',
	UPDATE_STATUS: '/Appointment/:id/status',
	GENERATE_SLOTS: '/Appointment/generate-slots',
	ASSIGN_PATIENT: '/Appointment/:id/assign-patient',
	DELETE_SLOT: '/Appointment/:id',
	RESCHEDULE: '/Appointment/:id/reschedule',
	GET_PATIENT_DAY_STATUSES: '/Appointment/patient-day-statuses',
	GET_PATIENT_AVAILABLE_SLOTS: '/Appointment/patient-available-slots',
	PATIENT_RESCHEDULE: '/Appointment/:id/patient-reschedule',
} as const;

const SLOT_DEFAULTS = {
	DURATION_MINUTES: 50,
} as const;

// ============= UTILITY FUNCTIONS =============
const getTimezoneOffset = (): number => {
	return new Date().getTimezoneOffset();
};

const buildSlotsParams = (date: Date) => ({
	date: date.toISOString(),
	offsetMinutes: getTimezoneOffset(),
});

const buildDayStatusParams = (startDate: Date, endDate: Date) => ({
	startDate: startDate.toISOString(),
	endDate: endDate.toISOString(),
	offsetMinutes: getTimezoneOffset(),
});

const buildAvailableSlotsParams = (startDate: Date, endDate: Date, query: string) => ({
	startDate: startDate.toISOString(),
	endDate: endDate.toISOString(),
	offsetMinutes: getTimezoneOffset(),
	query,
});

// ============= SERVICE =============
export const appointmentService = {
	/**
	 * Retrieve available appointment slots for a given date
	 */
	getSlots: (date: Date): Promise<Appointment[]> => {
		return api.get(API_ENDPOINTS.GET_SLOTS, {
			params: buildSlotsParams(date),
		})
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error fetching appointment slots:', error);
				throw error;
			});
	},

	/**
	 * Request an appointment slot
	 */
	requestAppointment: (slotId: string, reason?: string): Promise<any> => {
		const payload: AppointmentRequest = {slotId, reason};

		return api.post(API_ENDPOINTS.REQUEST_APPOINTMENT, payload)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error requesting appointment:', error);
				throw error;
			});
	},

	/**
	 * Update appointment status
	 */
	updateStatus: (
		id: string,
		status: number,
		newStart?: string,
		newEnd?: string
	): Promise<any> => {
		const payload: StatusUpdate = {status, newStart, newEnd};
		const endpoint = API_ENDPOINTS.UPDATE_STATUS.replace(':id', id);

		return api.put(endpoint, payload)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error updating appointment status:', error);
				throw error;
			});
	},

	getPatientDayStatuses: (startDate: Date, endDate: Date): Promise<PatientDayStatus[]> => {
		return api.get(API_ENDPOINTS.GET_PATIENT_DAY_STATUSES, {
			params: buildDayStatusParams(startDate, endDate),
		})
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error fetching patient day statuses:', error);
				throw error;
			});
	},

	getPatientAvailableSlots: (startDate: Date, endDate: Date, query: string): Promise<Appointment[]> => {
		return api.get(API_ENDPOINTS.GET_PATIENT_AVAILABLE_SLOTS, {
			params: buildAvailableSlotsParams(startDate, endDate, query),
		})
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error fetching available slots for patient:', error);
				throw error;
			});
	},

	assignPatient: (slotId: string, patientId: string): Promise<any> => {
		const endpoint = API_ENDPOINTS.ASSIGN_PATIENT.replace(':id', slotId);
		const payload: AssignPatientPayload = {patientId};

		return api.put(endpoint, payload)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error assigning patient to slot:', error);
				throw error;
			});
	},

	deleteSlot: (slotId: string): Promise<any> => {
		const endpoint = API_ENDPOINTS.DELETE_SLOT.replace(':id', slotId);

		return api.delete(endpoint)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error deleting slot:', error);
				throw error;
			});
	},

	rescheduleAppointment: (
		slotId: string,
		newStart: string,
		newEnd: string,
		createIfMissing: boolean = false
	): Promise<any> => {
		const endpoint = API_ENDPOINTS.RESCHEDULE.replace(':id', slotId);
		const payload: ReschedulePayload = {newStart, newEnd, createIfMissing};

		return api.post(endpoint, payload)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error rescheduling appointment:', error);
				throw error;
			});
	},

	patientRescheduleAppointment: (appointmentId: string, targetSlotId: string): Promise<any> => {
		const endpoint = API_ENDPOINTS.PATIENT_RESCHEDULE.replace(':id', appointmentId);
		const payload: PatientReschedulePayload = {targetSlotId};

		return api.post(endpoint, payload)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error rescheduling patient appointment:', error);
				throw error;
			});
	},

	/**
	 * Generate appointment slots for given times
	 */
	generateSlots: (
		date: Date,
		times: string[],
		durationMinutes: number = SLOT_DEFAULTS.DURATION_MINUTES
	): Promise<any> => {
		const payload: SlotsGenerationRequest = {
			date: date.toISOString(),
			times,
			durationMinutes,
			offsetMinutes: getTimezoneOffset(),
		};

		return api.post(API_ENDPOINTS.GENERATE_SLOTS, payload)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error generating appointment slots:', error);
				throw error;
			});
	},
};

// Alias for backward compatibility
export const executeAppointmentService = appointmentService;
