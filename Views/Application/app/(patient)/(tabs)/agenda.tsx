import {StyleSheet, ScrollView, TouchableOpacity, RefreshControl, View, Modal, TouchableWithoutFeedback, ActivityIndicator, FlatList, TextInput} from 'react-native';
import {useEffect, useState, useCallback} from 'react';
import {ThemedText, ThemedView, DateStrip, IconSymbol, Toast} from '@/components';
import {appointmentService, Appointment, PatientDayStatus} from '@/services';
import {useThemeColor, useColorScheme} from '@/hooks';

// ============= TYPES & INTERFACES =============
interface SlotStatus {
	isAvailable: boolean;
	isRequested: boolean;
	isConfirmed: boolean;
}

interface ToastState {
	visible: boolean;
	message: string;
	type: 'success' | 'error' | 'info';
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
} as const;

const MESSAGES = {
	CONFIRM_REQUEST: 'Deseja solicitar agendamento para',
	CONFIRM_TITLE: 'Confirmar Solicitação',
	CANCEL_REQUEST_TITLE: 'Cancelar solicitação',
	CANCEL_REQUEST_MESSAGE: 'Deseja cancelar esta solicitação?',
	CONFIRMED_ACTIONS_TITLE: 'Agendamento confirmado',
	CANCEL_CONFIRMED_TITLE: 'Cancelar agendamento',
	CANCEL_CONFIRMED_MESSAGE: 'Deseja cancelar este agendamento? O horário ficará vago.',
	RESCHEDULE_TITLE: 'Reagendar agendamento',
	RESCHEDULE_SEARCH_PLACEHOLDER: 'Digite dia, data ou horário',
	RESCHEDULE_EMPTY: 'Nenhum horário vago encontrado.',
	RESCHEDULE_ACTION: 'Reagendar',
	CANCEL_ACTION: 'Cancelar',
	SUCCESS_REQUEST: 'Solicitação enviada!',
	SUCCESS_CANCEL_REQUEST: 'Solicitação cancelada.',
	SUCCESS_RESCHEDULE: 'Solicitação de reagendamento enviada!',
	SUCCESS_CANCEL: 'Agendamento cancelado.',
	ERROR_LOAD: 'Não foi possível carregar a agenda.',
	ERROR_REQUEST: 'Não foi possível solicitar o agendamento.',
	ERROR_CANCEL_REQUEST: 'Não foi possível cancelar a solicitação.',
	ERROR_RESCHEDULE: 'Não foi possível reagendar.',
	ERROR_CANCEL: 'Não foi possível cancelar o agendamento.',
	ERROR_LOAD_AVAILABLE: 'Não foi possível buscar horários vagos.',
	EMPTY: 'Nenhum horário disponível para este dia.',
	CANCEL: 'Cancelar',
	REQUEST: 'Solicitar',
} as const;

const TIME_FORMAT_OPTIONS = {
	hour: '2-digit' as const,
	minute: '2-digit' as const,
};

const TOAST_DURATION_MS = 3000;

// ============= COMPONENT =============
export default function PatientAgendaScreen() {
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';
	const surfaceColor = useThemeColor({}, 'surface');
	const borderColor = useThemeColor({}, 'border');
	const textColor = useThemeColor({}, 'text');
	const mutedColor = useThemeColor({}, 'muted');
	const inputBackgroundColor = isDark ? '#111417' : '#f9fafb';
	const [selectedDate, setSelectedDate] = useState(new Date());
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [dayStatusMap, setDayStatusMap] = useState<Record<string, 'requested' | 'confirmed' | 'rejected'>>({});
	const [loadingAppointments, setLoadingAppointments] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [requestModalVisible, setRequestModalVisible] = useState(false);
	const [cancelRequestModalVisible, setCancelRequestModalVisible] = useState(false);
	const [confirmedActionsModalVisible, setConfirmedActionsModalVisible] = useState(false);
	const [cancelConfirmedModalVisible, setCancelConfirmedModalVisible] = useState(false);
	const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
	const [selectedSlot, setSelectedSlot] = useState<Appointment | null>(null);
	const [selectedRequestedSlot, setSelectedRequestedSlot] = useState<Appointment | null>(null);
	const [selectedConfirmedSlot, setSelectedConfirmedSlot] = useState<Appointment | null>(null);
	const [isRequesting, setIsRequesting] = useState(false);
	const [isCancellingRequest, setIsCancellingRequest] = useState(false);
	const [isRescheduling, setIsRescheduling] = useState(false);
	const [isCancellingConfirmed, setIsCancellingConfirmed] = useState(false);
	const [rescheduleSearch, setRescheduleSearch] = useState('');
	const [availableSlots, setAvailableSlots] = useState<Appointment[]>([]);
	const [loadingAvailableSlots, setLoadingAvailableSlots] = useState(false);
	const [toast, setToast] = useState<ToastState>({
		visible: false,
		message: '',
		type: 'info',
	});

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

	const fetchDayStatuses = useCallback(() => {
		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + 29);

		appointmentService
			.getPatientDayStatuses(startDate, endDate)
			.then((statuses: PatientDayStatus[]) => {
				const nextMap: Record<string, 'requested' | 'confirmed' | 'rejected'> = {};
				statuses.forEach((item) => {
					if (item.status === APPOINTMENT_STATUS.CONFIRMED) {
						nextMap[item.dateKey] = 'confirmed';
					} else if (item.status === APPOINTMENT_STATUS.REQUESTED) {
						nextMap[item.dateKey] = 'requested';
					} else if (item.status === APPOINTMENT_STATUS.CANCELED) {
						nextMap[item.dateKey] = 'rejected';
					}
				});
				setDayStatusMap(nextMap);
			})
			.catch((error) => {
				console.error('Error fetching day statuses:', error);
			});
	}, []);

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
		fetchDayStatuses();
	}, [selectedDate, fetchDayStatuses]);

	const handleSelectDate = (date: Date) => {
		const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		setSelectedDate(normalizedDate);
	};

	const handleRequestAppointment = (slot: Appointment) => {
		setSelectedSlot(slot);
		setRequestModalVisible(true);
	};

	const handleOpenConfirmedActions = (slot: Appointment) => {
		setSelectedConfirmedSlot(slot);
		setConfirmedActionsModalVisible(true);
	};

	const handleOpenCancelRequest = (slot: Appointment) => {
		setSelectedRequestedSlot(slot);
		setCancelRequestModalVisible(true);
	};

	const closeConfirmedActionsModal = () => {
		setConfirmedActionsModalVisible(false);
	};

	const closeCancelRequestModal = () => {
		setCancelRequestModalVisible(false);
		setSelectedRequestedSlot(null);
	};

	const closeCancelConfirmedModal = () => {
		setCancelConfirmedModalVisible(false);
	};

	const closeRescheduleModal = () => {
		setRescheduleModalVisible(false);
		setRescheduleSearch('');
		setAvailableSlots([]);
	};

	const fetchAvailableSlots = useCallback((query: string) => {
		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(startDate);
		endDate.setDate(endDate.getDate() + 29);

		setLoadingAvailableSlots(true);
		appointmentService
			.getPatientAvailableSlots(startDate, endDate, query)
			.then((data) => {
				setAvailableSlots(data);
			})
			.catch((error) => {
				console.error('Error loading available slots:', error);
				showToast(MESSAGES.ERROR_LOAD_AVAILABLE, 'error');
			})
			.finally(() => {
				setLoadingAvailableSlots(false);
			});
	}, []);

	const openRescheduleModal = () => {
		setConfirmedActionsModalVisible(false);
		setRescheduleModalVisible(true);
		fetchAvailableSlots('');
	};

	const openCancelConfirmedModal = () => {
		setConfirmedActionsModalVisible(false);
		setCancelConfirmedModalVisible(true);
	};

	const showToast = (message: string, type: 'success' | 'error' | 'info') => {
		setToast({visible: true, message, type});
		setTimeout(() => {
			setToast((prev) => ({...prev, visible: false}));
		}, TOAST_DURATION_MS);
	};

	// ============= EFFECTS =============
	useEffect(() => {
		fetchAppointments(selectedDate, true);
	}, [selectedDate, fetchAppointments]);

	useEffect(() => {
		fetchDayStatuses();
	}, [fetchDayStatuses]);

	useEffect(() => {
		if (!rescheduleModalVisible) return;

		const timer = setTimeout(() => {
			fetchAvailableSlots(rescheduleSearch.trim());
		}, 250);

		return () => clearTimeout(timer);
	}, [rescheduleSearch, rescheduleModalVisible, fetchAvailableSlots]);

	const closeRequestModal = () => {
		setRequestModalVisible(false);
		setSelectedSlot(null);
	};

	const confirmRequestAppointment = (slotId: string) => {
		setIsRequesting(true);
		appointmentService.requestAppointment(slotId)
			.then(() => {
				showToast(MESSAGES.SUCCESS_REQUEST, 'success');
				closeRequestModal();
				fetchAppointments(selectedDate);
				fetchDayStatuses();
			})
			.catch((error) => {
				console.error('Error requesting appointment:', error);
				showToast(MESSAGES.ERROR_REQUEST, 'error');
			})
			.finally(() => {
				setIsRequesting(false);
			});
	};

	const confirmCancelRequestedAppointment = () => {
		if (!selectedRequestedSlot) return;

		setIsCancellingRequest(true);
		appointmentService.updateStatus(selectedRequestedSlot.id, APPOINTMENT_STATUS.AVAILABLE)
			.then(() => {
				showToast(MESSAGES.SUCCESS_CANCEL_REQUEST, 'success');
				closeCancelRequestModal();
				fetchAppointments(selectedDate);
				fetchDayStatuses();
			})
			.catch((error) => {
				console.error('Error canceling requested appointment:', error);
				showToast(MESSAGES.ERROR_CANCEL_REQUEST, 'error');
			})
			.finally(() => {
				setIsCancellingRequest(false);
			});
	};

	const confirmCancelConfirmedAppointment = () => {
		if (!selectedConfirmedSlot) return;

		setIsCancellingConfirmed(true);
		appointmentService.updateStatus(selectedConfirmedSlot.id, APPOINTMENT_STATUS.AVAILABLE)
			.then(() => {
				showToast(MESSAGES.SUCCESS_CANCEL, 'success');
				setCancelConfirmedModalVisible(false);
				setSelectedConfirmedSlot(null);
				fetchAppointments(selectedDate);
				fetchDayStatuses();
			})
			.catch((error) => {
				console.error('Error canceling confirmed appointment:', error);
				showToast(MESSAGES.ERROR_CANCEL, 'error');
			})
			.finally(() => {
				setIsCancellingConfirmed(false);
			});
	};

	const confirmPatientReschedule = (targetSlotId: string) => {
		if (!selectedConfirmedSlot) return;

		setIsRescheduling(true);
		appointmentService.patientRescheduleAppointment(selectedConfirmedSlot.id, targetSlotId)
			.then(() => {
				showToast(MESSAGES.SUCCESS_RESCHEDULE, 'success');
				setSelectedConfirmedSlot(null);
				closeRescheduleModal();
				fetchAppointments(selectedDate);
				fetchDayStatuses();
			})
			.catch((error) => {
				console.error('Error rescheduling appointment:', error);
				showToast(MESSAGES.ERROR_RESCHEDULE, 'error');
			})
			.finally(() => {
				setIsRescheduling(false);
			});
	};

	// ============= UTILITY FUNCTIONS =============
	const getSlotStatus = (slot: Appointment): SlotStatus => ({
		isAvailable: slot.status === APPOINTMENT_STATUS.AVAILABLE,
		isRequested: slot.status === APPOINTMENT_STATUS.REQUESTED,
		isConfirmed: slot.status === APPOINTMENT_STATUS.CONFIRMED,
	});

	const getStatusText = (status: SlotStatus): string => {
		if (status.isAvailable) return 'Vago';
		if (status.isRequested) return 'Solicitado';
		if (status.isConfirmed) return 'Agendado';
		return '';
	};

	const getStatusColor = (status: SlotStatus): string => {
		if (status.isAvailable) return STATUS_COLORS.AVAILABLE;
		if (status.isRequested) return STATUS_COLORS.REQUESTED;
		return STATUS_COLORS.CONFIRMED;
	};

	const sortedAppointments = [...appointments].sort(
		(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
	);

	// ============= RENDER FUNCTIONS =============
	const renderRequestModal = () => {
		if (!selectedSlot) {
			return null;
		}

		const slotTime = new Date(selectedSlot.start).toLocaleTimeString([], TIME_FORMAT_OPTIONS);

		return (
			<Modal
				visible={requestModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={closeRequestModal}
			>
				<TouchableWithoutFeedback onPress={closeRequestModal}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback>
								<View style={[styles.modalContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.modalTitle}>
										{MESSAGES.CONFIRM_TITLE}
									</ThemedText>
										<TouchableOpacity onPress={closeRequestModal} style={styles.modalCloseButton}>
											<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
										</TouchableOpacity>
								</View>
								<ThemedText style={styles.modalMessage}>
									{MESSAGES.CONFIRM_REQUEST} {slotTime}?
								</ThemedText>
								<View style={styles.modalActions}>
									<TouchableOpacity
										style={[styles.modalButton, styles.modalConfirmButton]}
										onPress={() => confirmRequestAppointment(selectedSlot.id)}
										disabled={isRequesting}
									>
										{isRequesting ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.modalConfirmText}>{MESSAGES.REQUEST}</ThemedText>
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

	const renderSlotCard = (slot: Appointment) => {
		const status = getSlotStatus(slot);
		const statusColor = getStatusColor(status);
		const slotStart = new Date(slot.start).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
		const slotEnd = new Date(slot.end).toLocaleTimeString([], TIME_FORMAT_OPTIONS);

		return (
			<TouchableOpacity
				key={slot.id}
				style={[
					styles.slotCard,
					{backgroundColor: surfaceColor},
					status.isAvailable && styles.slotCardAvailable,
					!status.isAvailable && styles.slotCardMuted,
					!status.isAvailable && {
						backgroundColor: isDark ? '#23282d' : '#f5f5f5',
						borderLeftColor: isDark ? '#4b5563' : '#ccc',
					},
					status.isConfirmed && styles.slotCardConfirmed,
					status.isRequested && styles.slotCardRequested,
				]}
				onPress={() => {
					if (status.isAvailable) {
						handleRequestAppointment(slot);
						return;
					}
					if (status.isRequested) {
						handleOpenCancelRequest(slot);
						return;
					}
					if (status.isConfirmed) {
						handleOpenConfirmedActions(slot);
					}
				}}
				disabled={!status.isAvailable && !status.isConfirmed && !status.isRequested}
			>
				<View style={styles.timeContainer}>
					<IconSymbol
						name="access-time"
						size={20}
						color={statusColor}
					/>
					<View style={styles.timeColumn}>
						<ThemedText style={[styles.timeText, !status.isAvailable && styles.mutedText]}>
							{slotStart}
						</ThemedText>
						<ThemedText style={[styles.timeText, !status.isAvailable && styles.mutedText]}>
							{slotEnd}
						</ThemedText>
					</View>
				</View>

				<View style={styles.statusContainer}>
					<ThemedText
						style={[
							styles.statusText,
							{color: statusColor},
						]}
					>
						{getStatusText(status)}
					</ThemedText>
				</View>
			</TouchableOpacity>
		);
	};

	const renderConfirmedActionsModal = () => {
		if (!selectedConfirmedSlot) return null;

		const slotStart = new Date(selectedConfirmedSlot.start).toLocaleTimeString([], TIME_FORMAT_OPTIONS);
		const slotEnd = new Date(selectedConfirmedSlot.end).toLocaleTimeString([], TIME_FORMAT_OPTIONS);

		return (
			<Modal
				visible={confirmedActionsModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={closeConfirmedActionsModal}
			>
				<TouchableWithoutFeedback onPress={closeConfirmedActionsModal}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.modalContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.modalTitle}>
										{MESSAGES.CONFIRMED_ACTIONS_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={closeConfirmedActionsModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>
								<ThemedText style={styles.modalMessage}>
									{slotStart} - {slotEnd}
								</ThemedText>
								<View style={styles.modalActions}>
									<TouchableOpacity style={[styles.modalButton, styles.modalCancelActionButton]} onPress={openCancelConfirmedModal}>
										<ThemedText style={styles.modalConfirmText}>{MESSAGES.CANCEL_ACTION}</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.modalButton, styles.modalConfirmButton]} onPress={openRescheduleModal}>
										<ThemedText style={styles.modalConfirmText}>{MESSAGES.RESCHEDULE_ACTION}</ThemedText>
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
		if (!selectedConfirmedSlot) return null;

		return (
			<Modal
				visible={cancelConfirmedModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={closeCancelConfirmedModal}
			>
				<TouchableWithoutFeedback onPress={closeCancelConfirmedModal}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.modalContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.modalTitle}>
										{MESSAGES.CANCEL_CONFIRMED_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={closeCancelConfirmedModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>
								<ThemedText style={styles.modalMessage}>{MESSAGES.CANCEL_CONFIRMED_MESSAGE}</ThemedText>
								<View style={styles.modalActions}>
									<TouchableOpacity
										style={[styles.modalButton, styles.modalCancelActionButton]}
										onPress={confirmCancelConfirmedAppointment}
										disabled={isCancellingConfirmed}
									>
										{isCancellingConfirmed ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.modalConfirmText}>{MESSAGES.CANCEL_ACTION}</ThemedText>
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

	const renderCancelRequestModal = () => {
		if (!selectedRequestedSlot) return null;

		return (
			<Modal
				visible={cancelRequestModalVisible}
				animationType="fade"
				transparent={true}
				onRequestClose={closeCancelRequestModal}
			>
				<TouchableWithoutFeedback onPress={closeCancelRequestModal}>
					<View style={styles.modalOverlay}>
						<TouchableWithoutFeedback>
							<View style={[styles.modalContent, {backgroundColor: surfaceColor, borderColor}]}>
								<View style={styles.modalHeader}>
									<ThemedText type="subtitle" style={styles.modalTitle}>
										{MESSAGES.CANCEL_REQUEST_TITLE}
									</ThemedText>
									<TouchableOpacity onPress={closeCancelRequestModal} style={styles.modalCloseButton}>
										<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
									</TouchableOpacity>
								</View>
								<ThemedText style={styles.modalMessage}>{MESSAGES.CANCEL_REQUEST_MESSAGE}</ThemedText>
								<View style={styles.modalActions}>
									<TouchableOpacity
										style={[styles.modalButton, styles.modalCancelActionButton]}
										onPress={confirmCancelRequestedAppointment}
										disabled={isCancellingRequest}
									>
										{isCancellingRequest ? (
											<ActivityIndicator size="small" color="#fff"/>
										) : (
											<ThemedText style={styles.modalConfirmText}>{MESSAGES.CANCEL_ACTION}</ThemedText>
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

	const renderRescheduleModal = () => (
		<Modal
			visible={rescheduleModalVisible}
			animationType="fade"
			transparent={true}
			onRequestClose={closeRescheduleModal}
		>
			<TouchableWithoutFeedback onPress={closeRescheduleModal}>
				<View style={styles.modalOverlay}>
					<TouchableWithoutFeedback>
						<View style={[styles.modalContent, styles.rescheduleModalContent, {backgroundColor: surfaceColor, borderColor}]}>
							<View style={styles.modalHeader}>
								<ThemedText type="subtitle" style={styles.modalTitle}>
									{MESSAGES.RESCHEDULE_TITLE}
								</ThemedText>
								<TouchableOpacity onPress={closeRescheduleModal} style={styles.modalCloseButton}>
									<IconSymbol name="xmark.circle.fill" size={24} color={mutedColor}/>
								</TouchableOpacity>
							</View>

							<TextInput
								style={[styles.searchInput, {backgroundColor: inputBackgroundColor, borderColor, color: textColor}]}
								value={rescheduleSearch}
								onChangeText={setRescheduleSearch}
								placeholder={MESSAGES.RESCHEDULE_SEARCH_PLACEHOLDER}
								placeholderTextColor={mutedColor}
							/>

							{loadingAvailableSlots ? (
								<View style={styles.loadingContainer}>
									<ActivityIndicator size="large" color="#0a7ea4"/>
								</View>
							) : (
								<FlatList
									data={availableSlots}
									keyExtractor={(item) => item.id}
									style={styles.availableList}
									ListEmptyComponent={<ThemedText style={styles.emptyText}>{MESSAGES.RESCHEDULE_EMPTY}</ThemedText>}
									renderItem={({item}) => {
										const start = new Date(item.start);
										const end = new Date(item.end);
										const weekday = start.toLocaleDateString('pt-BR', {weekday: 'long'});
										const date = start.toLocaleDateString('pt-BR');
										const time = `${start.toLocaleTimeString([], TIME_FORMAT_OPTIONS)} - ${end.toLocaleTimeString([], TIME_FORMAT_OPTIONS)}`;

										return (
											<TouchableOpacity
												style={[styles.availableItem, {borderColor}]}
												onPress={() => confirmPatientReschedule(item.id)}
												disabled={isRescheduling}
											>
												<View style={styles.availableTextContainer}>
													<ThemedText type="defaultSemiBold">{weekday}</ThemedText>
													<ThemedText>{date}</ThemedText>
													<ThemedText style={{opacity: 0.8}}>{time}</ThemedText>
												</View>
												{isRescheduling ? (
													<ActivityIndicator size="small" color="#0a7ea4"/>
												) : (
													<IconSymbol name="chevron.right" size={18} color="#0a7ea4"/>
												)}
											</TouchableOpacity>
										);
									}}
								/>
							)}
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);

	const renderEmptyState = () => (
		<ThemedText style={styles.emptyText}>{MESSAGES.EMPTY}</ThemedText>
	);

	const renderContent = () => {
		return sortedAppointments.length === 0
			? renderEmptyState()
			: sortedAppointments.map(renderSlotCard);
	};

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			<View style={styles.header}>
				<ThemedText type="title">Agenda</ThemedText>
			</View>

			<DateStrip selectedDate={selectedDate} onSelectDate={handleSelectDate} dayStatusMap={dayStatusMap}/>

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
			{renderRequestModal()}
			{renderCancelRequestModal()}
			{renderConfirmedActionsModal()}
			{renderCancelConfirmedModal()}
			{renderRescheduleModal()}
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
	},
	content: {
		padding: 16,
		paddingBottom: 100,
	},
	loadingContainer: {
		paddingTop: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 40,
		opacity: 0.5,
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
	slotCardMuted: {
		backgroundColor: '#f5f5f5',
		borderLeftColor: '#ccc',
	},
	slotCardRequested: {
		borderLeftColor: '#f1c40f',
	},
	slotCardConfirmed: {
		borderLeftColor: '#27ae60',
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
	mutedText: {
		color: '#999',
	},
	statusContainer: {
		alignItems: 'flex-end',
	},
	statusText: {
		fontWeight: 'bold',
		marginBottom: 4,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
	modalContent: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
	},
	rescheduleModalContent: {
		maxHeight: '80%',
	},
	modalTitle: {
		marginBottom: 8,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	modalCloseButton: {
		padding: 2,
	},
	modalMessage: {
		marginBottom: 16,
		opacity: 0.8,
	},
	modalActions: {
		flexDirection: 'row',
		gap: 8,
	},
	modalButton: {
		flex: 1,
		height: 44,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalCancelActionButton: {
		backgroundColor: '#dc2626',
	},
	modalConfirmButton: {
		backgroundColor: '#0a7ea4',
	},
	modalConfirmText: {
		color: '#fff',
		fontWeight: '700',
	},
	searchInput: {
		height: 42,
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		marginBottom: 12,
	},
	availableList: {
		maxHeight: 320,
	},
	availableItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		marginBottom: 8,
	},
	availableTextContainer: {
		flex: 1,
		gap: 2,
	},
});
