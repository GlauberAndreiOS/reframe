import React, { useState, useEffect } from 'react';
import {
	Modal,
	View,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	TouchableWithoutFeedback
} from 'react-native';
import { Image } from 'expo-image';
import api from '@/services/api';
import { ThemedText } from '@/components/themed-text';
import { GlassInput } from '@/components/ui/glass-input';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface Psychologist {
  id: number;
  name: string;
  crp: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (psychologistId: number | null) => void;
  currentPsychologistId?: number;
}

export function PsychologistPickerModal({ visible, onClose, onSelect, currentPsychologistId }: Props) {
	const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [loading, setLoading] = useState(false);

	const tintColor = useThemeColor({}, 'tint');
	const backgroundColor = useThemeColor({}, 'background');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');

	useEffect(() => {
		if (visible) {
			fetchPsychologists();
		}
	}, [visible]);

	const fetchPsychologists = async () => {
		setLoading(true);
		try {
			const response = await api.get('/Psychologist/all');
			setPsychologists(response.data);
		} catch (error) {
			console.error('Failed to fetch psychologists:', error);
		} finally {
			setLoading(false);
		}
	};

	const filteredPsychologists = psychologists.filter(p => 
		p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.crp.includes(searchQuery)
	);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={styles.overlay}>
					<TouchableWithoutFeedback>
						<View style={[styles.modalContent, { backgroundColor }]}>
							<View style={styles.header}>
								<ThemedText type="subtitle">Selecionar Psicólogo</ThemedText>
								<TouchableOpacity onPress={onClose} style={styles.closeButton}>
									<IconSymbol name="xmark.circle.fill" size={28} color={mutedColor} />
								</TouchableOpacity>
							</View>

							<GlassInput
								placeholder="Buscar por nome ou CRP"
								value={searchQuery}
								onChangeText={setSearchQuery}
								style={styles.searchInput}
							/>

							{loading ? (
								<ActivityIndicator size="large" color={tintColor} style={styles.loader} />
							) : (
								<FlatList
									data={filteredPsychologists}
									keyExtractor={(item) => item.id.toString()}
									style={styles.list}
									contentContainerStyle={{ paddingBottom: 40 }}
									showsVerticalScrollIndicator={false}
									ListHeaderComponent={
										<TouchableOpacity 
											style={[styles.item, { borderColor: '#EF4444', borderStyle: 'dashed', backgroundColor: '#EF444410' }]}
											onPress={() => onSelect(null)}
										>
											<View style={[styles.avatar, { backgroundColor: '#EF444420' }]}>
												<IconSymbol name="person.slash.fill" size={20} color="#EF4444" />
											</View>
											<ThemedText style={{ color: '#EF4444', fontWeight: '600' }}>Desvincular Psicólogo</ThemedText>
										</TouchableOpacity>
									}
									renderItem={({ item }) => (
										<TouchableOpacity 
											style={[
												styles.item, 
												{ 
													borderColor: borderColor,
													backgroundColor: currentPsychologistId === item.id ? tintColor + '10' : 'transparent'
												}
											]}
											onPress={() => onSelect(item.id)}
										>
											<Image 
												source={{ uri: `https://ui-avatars.com/api/?name=${item.name}&background=random` }} 
												style={styles.avatar} 
											/>
											<View style={styles.info}>
												<ThemedText style={styles.name}>{item.name}</ThemedText>
												<ThemedText style={[styles.crp, { color: mutedColor }]}>CRP: {item.crp}</ThemedText>
											</View>
											{currentPsychologistId === item.id && (
												<IconSymbol name="checkmark.circle.fill" size={24} color={tintColor} />
											)}
										</TouchableOpacity>
									)}
								/>
							)}
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		height: '85%',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.25,
		shadowRadius: 8,
		elevation: 5,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 24,
	},
	closeButton: {
		padding: 4,
	},
	searchInput: {
		marginBottom: 20,
	},
	loader: {
		marginTop: 40,
	},
	list: {
		flex: 1,
	},
	item: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 12,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	info: {
		flex: 1,
	},
	name: {
		fontWeight: '600',
		fontSize: 16,
		marginBottom: 2,
	},
	crp: {
		fontSize: 12,
	},
});
