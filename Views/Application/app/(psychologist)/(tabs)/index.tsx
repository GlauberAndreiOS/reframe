import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from "react-native-safe-area-context";
import {useFocusEffect, useRouter} from 'expo-router';
import api from '@/services/api';
import {ThemedText} from '@/components/themed-text';
import {ThemedView} from '@/components/themed-view';
import {useThemeColor} from '@/hooks/use-theme-color';
import {useColorScheme} from '@/hooks/use-color-scheme';
import {AnimatedEntry} from '@/components/ui/animated-entry';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useToast} from '@/context/ToastContext';
import {useConfirm} from '@/context/ConfirmContext';
import {PsychologistPickerModal} from '@/components/ui/psychologist-picker-modal';
import {AmbientBackground} from '@/components/ui/ambient-background';
import {Avatar} from '@/components/ui/avatar';

interface Patient {
    id: number;
    name: string;
    profilePictureUrl?: string;
}

export default function PatientsScreen() {
	const router = useRouter();
	const {showToast} = useToast();
	const {confirm} = useConfirm();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const cardColor = useThemeColor({}, 'card');
	const mutedColor = useThemeColor({}, 'muted');

	const [patients, setPatients] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);


	const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
	const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

	const fetchPatients = useCallback(async () => {
		setLoading(true);
		try {
			const response = await api.get('/Psychologist/patients');
			setPatients(response.data);
		} catch (error) {
			console.error('Failed to fetch patients:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useFocusEffect(
		React.useCallback(() => {
			void fetchPatients();
		}, [fetchPatients])
	);

	const handleUnlink = (patientId: number, patientName: string) => {
		confirm({
			title: 'Desvincular Paciente',
			message: `Tem certeza que deseja desvincular ${patientName}? Esta ação não pode ser desfeita.`,
			confirmText: 'Desvincular',
			isDestructive: true,
			onConfirm: async () => {
				try {
					await api.put(`/Psychologist/patient/${patientId}/unlink`);
					showToast('Paciente desvinculado com sucesso.', 'success');
					void fetchPatients();
				} catch (error) {
					console.error('Failed to unlink patient:', error);
					showToast('Falha ao desvincular paciente.', 'error');
				}
			}
		});
	};

	const openTransferModal = (patientId: number) => {
		setSelectedPatientId(patientId);
		setIsTransferModalVisible(true);
	};

	const handleTransfer = async (targetPsychologistId: number | null) => {
		setIsTransferModalVisible(false);
		if (!targetPsychologistId || !selectedPatientId) return;

		try {
			await api.put(`/Psychologist/patient/${selectedPatientId}/transfer/${targetPsychologistId}`);
			showToast('Paciente transferido com sucesso.', 'success');
			void fetchPatients();
		} catch (error) {
			console.error('Failed to transfer patient:', error);
			showToast('Falha ao transferir paciente.', 'error');
		} finally {
			setSelectedPatientId(null);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.header}>
					<ThemedText type="title">Meus Pacientes</ThemedText>
					<ThemedText style={{color: mutedColor, fontSize: 14}}>
						Acompanhamento clínico
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
						ListEmptyComponent={
							<View style={styles.center}>
								<IconSymbol name="person.2" size={48} color={mutedColor}/>
								<ThemedText style={[styles.emptyText, {color: mutedColor}]}>
									Nenhum paciente vinculado.
								</ThemedText>
							</View>
						}
						renderItem={({item, index}) => (
							<AnimatedEntry delay={index * 100} duration={600}>
								<View
									style={[
										styles.card,
										{
											backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
											borderColor: borderColor
										}
									]}
								>
									<View style={styles.cardContent}>
										<View style={{marginRight: 16}}>
											<Avatar 
												uri={item.profilePictureUrl} 
												size={56} 
												editable={false}
												name={item.name}
											/>
										</View>
										<ThemedText numberOfLines={1} style={styles.name}>{item.name}</ThemedText>
									</View>

									<View style={[styles.actions, {borderTopColor: borderColor + '33'}]}>
										<TouchableOpacity
											style={styles.actionButton}
											onPress={() => router.push({
												pathname: '/(psychologist)/patient/[id]',
												params: {id: item.id, name: item.name}
											})}
										>
											<IconSymbol name="doc.text.fill" size={20} color={tintColor}/>
											<ThemedText
												style={[styles.actionText, {color: tintColor}]}>Registros</ThemedText>
										</TouchableOpacity>

										<View style={[styles.verticalDivider, {backgroundColor: borderColor}]}/>

										<TouchableOpacity
											style={styles.actionButton}
											onPress={() => openTransferModal(item.id)}
										>
											<IconSymbol name="arrow.2.squarepath" size={20} color={mutedColor}/>
											<ThemedText
												style={[styles.actionText, {color: mutedColor}]}>Transferir</ThemedText>
										</TouchableOpacity>

										<View style={[styles.verticalDivider, {backgroundColor: borderColor}]}/>

										<TouchableOpacity
											style={styles.actionButton}
											onPress={() => handleUnlink(item.id, item.name)}
										>
											<IconSymbol name="person.slash.fill" size={20} color="#EF4444"/>
											<ThemedText
												style={[styles.actionText, {color: '#EF4444'}]}>Desvincular</ThemedText>
										</TouchableOpacity>
									</View>
								</View>
							</AnimatedEntry>
						)}
					/>
				)}

				<PsychologistPickerModal
					visible={isTransferModalVisible}
					onClose={() => setIsTransferModalVisible(false)}
					onSelect={handleTransfer}
					showUnlinkOption={false}
					title="Transferir para..."
				/>
			</SafeAreaView>
		</ThemedView>
	);
}

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
		borderRadius: 20,
		marginBottom: 16,
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
		paddingVertical: 12,
		gap: 4,
	},
	actionText: {
		fontSize: 10,
		fontWeight: '600',
	},
	verticalDivider: {
		width: 1,
		height: '60%',
		opacity: 0.2,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 16,
		fontSize: 16,
	},
});
