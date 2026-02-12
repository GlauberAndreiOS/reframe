import {
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	RefreshControl,
	View,
	ActivityIndicator,
	Modal,
	TouchableWithoutFeedback,
	TextInput,
	FlatList,
} from 'react-native';
import {useEffect, useState, useCallback} from 'react';
import {ThemedText, ThemedView, DateStrip, IconSymbol, GenerateSlotsModal, Toast} from '@/components';
import {api, appointmentService, Appointment} from '@/services';
import {maskDate} from '@/utils';
import {useThemeColor, useColorScheme} from '@/hooks';

// ============= TYPES & INTERFACES =============
interface ToastState {
	visible: boolean;
	message: string;
	type: 'success' | 'error' | 'info';
}

interface Patient {
	id: string;
	name: string;
}

// ============= CONSTANTS =============
const APPOINTMENT_STATUS = {
	AVAILABLE: 0,
	REQUESTED: 1,
	CONFIRMED: 2,
	CANCELED: 3,
} as const;

const STATUS_COLORS = {
	AVAILABLE: '#27ae60',
	REQUESTED: '#f39c12',
	CONFIRMED: '#2980b9',
	CANCELED: '#c0392b',
} as const;

const STATUS_LABELS = {
	AVAILABLE: 'Vago',
	REQUESTED: 'Solicitado',
	CONFIRMED: 'Agendado',
	CANCELED: 'Cancelado',
} as const;

const MESSAGES = {
	MANAGE_SLOT_TITLE: 'Gerenciar horário',
	REQUEST_SLOT_TITLE: 'Solicitação de agendamento',
	CONFIRMED_SLOT_TITLE: 'Agendamento confirmado',
	RESCHEDULE_TITLE: 'Reagendar',
	CANCEL_CONFIRMED_TITLE: 'Cancelar agendamento',
	DELETE_SLOT: 'Excluir',
	SAVE_SLOT: 'Salvar',
	APPROVE_REQUEST: 'Aprovar',
	REJECT_REQUEST: 'Reprovar',
	RESCHEDULE: 'Reagendar',
	CANCEL_APPOINTMENT: 'Cancelar',
	CONFIRM_CANCEL_MESSAGE: 'Deseja cancelar este agendamento? O horário ficará vago.',
	RESCHEDULE_DATE_LABEL: 'Novo dia (DD/MM/AAAA)',
	RESCHEDULE_TIME_LABEL: 'Novo horário (HH:mm)',
	RESCHEDULE_SUBMIT: 'Salvar',
	CREATE_MISSING_SLOT_TITLE: 'Horário não existe',
	CREATE_MISSING_SLOT_MESSAGE: 'Esse horário não existe. Deseja criar e reagendar para ele?',
	SELECT_PATIENT: 'Selecionar paciente',
	SEARCH_PATIENT: 'Buscar paciente',
	NO_PATIENTS: 'Nenhum paciente encontrado.',
	PATIENT_LABEL: 'Paciente',
	HORARIO_LABEL: 'Horário',
	REQUEST_CONFIRM_MESSAGE: 'Deseja confirmar o agendamento do paciente',
	SUCCESS_ASSIGN: 'Paciente vinculado ao horário.',
	SUCCESS_DELETE_SLOT: 'Horário excluído com sucesso.',
	SUCCESS_APPROVE_REQUEST: 'Agendamento confirmado com sucesso.',
	SUCCESS_REJECT_REQUEST: 'Solicitação reprovada. Horário voltou para vago.',
	SUCCESS_CANCEL_CONFIRMED: 'Agendamento cancelado. Horário voltou para vago.',
	SUCCESS_RESCHEDULE: 'Agendamento reagendado com sucesso.',
	ERROR_ASSIGN: 'Falha ao salvar paciente no horário.',
	ERROR_DELETE_SLOT: 'Falha ao excluir horário.',
	ERROR_APPROVE_REQUEST: 'Falha ao aprovar a solicitação.',
	ERROR_REJECT_REQUEST: 'Falha ao reprovar a solicitação.',
	ERROR_CANCEL_CONFIRMED: 'Falha ao cancelar o agendamento.',
	ERROR_RESCHEDULE: 'Falha ao reagendar o agendamento.',
	INVALID_RESCHEDULE_INPUT: 'Preencha a data e o horário no formato correto.',
	ERROR_LOAD: 'Não foi possível carregar a agenda.',
	ERROR_LOAD_PATIENTS: 'Não foi possível carregar pacientes.',
	GENERATE_SUCCESS: 'Horários gerados com sucesso!',
	GENERATE_EMPTY: 'Nenhum horário pôde ser gerado com esses parâmetros.',
	GENERATE_ERROR: 'Falha ao gerar horários.',
	REQUIRED_PATIENT: 'Selecione um paciente para salvar.',
	EMPTY: 'Nenhum horário configurado para este dia.',
	GENERATE_SLOTS: 'Gerar Horários',
	CANCEL: 'Cancelar',
} as const;

const TIME_FORMAT_OPTIONS = {
	hour: '2-digit' as const,
	minute: '2-digit' as const,
};

const TOAST_DURATION_MS = 3000;

// ============= COMPONENT =============
export default function PsychologistAgendaScreen() {
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';
	const surfaceColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');
	const textColor = useThemeColor({}, 'text');
	const mutedColor = useThemeColor({}, 'muted');
	const inputBackgroundColor = isDark ? '#111417' : '#f9fafb';
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [modalVisible, setModalVisible] = useState(false);
	const [manageModalVisible, setManageModalVisible] = useState(false);
	const [requestDecisionModalVisible, setRequestDecisionModalVisible] = useState(false);
	const [confirmedActionsModalVisible, setConfirmedActionsModalVisible] = useState(false);
	const [cancelConfirmedModalVisible, setCancelConfirmedModalVisible] = useState(false);
	const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
	const [createMissingSlotModalVisible, setCreateMissingSlotModalVisible] = useState(false);
	const [isSavingSlot, setIsSavingSlot] = useState(false);
	const [isDeletingSlot, setIsDeletingSlot] = useState(false);
	const [isProcessingRequestDecision, setIsProcessingRequestDecision] = useState(false);
	const [isProcessingConfirmedActions, setIsProcessingConfirmedActions] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<Appointment | null>(null);
	const [selectedRequestSlot, setSelectedRequestSlot] = useState<Appointment | null>(null);
	const [selectedConfirmedSlot, setSelectedConfirmedSlot] = useState<Appointment | null>(null);
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
	const [patientSearchQuery, setPatientSearchQuery] = useState('');
	const [rescheduleDate, setRescheduleDate] = useState('');
	const [rescheduleTime, setRescheduleTime] = useState('');
	const [pendingReschedule, setPendingReschedule] = useState<{newStart: string; newEnd: string} | null>(null);
	const [toast, setToast] = useState<ToastState>({
		visible: false,
		message: '',
		type: 'info',
	});

	// ============= EFFECTS =============
	useEffect(() => {
		fetchPatients();
	}, []);

	// ============= HANDLERS =============
	const fetchAppointments = useCallback((date: Date, showScreenLoading: boolean = false) => {
		if (showScreenLoading) {
			setLoadingAppointments(true);
		}

		appointmentService.getSlots(date)
			.then((data) => {
				setAppointments(data);
			})
			.catch((error) => {
				console.error('Error fetching appointments:', error);
				showToast(MESSAGES.ERROR_LOAD, 'error');
			})
			.finally(() => {
				if (showScreenLoading) {
					setLoadingAppointments(false);
				}
			});
	}, []);

	useEffect(() => {
		fetchAppointments(selectedDate, true);
	}, [selectedDate, fetchAppointments]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		appointmentService.getSlots(selectedDate)
			.then((data) => {
				setAppointments(data);
			})
			.catch((error) => {
				console.error('Error refreshing appointments:', error);
			})
			.finally(() => {
				setRefreshing(false);
			});
	}, [selectedDate]);

	const fetchPatients = useCallback(() => {
		api.get('/Psychologist/patients')
			.then((response) => {
				setPatients(response.data);
			})
			.catch((error) => {
				console.error('Error fetching patients:', error);
				showToast(MESSAGES.ERROR_LOAD_PATIENTS, 'error');
			});
	}, []);

	const showToast = (message: string, type: 'success' | 'error' | 'info') => {
		setToast({visible: true, message, type});
		setTimeout(() => {
			setToast((prev) => ({...prev, visible: false}));
		}, TOAST_DURATION_MS);
	};

	const handleGenerateSlots = () => {
		setModalVisible(true);
	};

	const handleSelectDate = (date: Date) => {
		const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		setSelectedDate(normalizedDate);
	};

	const confirmGenerateSlots = (
		startStr: string,
		endStr: string,
		mode: 'duration' | 'count',
		value: number,
		breakMinutes: number
	) => {
		setModalVisible(false);
		setGenerating(true);

		const times = generateTimeSlots(startStr, endStr, mode, value, breakMinutes);

		if (times.length === 0) {
			showToast(MESSAGES.GENERATE_EMPTY, 'info');
			setGenerating(false);
			return;
		}

		const duration = calculateDuration(startStr, endStr, mode, value, breakMinutes);

		appointmentService.generateSlots(selectedDate, times, duration)
			.then(() => {
				showToast(MESSAGES.GENERATE_SUCCESS, 'success');
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				console.error('Error generating slots:', error);
				showToast(MESSAGES.GENERATE_ERROR, 'error');
			})
			.finally(() => {
				setGenerating(false);
			});
	};

	const handleSlotPress = (slot: Appointment) => {
		if (slot.status === APPOINTMENT_STATUS.REQUESTED) {
			setSelectedRequestSlot(slot);
			setRequestDecisionModalVisible(true);
			return;
		}
		if (slot.status === APPOINTMENT_STATUS.CONFIRMED) {
			setSelectedConfirmedSlot(slot);
			setConfirmedActionsModalVisible(true);
			return;
		}

		setSelectedSlot(slot);
		setSelectedPatientId(slot.patientId || null);
		setPatientSearchQuery('');
		setManageModalVisible(true);
	};

	const handleCloseManageModal = () => {
		setManageModalVisible(false);
		setSelectedSlot(null);
		setSelectedPatientId(null);
		setPatientSearchQuery('');
	};

	const handleCloseConfirmedActionsModal = () => {
		setConfirmedActionsModalVisible(false);
	};

	const handleCloseCancelConfirmedModal = () => {
		setCancelConfirmedModalVisible(false);
	};

	const handleCloseRescheduleModal = () => {
		setRescheduleModalVisible(false);
	};

	const handleCloseCreateMissingSlotModal = () => {
		setCreateMissingSlotModalVisible(false);
		setPendingReschedule(null);
	};

	const handleCloseRequestDecisionModal = () => {
		setRequestDecisionModalVisible(false);
		setSelectedRequestSlot(null);
	};

	const handleApproveRequestedSlot = () => {
		if (!selectedRequestSlot) {
			return;
		}

		setIsProcessingRequestDecision(true);

		appointmentService.updateStatus(selectedRequestSlot.id, APPOINTMENT_STATUS.CONFIRMED)
			.then(() => {
				showToast(MESSAGES.SUCCESS_APPROVE_REQUEST, 'success');
				handleCloseRequestDecisionModal();
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				console.error('Error approving requested appointment:', error);
				showToast(MESSAGES.ERROR_APPROVE_REQUEST, 'error');
			})
			.finally(() => {
				setIsProcessingRequestDecision(false);
			});
	};

	const handleRejectRequestedSlot = () => {
		if (!selectedRequestSlot) {
			return;
		}

		setIsProcessingRequestDecision(true);

		appointmentService.updateStatus(selectedRequestSlot.id, APPOINTMENT_STATUS.AVAILABLE)
			.then(() => {
				showToast(MESSAGES.SUCCESS_REJECT_REQUEST, 'success');
				handleCloseRequestDecisionModal();
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				console.error('Error rejecting requested appointment:', error);
				showToast(MESSAGES.ERROR_REJECT_REQUEST, 'error');
			})
			.finally(() => {
				setIsProcessingRequestDecision(false);
			});
	};

	const formatDateInput = (date: Date): string => {
		const d = `${date.getDate()}`.padStart(2, '0');
		const m = `${date.getMonth() + 1}`.padStart(2, '0');
		const y = date.getFullYear();
		return `${d}/${m}/${y}`;
	};

	const handleRescheduleDateChange = (value: string) => {
		setRescheduleDate(maskDate(value));
	};

	const formatTimeInput = (date: Date): string => {
		const m = `${date.getMinutes()}`.padStart(2, '0');
		const h = `${date.getHours()}`.padStart(2, '0');
		return `${h}:${m}`;
	};

	const buildReschedulePayload = (slot: Appointment): {newStart: string; newEnd: string} | null => {
		const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(rescheduleDate);
		const timeMatch = /^(\d{2}):(\d{2})$/.exec(rescheduleTime);
		if (!dateMatch || !timeMatch) {
			return null;
		}

		const day = Number(dateMatch[1]);
		const month = Number(dateMatch[2]) - 1;
		const year = Number(dateMatch[3]);
		const hour = Number(timeMatch[1]);
		const minute = Number(timeMatch[2]);

		if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute)) {
			return null;
		}

		if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
			return null;
		}

		const startDate = new Date(year, month, day, hour, minute, 0, 0);

		// Blocks impossible dates like 31/02/2026 after JS auto-adjustment.
		if (
			startDate.getFullYear() !== year ||
			startDate.getMonth() !== month ||
			startDate.getDate() !== day ||
			startDate.getHours() !== hour ||
			startDate.getMinutes() !== minute
		) {
			return null;
		}

		const durationMs = new Date(slot.end).getTime() - new Date(slot.start).getTime();
		const endDate = new Date(startDate.getTime() + durationMs);

		return {
			newStart: startDate.toISOString(),
			newEnd: endDate.toISOString(),
		};
	};

	const handleOpenRescheduleModal = () => {
		if (!selectedConfirmedSlot) {
			return;
		}

		const currentStart = new Date(selectedConfirmedSlot.start);
		setRescheduleDate(formatDateInput(currentStart));
		setRescheduleTime(formatTimeInput(currentStart));
		setConfirmedActionsModalVisible(false);
		setRescheduleModalVisible(true);
	};

	const handleSubmitReschedule = () => {
		if (!selectedConfirmedSlot) {
			return;
		}

		const payload = buildReschedulePayload(selectedConfirmedSlot);
		if (!payload) {
			showToast(MESSAGES.INVALID_RESCHEDULE_INPUT, 'error');
			return;
		}

		setIsProcessingConfirmedActions(true);

		appointmentService
			.rescheduleAppointment(selectedConfirmedSlot.id, payload.newStart, payload.newEnd, false)
			.then(() => {
				showToast(MESSAGES.SUCCESS_RESCHEDULE, 'success');
				setRescheduleModalVisible(false);
				setSelectedConfirmedSlot(null);
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				const statusCode = error?.response?.status;
				if (statusCode === 404) {
					setPendingReschedule(payload);
					setCreateMissingSlotModalVisible(true);
					return;
				}

				console.error('Error rescheduling appointment:', error);
				showToast(MESSAGES.ERROR_RESCHEDULE, 'error');
			})
			.finally(() => {
				setIsProcessingConfirmedActions(false);
			});
	};

	const handleConfirmCreateMissingSlot = () => {
		if (!selectedConfirmedSlot || !pendingReschedule) {
			return;
		}

		setIsProcessingConfirmedActions(true);

		appointmentService
			.rescheduleAppointment(selectedConfirmedSlot.id, pendingReschedule.newStart, pendingReschedule.newEnd, true)
			.then(() => {
				showToast(MESSAGES.SUCCESS_RESCHEDULE, 'success');
				setCreateMissingSlotModalVisible(false);
				setRescheduleModalVisible(false);
				setPendingReschedule(null);
				setSelectedConfirmedSlot(null);
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				console.error('Error creating missing slot and rescheduling:', error);
				showToast(MESSAGES.ERROR_RESCHEDULE, 'error');
			})
			.finally(() => {
				setIsProcessingConfirmedActions(false);
			});
	};

	const handleOpenCancelConfirmedModal = () => {
		setConfirmedActionsModalVisible(false);
		setCancelConfirmedModalVisible(true);
	};

	const handleConfirmCancelConfirmed = () => {
		if (!selectedConfirmedSlot) {
			return;
		}

		setIsProcessingConfirmedActions(true);

		appointmentService.updateStatus(selectedConfirmedSlot.id, APPOINTMENT_STATUS.AVAILABLE)
			.then(() => {
				showToast(MESSAGES.SUCCESS_CANCEL_CONFIRMED, 'success');
				setCancelConfirmedModalVisible(false);
				setSelectedConfirmedSlot(null);
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				console.error('Error canceling confirmed appointment:', error);
				showToast(MESSAGES.ERROR_CANCEL_CONFIRMED, 'error');
			})
			.finally(() => {
				setIsProcessingConfirmedActions(false);
			});
	};

	const handleSaveSlot = () => {
		if (!selectedSlot) {
			return;
		}

		if (!selectedPatientId) {
			showToast(MESSAGES.REQUIRED_PATIENT, 'info');
			return;
		}

		setIsSavingSlot(true);

		appointmentService.assignPatient(selectedSlot.id, selectedPatientId)
			.then(() => {
				showToast(MESSAGES.SUCCESS_ASSIGN, 'success');
				handleCloseManageModal();
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				console.error('Error assigning patient to slot:', error);
				showToast(MESSAGES.ERROR_ASSIGN, 'error');
			})
			.finally(() => {
				setIsSavingSlot(false);
			});
	};

	const handleDeleteSlot = () => {
		if (!selectedSlot) {
			return;
		}

		setIsDeletingSlot(true);

		appointmentService.deleteSlot(selectedSlot.id)
			.then(() => {
				showToast(MESSAGES.SUCCESS_DELETE_SLOT, 'success');
				handleCloseManageModal();
				fetchAppointments(selectedDate);
			})
			.catch((error) => {
				console.error('Error deleting slot:', error);
				showToast(MESSAGES.ERROR_DELETE_SLOT, 'error');
			})
			.finally(() => {
				setIsDeletingSlot(false);
			});
	};

	// ============= UTILITY FUNCTIONS =============
	const parseTime = (timeStr: string): number => {
		const [h, m] = timeStr.split(':').map(Number);
		return h * 60 + m;
	};

	const minutesToTimeStr = (minutes: number): string => {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	};

	const generateTimeSlots = (
		startStr: string,
		endStr: string,
		mode: 'duration' | 'count',
		value: number,
		breakMinutes: number
	): string[] => {
		const startMins = parseTime(startStr);
		const endMins = parseTime(endStr);
		const times: string[] = [];

		if (mode === 'duration') {
			for (let t = startMins; t + value <= endMins; t += value + breakMinutes) {
				times.push(minutesToTimeStr(t));
			}
		} else {
			if (value > 0) {
				const totalMinutes = endMins - startMins;
				const totalBreakMinutes = breakMinutes * (value - 1);
				const duration = Math.floor((totalMinutes - totalBreakMinutes) / value);

				if (duration <= 0) {
					return [];
				}

				for (let i = 0; i < value; i++) {
					const slotStart = startMins + i * (duration + breakMinutes);
					if (slotStart + duration <= endMins) {
						times.push(minutesToTimeStr(slotStart));
					}
				}
			}
		}

		return times;
	};

	const calculateDuration = (
		startStr: string,
		endStr: string,
		mode: 'duration' | 'count',
		value: number,
		breakMinutes: number
	): number => {
		if (mode === 'duration') {
			return value;
		}

		const startMins = parseTime(startStr);
		const endMins = parseTime(endStr);
		const totalMinutes = endMins - startMins;
		const totalBreakMinutes = breakMinutes * (value - 1);
	return Math.floor((totalMinutes - totalBreakMinutes) / value);
	};

	const getSlotStyle = (status: number) => {
		switch (status) {
		case APPOINTMENT_STATUS.REQUESTED:
			return styles.slotCardRequested;
		case APPOINTMENT_STATUS.CONFIRMED:
			return styles.slotCardConfirmed;
		case APPOINTMENT_STATUS.CANCELED:
			return styles.slotCardCanceled;
		default:
			return styles.slotCardAvailable;
		}
	};

	const getStatusInfo = (status: number) => {
		switch (status) {
		case APPOINTMENT_STATUS.REQUESTED:
			return {label: STATUS_LABELS.REQUESTED, color: STATUS_COLORS.REQUESTED};
		case APPOINTMENT_STATUS.CONFIRMED:
			return {label: STATUS_LABELS.CONFIRMED, color: STATUS_COLORS.CONFIRMED};
		case APPOINTMENT_STATUS.CANCELED:
			return {label: STATUS_LABELS.CANCELED, color: STATUS_COLORS.CANCELED};
		default:
			return {label: STATUS_LABELS.AVAILABLE, color: STATUS_COLORS.AVAILABLE};
		}
	};

	const sortedAppointments = [...appointments].sort(
		(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
	);
	const filteredPatients = patients.filter((patient) =>
		patient.name.toLowerCase().includes(patientSearchQuery.toLowerCase())
	);

	// ============= RENDER FUNCTIONS =============
	const renderSlotCard = (slot: Appointment) => {
		const statusInfo = getStatusInfo(slot.status);
		const slotStart = new Date(slot.start).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
		const slotEnd = new Date(slot.end).toLocaleTimeString([], TIME_FORMAT_OPTIONS);

		return (
			<TouchableOpacity
				key={slot.id}
				style={[styles.slotCard, {backgroundColor: surfaceColor}, getSlotStyle(slot.status)]}
				onPress={() => handleSlotPress(slot)}
			>
				<View style={styles.timeContainer}>
					<IconSymbol name="access-time" size={20} color={statusInfo.color}/>
					<View style={styles.timeColumn}>
						<ThemedText style={[styles.timeText, {color: textColor}]}>{slotStart}</ThemedText>
						<ThemedText style={[styles.timeText, {color: textColor}]}>{slotEnd}</ThemedText>
					</View>
				</View>

				<View style={styles.infoContainer}>
					<ThemedText style={[styles.statusText, {color: statusInfo.color}]}>
						{statusInfo.label}
					</ThemedText>
					{slot.patientName && <ThemedText style={[styles.patientName, {color: mutedColor}]}>{slot.patientName}</ThemedText>}
				</View>
			</TouchableOpacity>
		);
	};

	const renderManageModal = () => {
		if (!selectedSlot) {
			return null;
		}

		const slotStart = new Date(selectedSlot.start).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
		const slotEnd = new Date(selectedSlot.end).toLocaleTimeString([], TIME_FORMAT_OPTIONS);

		return (
			<Modal
				visible={manageModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={handleCloseManageModal}
			>
				<TouchableWithoutFeedback onPress={handleCloseManageModal}>
					<View style={styles.manageModalOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.manageModalContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.manageModalTitle}>
										{MESSAGES.MANAGE_SLOT_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={handleCloseManageModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>

								<ThemedText style={styles.manageSlotInfo}>
									{MESSAGES.HORARIO_LABEL}: {slotStart} - {slotEnd}
								</ThemedText>

								<ThemedText style={styles.manageLabel}>{MESSAGES.SELECT_PATIENT}</ThemedText>
								<TextInput
									style={[styles.manageSearchInput, {backgroundColor: inputBackgroundColor, borderColor, color: textColor}]}
									value={patientSearchQuery}
									onChangeText={setPatientSearchQuery}
									placeholder={MESSAGES.SEARCH_PATIENT}
									placeholderTextColor={mutedColor}
								/>

								<FlatList
									data={filteredPatients}
									keyExtractor={(item) => item.id}
									style={styles.managePatientsList}
									ListEmptyComponent={<ThemedText style={styles.manageEmptyPatients}>{MESSAGES.NO_PATIENTS}</ThemedText>}
									renderItem={({item}) => (
										<TouchableOpacity
											style={[
												styles.managePatientItem,
												{borderColor, backgroundColor: surfaceColor},
												selectedPatientId === item.id && styles.managePatientItemSelected,
											]}
											onPress={() => setSelectedPatientId(item.id)}
										>
											<ThemedText style={styles.managePatientName}>{item.name}</ThemedText>
											{selectedPatientId === item.id && (
												<IconSymbol name="checkmark.circle.fill" size={20} color="#0a7ea4"/>
											)}
										</TouchableOpacity>
									)}
								/>

								<View style={styles.manageActions}>
									<TouchableOpacity
										style={[styles.manageActionButton, styles.manageDeleteButton]}
										onPress={handleDeleteSlot}
										disabled={isSavingSlot || isDeletingSlot}
									>
										{isDeletingSlot ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.manageActionButtonText}>{MESSAGES.DELETE_SLOT}</ThemedText>
										)}
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.manageActionButton, styles.manageSaveButton]}
										onPress={handleSaveSlot}
										disabled={isSavingSlot || isDeletingSlot}
									>
										{isSavingSlot ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.manageActionButtonText}>{MESSAGES.SAVE_SLOT}</ThemedText>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	const renderRequestDecisionModal = () => {
		if (!selectedRequestSlot) {
			return null;
		}

		const slotStart = new Date(selectedRequestSlot.start).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
		const slotEnd = new Date(selectedRequestSlot.end).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
		const patientName = selectedRequestSlot.patientName || 'Paciente';

		return (
			<Modal
				visible={requestDecisionModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={handleCloseRequestDecisionModal}
			>
				<TouchableWithoutFeedback onPress={handleCloseRequestDecisionModal}>
					<View style={styles.requestDecisionOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.requestDecisionContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.requestDecisionTitle}>
										{MESSAGES.REQUEST_SLOT_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={handleCloseRequestDecisionModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>

								<ThemedText style={styles.requestDecisionMessage}>
									{MESSAGES.REQUEST_CONFIRM_MESSAGE} {patientName}?
								</ThemedText>
								<ThemedText style={styles.requestDecisionInfo}>
									{MESSAGES.HORARIO_LABEL}: {slotStart} - {slotEnd}
								</ThemedText>

								<View style={styles.requestDecisionActions}>
									<TouchableOpacity
										style={[styles.requestDecisionButton, styles.requestDecisionRejectButton]}
										onPress={handleRejectRequestedSlot}
										disabled={isProcessingRequestDecision}
									>
										{isProcessingRequestDecision ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.requestDecisionActionText}>{MESSAGES.REJECT_REQUEST}</ThemedText>
										)}
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.requestDecisionButton, styles.requestDecisionApproveButton]}
										onPress={handleApproveRequestedSlot}
										disabled={isProcessingRequestDecision}
									>
										{isProcessingRequestDecision ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.requestDecisionActionText}>{MESSAGES.APPROVE_REQUEST}</ThemedText>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	const renderConfirmedActionsModal = () => {
		if (!selectedConfirmedSlot) {
			return null;
		}

		const slotStart = new Date(selectedConfirmedSlot.start).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
		const slotEnd = new Date(selectedConfirmedSlot.end).toLocaleTimeString([], TIME_FORMAT_OPTIONS);

		return (
			<Modal
				visible={confirmedActionsModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={handleCloseConfirmedActionsModal}
			>
				<TouchableWithoutFeedback onPress={handleCloseConfirmedActionsModal}>
					<View style={styles.requestDecisionOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.requestDecisionContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.requestDecisionTitle}>
										{MESSAGES.CONFIRMED_SLOT_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={handleCloseConfirmedActionsModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>
								<ThemedText style={styles.requestDecisionInfo}>
									{MESSAGES.HORARIO_LABEL}: {slotStart} - {slotEnd}
								</ThemedText>
								{selectedConfirmedSlot.patientName && (
									<ThemedText style={styles.requestDecisionMessage}>
										{MESSAGES.PATIENT_LABEL}: {selectedConfirmedSlot.patientName}
									</ThemedText>
								)}
								<View style={styles.requestDecisionActions}>
									<TouchableOpacity
										style={[styles.requestDecisionButton, styles.requestDecisionRejectButton]}
										onPress={handleOpenCancelConfirmedModal}
									>
										<ThemedText style={styles.requestDecisionActionText}>{MESSAGES.CANCEL_APPOINTMENT}</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.requestDecisionButton, styles.requestDecisionApproveButton]}
										onPress={handleOpenRescheduleModal}
									>
										<ThemedText style={styles.requestDecisionActionText}>{MESSAGES.RESCHEDULE}</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	const renderCancelConfirmedModal = () => {
		if (!selectedConfirmedSlot) {
			return null;
		}

		return (
			<Modal
				visible={cancelConfirmedModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={handleCloseCancelConfirmedModal}
			>
				<TouchableWithoutFeedback onPress={handleCloseCancelConfirmedModal}>
					<View style={styles.requestDecisionOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.requestDecisionContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.requestDecisionTitle}>
										{MESSAGES.CANCEL_CONFIRMED_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={handleCloseCancelConfirmedModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>
								<ThemedText style={styles.requestDecisionMessage}>
									{MESSAGES.CONFIRM_CANCEL_MESSAGE}
								</ThemedText>
								<View style={styles.requestDecisionActions}>
									<TouchableOpacity
										style={[styles.requestDecisionButton, styles.requestDecisionRejectButton]}
										onPress={handleConfirmCancelConfirmed}
										disabled={isProcessingConfirmedActions}
									>
										{isProcessingConfirmedActions ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.requestDecisionActionText}>{MESSAGES.CANCEL_APPOINTMENT}</ThemedText>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	const renderRescheduleModal = () => {
		if (!selectedConfirmedSlot) {
			return null;
		}

		return (
			<Modal
				visible={rescheduleModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={handleCloseRescheduleModal}
			>
				<TouchableWithoutFeedback onPress={handleCloseRescheduleModal}>
					<View style={styles.manageModalOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.manageModalContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.manageModalTitle}>
										{MESSAGES.RESCHEDULE_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={handleCloseRescheduleModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>

								<ThemedText style={styles.manageLabel}>{MESSAGES.RESCHEDULE_DATE_LABEL}</ThemedText>
								<TextInput
									style={[styles.manageSearchInput, {backgroundColor: inputBackgroundColor, borderColor, color: textColor}]}
									value={rescheduleDate}
									onChangeText={handleRescheduleDateChange}
									placeholder="10/02/2026"
									placeholderTextColor={mutedColor}
								/>

								<ThemedText style={styles.manageLabel}>{MESSAGES.RESCHEDULE_TIME_LABEL}</ThemedText>
								<TextInput
									style={[styles.manageSearchInput, {backgroundColor: inputBackgroundColor, borderColor, color: textColor}]}
									value={rescheduleTime}
									onChangeText={setRescheduleTime}
									placeholder="09:00"
									placeholderTextColor={mutedColor}
								/>

								<View style={styles.manageActions}>
									<TouchableOpacity
										style={[styles.manageActionButton, styles.manageSaveButton]}
										onPress={handleSubmitReschedule}
										disabled={isProcessingConfirmedActions}
									>
										{isProcessingConfirmedActions ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.manageActionButtonText}>{MESSAGES.RESCHEDULE_SUBMIT}</ThemedText>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	const renderCreateMissingSlotModal = () => {
		if (!selectedConfirmedSlot || !pendingReschedule) {
			return null;
		}

		return (
			<Modal
				visible={createMissingSlotModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={handleCloseCreateMissingSlotModal}
			>
				<TouchableWithoutFeedback onPress={handleCloseCreateMissingSlotModal}>
					<View style={styles.requestDecisionOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.requestDecisionContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.requestDecisionTitle}>
										{MESSAGES.CREATE_MISSING_SLOT_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={handleCloseCreateMissingSlotModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>
								<ThemedText style={styles.requestDecisionMessage}>
									{MESSAGES.CREATE_MISSING_SLOT_MESSAGE}
								</ThemedText>
								<View style={styles.requestDecisionActions}>
									<TouchableOpacity
										style={[styles.requestDecisionButton, styles.requestDecisionApproveButton]}
										onPress={handleConfirmCreateMissingSlot}
										disabled={isProcessingConfirmedActions}
									>
										{isProcessingConfirmedActions ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.requestDecisionActionText}>{MESSAGES.SAVE_SLOT}</ThemedText>
										)}
									</TouchableOpacity>
								</View>
							</View>
						</TouchableWithoutFeedback>
					</View>
				</TouchableWithoutFeedback>
			</Modal>
		);
	};

	const renderEmptyState = () => (
		<View style={styles.emptyContainer}>
			<ThemedText style={styles.emptyText}>{MESSAGES.EMPTY}</ThemedText>
			<TouchableOpacity style={styles.createButton} onPress={handleGenerateSlots}>
				<ThemedText style={styles.createButtonText}>{MESSAGES.GENERATE_SLOTS}</ThemedText>
			</TouchableOpacity>
		</View>
	);

	const renderContent = () => {
		return sortedAppointments.length === 0 ? renderEmptyState() : sortedAppointments.map(renderSlotCard);
	};

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="title">Agenda do Psicólogo</ThemedText>
				<TouchableOpacity onPress={handleGenerateSlots} disabled={generating} style={styles.genButton}>
					{generating ? (
						<ActivityIndicator size="small" color="#fff"/>
					) : (
						<IconSymbol name="plus" size={24} color="#fff"/>
					)}
				</TouchableOpacity>
			</View>

			<DateStrip selectedDate={selectedDate} onSelectDate={handleSelectDate}/>

			<ScrollView
				key={selectedDate.toDateString()}
				contentContainerStyle={styles.content}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
			>
				{loadingAppointments ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color="#0a7ea4"/>
					</View>
				) : (
					renderContent()
				)}
			</ScrollView>

			<GenerateSlotsModal
				visible={modalVisible}
				onConfirm={confirmGenerateSlots}
				onCancel={() => setModalVisible(false)}
			/>
			{renderManageModal()}
			{renderRequestDecisionModal()}
			{renderConfirmedActionsModal()}
			{renderCancelConfirmedModal()}
			{renderRescheduleModal()}
			{renderCreateMissingSlotModal()}
			{toast.visible && <Toast message={toast.message} type={toast.type}/>}
		</ThemedView>
	);
}

// ============= STYLES =============
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingTop: 60,
		paddingHorizontal: 20,
		paddingBottom: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	genButton: {
		backgroundColor: '#0a7ea4',
		padding: 8,
		borderRadius: 20,
	},
	content: {
		padding: 16,
		paddingBottom: 130,
	},
	loadingContainer: {
		paddingTop: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyContainer: {
		alignItems: 'center',
		marginTop: 40,
	},
	emptyText: {
		textAlign: 'center',
		opacity: 0.5,
		marginBottom: 20,
	},
	createButton: {
		backgroundColor: '#0a7ea4',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	createButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	slotCard: {
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 2},
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
		borderLeftWidth: 4,
	},
	slotCardAvailable: {
		borderLeftColor: '#27ae60',
	},
	slotCardRequested: {
		borderLeftColor: '#f39c12',
	},
	slotCardConfirmed: {
		borderLeftColor: '#2980b9',
	},
	slotCardCanceled: {
		borderLeftColor: '#c0392b',
		opacity: 0.7,
	},
	timeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	timeColumn: {
		justifyContent: 'center',
	},
	timeText: {
		fontSize: 16,
		fontWeight: '600',
	},
	infoContainer: {
		alignItems: 'flex-end',
	},
	statusText: {
		fontWeight: 'bold',
		marginBottom: 4,
	},
	patientName: {
		fontSize: 14,
		opacity: 0.8,
	},
	manageModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	manageModalContent: {
		borderRadius: 16,
		padding: 16,
		maxHeight: '80%',
		borderWidth: 1,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	modalCloseButton: {
		padding: 2,
	},
	manageModalTitle: {
		marginBottom: 8,
	},
	manageSlotInfo: {
		marginBottom: 12,
		opacity: 0.8,
	},
	manageLabel: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 8,
	},
	manageSearchInput: {
		height: 42,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		marginBottom: 12,
	},
	managePatientsList: {
		maxHeight: 260,
		marginBottom: 16,
	},
	manageEmptyPatients: {
		textAlign: 'center',
		opacity: 0.6,
		paddingVertical: 20,
	},
	managePatientItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		borderRadius: 10,
		marginBottom: 8,
	},
	managePatientItemSelected: {
		borderColor: '#0a7ea4',
		backgroundColor: '#0a7ea415',
	},
	managePatientName: {
		flex: 1,
	},
	manageActions: {
		flexDirection: 'row',
		gap: 8,
	},
	manageActionButton: {
		flex: 1,
		borderRadius: 10,
		minHeight: 48,
		paddingHorizontal: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	manageCancelButton: {
		backgroundColor: '#f3f4f6',
	},
	manageCancelButtonText: {
		color: '#374151',
		fontWeight: '600',
	},
	manageDeleteButton: {
		backgroundColor: '#dc2626',
	},
	manageSaveButton: {
		backgroundColor: '#0a7ea4',
	},
	manageActionButtonText: {
		color: '#fff',
		fontWeight: '700',
		textAlign: 'center',
	},
	requestDecisionOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	requestDecisionContent: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
	},
	requestDecisionTitle: {
		marginBottom: 8,
	},
	requestDecisionMessage: {
		marginBottom: 8,
		opacity: 0.9,
	},
	requestDecisionInfo: {
		marginBottom: 16,
		opacity: 0.75,
	},
	requestDecisionActions: {
		flexDirection: 'row',
		gap: 8,
	},
	requestDecisionButton: {
		flex: 1,
		borderRadius: 10,
		minHeight: 48,
		paddingHorizontal: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	requestDecisionCancelButton: {
		backgroundColor: '#f3f4f6',
	},
	requestDecisionRejectButton: {
		backgroundColor: '#dc2626',
	},
	requestDecisionApproveButton: {
		backgroundColor: '#0a7ea4',
	},
	requestDecisionCancelText: {
		color: '#374151',
		fontWeight: '600',
	},
	requestDecisionActionText: {
		color: '#fff',
		fontWeight: '700',
		textAlign: 'center',
	},
});
