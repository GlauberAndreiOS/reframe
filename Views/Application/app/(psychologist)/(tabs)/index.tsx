import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useRouter} from 'expo-router';
import {ThemedView, ThemedText, AnimatedEntry, IconSymbol, AmbientBackground, Avatar, PsychologistPickerModal} from '@/components';
import {useThemeColor, useColorScheme} from '@/hooks';
import {useToast, useConfirm} from '@/context';
import {api} from '@/services';

// ============= TYPES & INTERFACES =============
interface Patient {
	id: string;
	name: string;
	profilePictureUrl?: string;
	linkStatus?: 'Linked' | 'Pending';
}

interface ConfirmOptions {
	title: string;
	message: string;
	confirmText: string;
	isDestructive: boolean;
	onConfirm: () => void;
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_PATIENTS: '/Psychologist/patients',
	UNLINK_PATIENT: '/Psychologist/patient',
	TRANSFER_PATIENT: '/Psychologist/patient',
	APPROVE_LINK: '/Psychologist/patient',
	REJECT_LINK: '/Psychologist/patient',
} as const;

const MESSAGES = {
	TITLE: 'Meus Pacientes',
	SUBTITLE: 'Acompanhamento clínico',
	EMPTY_STATE: 'Nenhum paciente vinculado.',
	UNLINK_TITLE: 'Desvincular Paciente',
	UNLINK_MESSAGE_PREFIX: 'Tem certeza que deseja desvincular',
	UNLINK_MESSAGE_SUFFIX: '? Esta ação não pode ser desfeita.',
	UNLINK_SUCCESS: 'Paciente desvinculado com sucesso.',
	UNLINK_ERROR: 'Falha ao desvincular paciente.',
	TRANSFER_SUCCESS: 'Paciente transferido com sucesso.',
	TRANSFER_ERROR: 'Falha ao transferir paciente.',
	TRANSFER_MODAL_TITLE: 'Transferir para...',
	PENDING_BADGE: 'SOLICITACAO DE VINCULO',
	APPROVE_TITLE: 'Aprovar Solicitacao',
	APPROVE_MESSAGE_PREFIX: 'Deseja aprovar a solicitacao de vinculo de',
	APPROVE_SUCCESS: 'Solicitacao aprovada com sucesso.',
	APPROVE_ERROR: 'Falha ao aprovar solicitacao.',
	REJECT_TITLE: 'Reprovar Solicitacao',
	REJECT_MESSAGE_PREFIX: 'Deseja reprovar a solicitacao de vinculo de',
	REJECT_SUCCESS: 'Solicitacao reprovada com sucesso.',
	REJECT_ERROR: 'Falha ao reprovar solicitacao.',
} as const;

const ACTION_LABELS = {
	REGISTROS: 'Registros',
	TRANSFERIR: 'Transferir',
	DESVINCULAR: 'Desvincular',
	APROVAR: 'Aprovar',
	REPROVAR: 'Reprovar',
} as const;

const COLOR_VALUES = {
	DANGER: '#EF4444',
	SUCCESS: '#16A34A',
	WARNING: '#F59E0B',
} as const;

const ANIMATION_DELAY_MS = 100;
const ANIMATION_DURATION_MS = 600;
const AVATAR_SIZE = 56;
const ACTION_ICON_SIZE = 20;
const AVATAR_MARGIN_RIGHT = 16;
const CARD_BORDER_RADIUS = 20;
const CARD_MARGIN_BOTTOM = 16;
const ACTION_BUTTON_PADDING = 12;
const VERTICAL_DIVIDER_OPACITY = 0.2;
const EMPTY_ICON_SIZE = 48;

// ============= COMPONENT =============
export default function PatientsScreen() {
	const router = useRouter();
	const {showToast} = useToast();
	const {confirm} = useConfirm();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const cardColor = useThemeColor({}, 'card');
	const mutedColor = useThemeColor({}, 'muted');

	// ============= STATE =============
	const [patients, setPatients] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);
	const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
	const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

	const openPatientDetails = (patient: Patient) => {
		router.push({
			pathname: '/(psychologist)/patient/[id]',
			params: {id: patient.id, name: patient.name},
		});
	};

	// ============= HANDLERS =============
	const fetchPatients = useCallback(() => {
		setLoading(true);
		api.get(API_ENDPOINTS.GET_PATIENTS)
			.then((response) => {
				setPatients(response.data);
			})
			.catch((error) => {
				console.error('Failed to fetch patients:', error);
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	// ============= EFFECTS =============
	useFocusEffect(
		useCallback(() => {
			fetchPatients();
		}, [fetchPatients])
	);

	const handleUnlink = (patientId: string, patientName: string) => {
		const confirmOptions: ConfirmOptions = {
			title: MESSAGES.UNLINK_TITLE,
			message: `${MESSAGES.UNLINK_MESSAGE_PREFIX} ${patientName}${MESSAGES.UNLINK_MESSAGE_SUFFIX}`,
			confirmText: ACTION_LABELS.DESVINCULAR,
			isDestructive: true,
			onConfirm: () => {
				api.put(`${API_ENDPOINTS.UNLINK_PATIENT}/${patientId}/unlink`)
					.then(() => {
						showToast(MESSAGES.UNLINK_SUCCESS, 'success');
						fetchPatients();
					})
					.catch((error) => {
						console.error('Failed to unlink patient:', error);
						showToast(MESSAGES.UNLINK_ERROR, 'error');
					});
			},
		};
		confirm(confirmOptions);
	};

	const openTransferModal = (patientId: string) => {
		setSelectedPatientId(patientId);
		setIsTransferModalVisible(true);
	};

	const handleTransfer = (targetPsychologistId: string | null) => {
		setIsTransferModalVisible(false);
		if (!targetPsychologistId || !selectedPatientId) {
			return;
		}

		api.put(`${API_ENDPOINTS.TRANSFER_PATIENT}/${selectedPatientId}/transfer/${targetPsychologistId}`)
			.then(() => {
				showToast(MESSAGES.TRANSFER_SUCCESS, 'success');
				fetchPatients();
			})
			.catch((error) => {
				console.error('Failed to transfer patient:', error);
				showToast(MESSAGES.TRANSFER_ERROR, 'error');
			})
			.finally(() => {
				setSelectedPatientId(null);
			});
	};

	const handleApproveRequest = (patientId: string, patientName: string) => {
		confirm({
			title: MESSAGES.APPROVE_TITLE,
			message: `${MESSAGES.APPROVE_MESSAGE_PREFIX} ${patientName}?`,
			confirmText: ACTION_LABELS.APROVAR,
			onConfirm: () => {
				api.put(`${API_ENDPOINTS.APPROVE_LINK}/${patientId}/approve-link`)
					.then(() => {
						showToast(MESSAGES.APPROVE_SUCCESS, 'success');
						fetchPatients();
					})
					.catch((error) => {
						console.error('Failed to approve patient link request:', error);
						showToast(MESSAGES.APPROVE_ERROR, 'error');
					});
			},
		});
	};

	const handleRejectRequest = (patientId: string, patientName: string) => {
		confirm({
			title: MESSAGES.REJECT_TITLE,
			message: `${MESSAGES.REJECT_MESSAGE_PREFIX} ${patientName}?`,
			confirmText: ACTION_LABELS.REPROVAR,
			isDestructive: true,
			onConfirm: () => {
				api.put(`${API_ENDPOINTS.REJECT_LINK}/${patientId}/reject-link`)
					.then(() => {
						showToast(MESSAGES.REJECT_SUCCESS, 'success');
						fetchPatients();
					})
					.catch((error) => {
						console.error('Failed to reject patient link request:', error);
						showToast(MESSAGES.REJECT_ERROR, 'error');
					});
			},
		});
	};

	// ============= RENDER FUNCTIONS =============
	const renderActionButton = (iconName: string, label: string, color: string, onPress: () => void) => (
		<TouchableOpacity style={styles.actionButton} onPress={onPress}>
			<IconSymbol name={iconName} size={ACTION_ICON_SIZE} color={color}/>
			<ThemedText style={[styles.actionText, {color}]}>{label}</ThemedText>
		</TouchableOpacity>
	);

	const renderPatientActions = (patient: Patient) => (
		patient.linkStatus === 'Pending' ? (
			<View style={[styles.actions, {borderTopColor: borderColor + '33'}]}>
				{renderActionButton(
					'checkmark.circle.fill',
					ACTION_LABELS.APROVAR,
					COLOR_VALUES.SUCCESS,
					() => handleApproveRequest(patient.id, patient.name)
				)}
				<View style={[styles.verticalDivider, {backgroundColor: borderColor}]}/>
				{renderActionButton(
					'xmark.circle.fill',
					ACTION_LABELS.REPROVAR,
					COLOR_VALUES.DANGER,
					() => handleRejectRequest(patient.id, patient.name)
				)}
			</View>
		) : (
			<View style={[styles.actions, {borderTopColor: borderColor + '33'}]}>
				{renderActionButton(
					'doc.text.fill',
					ACTION_LABELS.REGISTROS,
					tintColor,
					() => openPatientDetails(patient)
				)}

				<View style={[styles.verticalDivider, {backgroundColor: borderColor}]}/>

				{renderActionButton(
					'arrow.2.squarepath',
					ACTION_LABELS.TRANSFERIR,
					mutedColor,
					() => openTransferModal(patient.id)
				)}

				<View style={[styles.verticalDivider, {backgroundColor: borderColor}]}/>

				{renderActionButton(
					'person.slash.fill',
					ACTION_LABELS.DESVINCULAR,
					COLOR_VALUES.DANGER,
					() => handleUnlink(patient.id, patient.name)
				)}
			</View>
		)
	);

	const renderPatientCard = (item: Patient, index: number) => (
		<AnimatedEntry delay={index * ANIMATION_DELAY_MS} duration={ANIMATION_DURATION_MS}>
			<View
				style={[
					styles.card,
					{
						backgroundColor: item.linkStatus === 'Pending'
							? COLOR_VALUES.WARNING + '12'
							: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
						borderColor: item.linkStatus === 'Pending' ? COLOR_VALUES.WARNING : borderColor,
					},
				]}
			>
				{item.linkStatus === 'Pending' && (
					<View style={[styles.pendingHeader, {backgroundColor: COLOR_VALUES.WARNING + '22'}]}>
						<ThemedText style={[styles.pendingHeaderText, {color: COLOR_VALUES.WARNING}]}>
							{MESSAGES.PENDING_BADGE}
						</ThemedText>
					</View>
				)}

				<TouchableOpacity style={styles.cardContent} onPress={() => openPatientDetails(item)} activeOpacity={0.8}>
					<View style={{marginRight: AVATAR_MARGIN_RIGHT}}>
						<Avatar uri={item.profilePictureUrl} size={AVATAR_SIZE} editable={false} name={item.name}/>
					</View>
					<ThemedText numberOfLines={3} style={styles.name}>
						{item.name}
					</ThemedText>
				</TouchableOpacity>

				{renderPatientActions(item)}
			</View>
		</AnimatedEntry>
	);

	const renderEmptyComponent = () => (
		<View style={styles.center}>
			<IconSymbol name="person.2.fill" size={EMPTY_ICON_SIZE} color={mutedColor}/>
			<ThemedText style={[styles.emptyText, {color: mutedColor}]}>
				{MESSAGES.EMPTY_STATE}
			</ThemedText>
		</View>
	);

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<ThemedText type="title">{MESSAGES.TITLE}</ThemedText>
					<ThemedText style={{color: mutedColor, fontSize: 14}}>
						{MESSAGES.SUBTITLE}
					</ThemedText>
				</View>

				{loading ? (
					<View style={styles.center}>
						<ActivityIndicator size="large" color={tintColor}/>
					</View>
				) : (
					<FlatList
						data={patients}
						keyExtractor={(item) => item.id.toString()}
						contentContainerStyle={styles.list}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={renderEmptyComponent}
						renderItem={({item, index}) => renderPatientCard(item, index)}
					/>
				)}

				<PsychologistPickerModal
					visible={isTransferModalVisible}
					onClose={() => setIsTransferModalVisible(false)}
					onSelect={handleTransfer}
					showUnlinkOption={false}
					title={MESSAGES.TRANSFER_MODAL_TITLE}
				/>
			</SafeAreaView>
		</ThemedView>
	);
}


// ============= STYLES =============
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 24,
		paddingVertical: 20,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	list: {
		paddingHorizontal: 24,
		paddingBottom: 100,
	},
	card: {
		borderRadius: CARD_BORDER_RADIUS,
		marginBottom: CARD_MARGIN_BOTTOM,
		borderWidth: 1,
		overflow: 'hidden',
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20,
	},
	name: {
		fontSize: 18,
		fontWeight: '700',
		flex: 1,
	},
	pendingHeader: {
		paddingHorizontal: 20,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: COLOR_VALUES.WARNING + '55',
	},
	pendingHeaderText: {
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.6,
		textTransform: 'uppercase',
	},
	actions: {
		flexDirection: 'row',
		borderTopWidth: 1,
		alignItems: 'center',
	},
	actionButton: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: ACTION_BUTTON_PADDING,
		gap: 4,
	},
	actionText: {
		fontSize: 10,
		fontWeight: '600',
	},
	verticalDivider: {
		width: 1,
		height: '60%',
		opacity: VERTICAL_DIVIDER_OPACITY,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 16,
		fontSize: 16,
	},
});
