import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Stack, useLocalSearchParams, useRouter} from 'expo-router';
import {ThemedView, ThemedText, AnimatedEntry, IconSymbol, Avatar} from '@/components';
import {useThemeColor, useColorScheme} from '@/hooks';
import {useToast} from '@/context';
import {api} from '@/services';
import type {PatientDocumentDto} from '@/services';

interface ThoughtField {
	key: keyof AutomaticThought;
	label: string;
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

interface PatientProfileDetails {
	id: string;
	name: string;
	profilePictureUrl?: string;
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
	documents?: PatientDocumentDto[] | null;
}

const API_ENDPOINTS = {
	GET_PATIENT_THOUGHTS: '/AutomaticThought/patient',
	GET_PATIENT_PROFILE: '/Psychologist/patient',
} as const;

const MESSAGES = {
	LOAD_THOUGHTS_ERROR: 'Não foi possível carregar os pensamentos.',
	LOAD_PROFILE_ERROR: 'Não foi possível carregar os dados do paciente.',
	EMPTY_STATE: 'Nenhum pensamento registrado por este paciente.',
	HEADER_SUBTITLE: 'Dados do paciente e histórico de registros',
	THOUGHTS_TITLE: 'Paciente',
	PATIENT_DATA_TITLE: 'DADOS DO PACIENTE',
	PATIENT_DOCS_TITLE: 'DOCUMENTOS',
	NOT_INFORMED: 'Não informado',
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
	{key: 'behavior', label: FIELD_LABELS.BEHAVIOR},
	{key: 'evidencePro', label: FIELD_LABELS.EVIDENCE_PRO},
	{key: 'evidenceContra', label: FIELD_LABELS.EVIDENCE_CONTRA},
	{key: 'alternativeThoughts', label: FIELD_LABELS.ALTERNATIVE_THOUGHTS},
	{key: 'reevaluation', label: FIELD_LABELS.REEVALUATION},
];

const BIOLOGICAL_SEX_LABELS: Record<number, string> = {
	0: 'Mulher',
	1: 'Homem',
	2: 'Intersexo',
	3: 'Prefiro não informar',
};

const ANIMATION_DELAY_MS = 100;
const ANIMATION_DURATION_MS = 600;
const HEADER_SPACER_HEIGHT = 60;
const ICON_SIZE = 48;
const DATE_LOCALE = 'pt-BR';

export default function PatientThoughtsScreen() {
	const router = useRouter();
	const {id, name} = useLocalSearchParams();
	const patientId = Array.isArray(id) ? id[0] : id;
	const patientName = Array.isArray(name) ? name[0] : name;
	const {showToast} = useToast();
	const colorScheme = useColorScheme() ?? 'light';
	const isDark = colorScheme === 'dark';

	const tintColor = useThemeColor({}, 'tint');
	const borderColor = useThemeColor({}, 'border');
	const cardColor = useThemeColor({}, 'card');
	const mutedColor = useThemeColor({}, 'muted');

	const [thoughts, setThoughts] = useState<AutomaticThought[]>([]);
	const [profile, setProfile] = useState<PatientProfileDetails | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchPatientData = useCallback(() => {
		setLoading(true);

		const thoughtRequest = api.get(`${API_ENDPOINTS.GET_PATIENT_THOUGHTS}/${patientId}`);
		const profileRequest = api.get(`${API_ENDPOINTS.GET_PATIENT_PROFILE}/${patientId}/profile`);

		Promise.allSettled([thoughtRequest, profileRequest])
			.then((results) => {
				const [thoughtResult, profileResult] = results;

				if (thoughtResult.status === 'fulfilled') {
					setThoughts(thoughtResult.value.data);
				} else {
					console.error('Failed to fetch patient thoughts:', thoughtResult.reason);
					showToast(MESSAGES.LOAD_THOUGHTS_ERROR, 'error');
				}

				if (profileResult.status === 'fulfilled') {
					setProfile(profileResult.value.data);
				} else {
					console.error('Failed to fetch patient profile:', profileResult.reason);
					showToast(MESSAGES.LOAD_PROFILE_ERROR, 'error');
				}
			})
			.finally(() => {
				setLoading(false);
			});
	}, [patientId, showToast]);

	useEffect(() => {
		if (patientId) {
			fetchPatientData();
		}
	}, [patientId, fetchPatientData]);

	const formatDateTime = (dateString: string): string => {
		const date = new Date(dateString);
		return `${date.toLocaleDateString(DATE_LOCALE)} às ${date.toLocaleTimeString(DATE_LOCALE, {
			hour: '2-digit',
			minute: '2-digit',
		})}`;
	};

	const formatDate = (dateString?: string | null): string => {
		if (!dateString) return MESSAGES.NOT_INFORMED;
		return new Date(dateString).toLocaleDateString(DATE_LOCALE);
	};

	const formatAddress = (data: PatientProfileDetails | null): string => {
		if (!data) return MESSAGES.NOT_INFORMED;

		const line1 = [data.street, data.addressNumber, data.addressComplement]
			.filter(Boolean)
			.join(', ');
		const line2 = [data.neighborhood, data.city, data.state, data.zipCode]
			.filter(Boolean)
			.join(' - ');
		const result = [line1, line2].filter(Boolean).join('\n');
		return result || MESSAGES.NOT_INFORMED;
	};

	const renderThoughtField = (thought: AutomaticThought, field: ThoughtField) => {
		const value = thought[field.key];
		if (!value) return null;

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
						{formatDateTime(item.date)}
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

	const renderKeyValue = (label: string, value?: string | null) => (
		<View style={styles.infoRow}>
			<ThemedText style={[styles.infoLabel, {color: mutedColor}]}>{label}</ThemedText>
			<ThemedText style={styles.infoValue}>{value || MESSAGES.NOT_INFORMED}</ThemedText>
		</View>
	);

	const renderHeader = () => (
		<View>
			<View style={styles.header}>
				<View style={{marginBottom: 12}}>
					<Avatar uri={profile?.profilePictureUrl} size={72} editable={false} name={patientName || profile?.name}/>
				</View>
				<ThemedText type="title" style={styles.patientTitle} numberOfLines={3}>
					{MESSAGES.THOUGHTS_TITLE} {patientName || profile?.name}
				</ThemedText>
				<ThemedText style={{color: mutedColor, fontSize: 14}}>
					{MESSAGES.HEADER_SUBTITLE}
				</ThemedText>
			</View>

			<View style={[styles.card, {backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor, borderColor}]}>
				<ThemedText style={[styles.blockTitle, {color: mutedColor}]}>{MESSAGES.PATIENT_DATA_TITLE}</ThemedText>
				{renderKeyValue('Nome', profile?.name)}
				{renderKeyValue('Nascimento', formatDate(profile?.birthDate))}
				{renderKeyValue('CPF', profile?.cpf)}
				{renderKeyValue('Sexo biológico', profile?.biologicalSex === null || profile?.biologicalSex === undefined ? MESSAGES.NOT_INFORMED : BIOLOGICAL_SEX_LABELS[profile.biologicalSex] || MESSAGES.NOT_INFORMED)}
				{renderKeyValue('Endereço', formatAddress(profile))}
			</View>

			<View style={[styles.card, {backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor, borderColor}]}>
				<ThemedText style={[styles.blockTitle, {color: mutedColor}]}>{MESSAGES.PATIENT_DOCS_TITLE}</ThemedText>
				<View style={styles.infoRow}>
					<TouchableOpacity
						style={[styles.fileButton, {borderColor: tintColor}]}
						onPress={() => router.push({pathname: '/(psychologist)/patient/[id]/documents', params: {id: patientId, name: patientName}})}
					>
						<ThemedText style={[styles.fileButtonText, {color: tintColor}]}>Ver todos ({profile?.documents?.length ?? 0})</ThemedText>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: patientName,
					headerBackTitle: 'Voltar',
					headerStyle: {backgroundColor: 'transparent'},
					headerTransparent: true,
					headerTintColor: tintColor,
				}}
			/>

			<View style={styles.headerSpacer}/>

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
					ListHeaderComponent={renderHeader}
					ListEmptyComponent={renderEmptyComponent}
					renderItem={({item, index}) => renderThoughtCard(item, index)}
				/>
			)}
		</ThemedView>
	);
}

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
		alignItems: 'center',
	},
	patientTitle: {
		textAlign: 'center',
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
	blockTitle: {
		fontSize: 12,
		fontWeight: '700',
		marginBottom: 10,
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	infoRow: {
		marginBottom: 12,
	},
	infoLabel: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.7,
		marginBottom: 4,
	},
	infoValue: {
		fontSize: 14,
		lineHeight: 20,
	},
	fileButton: {
		height: 38,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	fileButtonText: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 1,
	},
});
