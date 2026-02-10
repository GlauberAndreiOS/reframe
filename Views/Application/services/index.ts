// ============= MAIN API CLIENT =============
export {default as api, registerUnauthorizedHandler} from './api';

// ============= APPOINTMENT SERVICE =============
export {appointmentService, executeAppointmentService, type Appointment, type PatientDayStatus} from './appointment-service';

// ============= STORAGE SERVICE =============
export {storage, STORAGE_KEYS} from './storage';

// ============= BACKGROUND SYNC TASK SERVICE =============
export {uploadUnsyncedThoughts, SYNC_TASK_NAME} from './TaskService';
