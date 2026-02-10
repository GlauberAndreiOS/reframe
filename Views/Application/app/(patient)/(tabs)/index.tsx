import React, {useCallback, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useRouter} from 'expo-router';
import {ThemedView, ThemedText, AnimatedEntry, IconSymbol, ConfirmModal, AmbientBackground} from '@/components';
import {useThemeColor, useColorScheme} from '@/hooks';
import {useToast} from '@/context';
import {useThoughts} from '@/hooks/(patient)/thoughts.hooks';

// ============= TYPES & INTERFACES =============
interface ThoughtItem {
	id: string;
	date: string;
	situation: string;
	thought: string;
	emotion: string;
	behavior?: string;
	evidencePro?: string;
	evidenceContra?: string;
	alternativeThoughts?: string;
	reevaluation?: string;
	synced: number;
}

interface SyncStatus {
	isSyncing: boolean;
	hasFailed: boolean;
}

// ============= CONSTANTS =============
const MESSAGES = {
	DELETE_SUCCESS: 'Pensamento excluído com sucesso.',
	DELETE_ERROR: 'Erro ao excluir o pensamento.',
	EMPTY_TITLE: 'Nenhum pensamento registrado ainda.',
	EMPTY_ACTION: 'Registrar meu primeiro pensamento',
	MODAL_TITLE: 'Excluir Pensamento',
	MODAL_MESSAGE: 'Tem certeza de que deseja excluir este registro? Esta ação não pode ser desfeita.',
} as const;

const SYNC_STATUS = {
	UNSYNCED: 0,
	FAILED: -1,
} as const;

const FIELD_LABELS = {
	SITUATION: 'SITUAÇÃO',
	THOUGHT: 'PENSAMENTO',
	BEHAVIOR: 'COMPORTAMENTO',
	EVIDENCE_PRO: 'EVIDÊNCIAS A FAVOR',
	EVIDENCE_CONTRA: 'EVIDÊNCIAS CONTRA',
	ALTERNATIVE: 'PENSAMENTOS ALTERNATIVOS',
	REEVALUATION: 'REAVALIAÇÃO',
} as const;

const DATE_FORMAT_OPTIONS = {
	year: 'numeric' as const,
	month: '2-digit' as const,
	day: '2-digit' as const,
	hour: '2-digit' as const,
	minute: '2-digit' as const,
};

// ============= COMPONENT =============
export default function ThoughtsScreen() {
	const router = useRouter();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const cardColor = useThemeColor({}, 'card');
	const borderColor = useThemeColor({}, 'border');
	const mutedColor = useThemeColor({}, 'muted');
	const dangerColor = useThemeColor({}, 'danger');

	const {data: thoughts, isSyncing, hasFailedSync, syncWithBackend, deleteThought} = useThoughts();

	// ============= STATE =============
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [thoughtToDelete, setThoughtToDelete] = useState<string | null>(null);

	// ============= EFFECTS =============
	useFocusEffect(
		useCallback(() => {
			void syncWithBackend();
		}, [])
	);

	// ============= HANDLERS =============
	const handleDelete = (id: string) => {
		setThoughtToDelete(id);
		setDeleteModalVisible(true);
	};

	const confirmDelete = () => {
		if (!thoughtToDelete) return;

		deleteThought(thoughtToDelete)
			.then(() => {
				showToast(MESSAGES.DELETE_SUCCESS, 'success');
			})
			.catch((error) => {
				console.error('Error deleting thought:', error);
				showToast(MESSAGES.DELETE_ERROR, 'error');
			})
			.finally(() => {
				setDeleteModalVisible(false);
				setThoughtToDelete(null);
			});
	};

	const cancelDelete = () => {
		setDeleteModalVisible(false);
		setThoughtToDelete(null);
	};

	// ============= UTILITY FUNCTIONS =============
	const formatDate = (dateString: string): string => {
		try {
			return new Date(dateString).toLocaleDateString('pt-BR', DATE_FORMAT_OPTIONS);
		} catch {
			return dateString;
		}
	};

	const renderOptionalField = (label: string, content?: string) => {
		if (!content) return null;

		return (
			<View style={styles.section}>
				<ThemedText style={[styles.label, {color: mutedColor}]}>{label}</ThemedText>
				<ThemedText style={styles.content}>{content}</ThemedText>
			</View>
		);
	};

	// ============= RENDER FUNCTIONS =============
	const renderThoughtCard = ({item, index}: {item: ThoughtItem; index: number}) => (
		<AnimatedEntry delay={index * 100} duration={600}>
			<View
				style={[
					styles.card,
					{
						backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor,
						borderColor: borderColor,
					},
				]}
			>
				<View style={styles.cardHeader}>
					<ThemedText style={[styles.date, {color: mutedColor}]}>{formatDate(item.date)}</ThemedText>
					<View style={{flexDirection: 'row', alignItems: 'center'}}>
						{item.synced === SYNC_STATUS.UNSYNCED && (
							<IconSymbol name="cloud.fill" size={16} color={mutedColor} style={{marginRight: 8}}/>
						)}
						{item.synced === SYNC_STATUS.FAILED && (
							<IconSymbol
								name="exclamationmark.triangle.fill"
								size={16}
								color={dangerColor}
								style={{marginRight: 8}}
							/>
						)}
					</View>
				</View>

				<View style={{marginBottom: 16, flexDirection: 'row'}}>
					<View style={[styles.emotionBadge, {backgroundColor: tintColor + '20'}]}>
						<ThemedText style={[styles.emotion, {color: tintColor}]}>{item.emotion}</ThemedText>
					</View>
				</View>

				<View style={styles.section}>
					<ThemedText style={[styles.label, {color: mutedColor}]}>{FIELD_LABELS.SITUATION}</ThemedText>
					<ThemedText style={styles.content}>{item.situation}</ThemedText>
				</View>

				<View style={styles.section}>
					<ThemedText style={[styles.label, {color: mutedColor}]}>{FIELD_LABELS.THOUGHT}</ThemedText>
					<ThemedText style={styles.content}>{item.thought}</ThemedText>
				</View>

				{renderOptionalField(FIELD_LABELS.BEHAVIOR, item.behavior)}
				{renderOptionalField(FIELD_LABELS.EVIDENCE_PRO, item.evidencePro)}
				{renderOptionalField(FIELD_LABELS.EVIDENCE_CONTRA, item.evidenceContra)}
				{renderOptionalField(FIELD_LABELS.ALTERNATIVE, item.alternativeThoughts)}
				{renderOptionalField(FIELD_LABELS.REEVALUATION, item.reevaluation)}

				<View style={styles.cardFooter}>
					<TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
						<IconSymbol name="trash" size={18} color={dangerColor}/>
						<ThemedText style={[styles.deleteButtonText, {color: dangerColor}]}>Excluir</ThemedText>
					</TouchableOpacity>
				</View>
			</View>
		</AnimatedEntry>
	);

	const renderEmptyComponent = () => (
		<View style={styles.center}>
			<IconSymbol name="doc.text" size={48} color={mutedColor}/>
			<ThemedText style={[styles.emptyText, {color: mutedColor}]}>{MESSAGES.EMPTY_TITLE}</ThemedText>
			<TouchableOpacity onPress={() => router.push('/(patient)/new-thought')} style={{marginTop: 20}}>
				<ThemedText style={{color: tintColor, fontWeight: '600'}}>{MESSAGES.EMPTY_ACTION}</ThemedText>
			</TouchableOpacity>
		</View>
	);

	const renderHeader = () => (
		<View style={styles.header}>
			<View>
				<ThemedText type="title">Meus Pensamentos</ThemedText>
				<ThemedText style={{color: mutedColor, fontSize: 14}}>Registro diário de emoções</ThemedText>
			</View>

			<View style={{flexDirection: 'row', alignItems: 'center'}}>
				{hasFailedSync && (
					<TouchableOpacity
						onPress={syncWithBackend}
						style={styles.addButton}
						disabled={isSyncing}
					>
						<IconSymbol name="arrow.access-timewise.circle.fill" size={28} color={dangerColor}/>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					onPress={() => router.push('/(patient)/new-thought')}
					style={styles.addButton}
				>
					<IconSymbol name="plus.circle.fill" size={32} color={tintColor}/>
				</TouchableOpacity>
			</View>
		</View>
	);

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			<AmbientBackground/>
			<SafeAreaView style={styles.safeArea}>
				{renderHeader()}

				<FlatList
					data={thoughts}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl refreshing={isSyncing} onRefresh={syncWithBackend} tintColor={tintColor}/>
					}
					ListEmptyComponent={renderEmptyComponent}
					renderItem={renderThoughtCard}
				/>

				<ConfirmModal
					visible={deleteModalVisible}
					title={MESSAGES.MODAL_TITLE}
					message={MESSAGES.MODAL_MESSAGE}
					confirmText="Excluir"
					cancelText="Cancelar"
					onConfirm={confirmDelete}
					onCancel={cancelDelete}
					isDestructive={true}
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
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 20,
	},
	addButton: {
		padding: 4,
	},
	list: {
		paddingHorizontal: 24,
		paddingBottom: 100,
	},
	card: {
		padding: 20,
		borderRadius: 24,
		marginBottom: 16,
		borderWidth: 1,
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	date: {
		fontSize: 12,
		fontWeight: '500',
	},
	emotionBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		alignSelf: 'flex-start',
	},
	emotion: {
		fontSize: 14,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	section: {
		marginBottom: 12,
	},
	label: {
		fontSize: 10,
		fontWeight: '700',
		marginBottom: 4,
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	content: {
		fontSize: 15,
		lineHeight: 22,
	},
	emptyText: {
		textAlign: 'center',
		marginTop: 16,
		fontSize: 16,
	},
	cardFooter: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderColor: '#E5E5E5',
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	deleteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		padding: 8,
	},
	deleteButtonText: {
		fontSize: 14,
		fontWeight: '600',
	},
});
