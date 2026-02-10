import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, View} from 'react-native';
import {Stack, useLocalSearchParams} from 'expo-router';
import {ThemedView, ThemedText, AnimatedEntry, IconSymbol} from '@/components';
import {useThemeColor, useColorScheme} from '@/hooks';
import {useToast} from '@/context';
import {api} from '@/services';

// ============= TYPES & INTERFACES =============
interface ThoughtField {
	key: keyof AutomaticThought;
	label: string;
	optional?: boolean;
}

interface AutomaticThought {
	id: number;
	date: string;
	situation: string;
	thought: string;
	emotion: string;
	behavior?: string;
	evidencePro?: string;
	evidenceContra?: string;
	alternativeThoughts?: string;
	reevaluation?: string;
}

// ============= CONSTANTS =============
const API_ENDPOINTS = {
	GET_PATIENT_THOUGHTS: '/AutomaticThought/patient',
} as const;

const MESSAGES = {
	LOAD_ERROR: 'Não foi possível carregar os pensamentos.',
	EMPTY_STATE: 'Nenhum pensamento registrado por este paciente.',
	HEADER_SUBTITLE: 'Histórico de registros',
	THOUGHTS_TITLE: 'Pensamentos de',
} as const;

const FIELD_LABELS = {
	SITUATION: 'SITUAÇÃO',
	THOUGHT: 'PENSAMENTO',
	BEHAVIOR: 'COMPORTAMENTO',
	EVIDENCE_PRO: 'EVIDÊNCIAS A FAVOR',
	EVIDENCE_CONTRA: 'EVIDÊNCIAS CONTRA',
	ALTERNATIVE_THOUGHTS: 'PENSAMENTOS ALTERNATIVOS',
	REEVALUATION: 'REAVALIAÇÃO',
} as const;

const THOUGHT_FIELDS: ThoughtField[] = [
	{key: 'situation', label: FIELD_LABELS.SITUATION},
	{key: 'thought', label: FIELD_LABELS.THOUGHT},
	{key: 'behavior', label: FIELD_LABELS.BEHAVIOR, optional: true},
	{key: 'evidencePro', label: FIELD_LABELS.EVIDENCE_PRO, optional: true},
	{key: 'evidenceContra', label: FIELD_LABELS.EVIDENCE_CONTRA, optional: true},
	{key: 'alternativeThoughts', label: FIELD_LABELS.ALTERNATIVE_THOUGHTS, optional: true},
	{key: 'reevaluation', label: FIELD_LABELS.REEVALUATION, optional: true},
];

const ANIMATION_DELAY_MS = 100;
const ANIMATION_DURATION_MS = 600;
const HEADER_SPACER_HEIGHT = 60;
const ICON_SIZE = 48;
const DATE_LOCALE = 'pt-BR';

// ============= COMPONENT =============
export default function PatientThoughtsScreen() {
	const {id, name} = useLocalSearchParams();
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	// ============= THEME COLORS =============
	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const cardColor = useThemeColor({}, 'card');
	const mutedColor = useThemeColor({}, 'muted');

	// ============= STATE =============
	const [thoughts, setThoughts] = useState<AutomaticThought[]>([]);
	const [loading, setLoading] = useState(true);

	// ============= EFFECTS =============
	useEffect(() => {
		if (id) {
			fetchThoughts();
		}
	}, [id]);

	// ============= HANDLERS =============
	const fetchThoughts = useCallback(() => {
		api.get(`${API_ENDPOINTS.GET_PATIENT_THOUGHTS}/${id}`)
			.then((response) => {
				setThoughts(response.data);
			})
			.catch((error) => {
				console.error('Failed to fetch patient thoughts:', error);
				showToast(MESSAGES.LOAD_ERROR, 'error');
			})
			.finally(() => {
				setLoading(false);
			});
	}, [id, showToast]);

	// ============= UTILITY FUNCTIONS =============
	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return `${date.toLocaleDateString(DATE_LOCALE)} às ${date.toLocaleTimeString(DATE_LOCALE, {
			hour: '2-digit',
			minute: '2-digit',
		})}`;
	};


	// ============= RENDER FUNCTIONS =============
	const renderThoughtField = (thought: AutomaticThought, field: ThoughtField) => {
		const value = thought[field.key];

		if (!value) {
			return null;
		}

		return (
			<View key={field.key} style={styles.section}>
				<ThemedText style={[styles.label, {color: mutedColor}]}>
					{field.label}
				</ThemedText>
				<ThemedText style={styles.content}>{value}</ThemedText>
			</View>
		);
	};

	const renderThoughtCard = (item: AutomaticThought, index: number) => (
		<AnimatedEntry delay={index * ANIMATION_DELAY_MS} duration={ANIMATION_DURATION_MS}>
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
					<ThemedText style={[styles.date, {color: mutedColor}]}>
						{formatDate(item.date)}
					</ThemedText>
					<View style={[styles.emotionBadge, {backgroundColor: tintColor + '20'}]}>
						<ThemedText style={[styles.emotion, {color: tintColor}]}>
							{item.emotion}
						</ThemedText>
					</View>
				</View>

				{THOUGHT_FIELDS.map((field) => renderThoughtField(item, field))}
			</View>
		</AnimatedEntry>
	);

	const renderEmptyComponent = () => (
		<View style={styles.center}>
			<IconSymbol name="doc.text" size={ICON_SIZE} color={mutedColor}/>
			<ThemedText style={[styles.emptyText, {color: mutedColor}]}>
				{MESSAGES.EMPTY_STATE}
			</ThemedText>
		</View>
	);

	// ============= RENDER =============
	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: name as string,
					headerBackTitle: 'Voltar',
					headerStyle: {backgroundColor: 'transparent'},
					headerTransparent: true,
					headerTintColor: tintColor,
				}}
			/>

			<View style={styles.headerSpacer}/>

			<View style={styles.header}>
				<ThemedText type="title">
					{MESSAGES.THOUGHTS_TITLE} {name}
				</ThemedText>
				<ThemedText style={{color: mutedColor, fontSize: 14}}>
					{MESSAGES.HEADER_SUBTITLE}
				</ThemedText>
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={tintColor}/>
				</View>
			) : (
				<FlatList
					data={thoughts}
					keyExtractor={(item) => item.id.toString()}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={renderEmptyComponent}
					renderItem={({item, index}) => renderThoughtCard(item, index)}
				/>
			)}
		</ThemedView>
	);
}


// ============= STYLES =============
const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	headerSpacer: {
		height: HEADER_SPACER_HEIGHT,
	},
	header: {
		paddingHorizontal: 24,
		paddingBottom: 20,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	list: {
		paddingHorizontal: 24,
		paddingBottom: 40,
	},
	card: {
		padding: 20,
		borderRadius: 24,
		marginBottom: 16,
		borderWidth: 1,
	},
	cardHeader: {
		flexDirection: 'column',
		alignItems: 'flex-start',
		marginBottom: 16,
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
});
