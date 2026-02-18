import React, {useCallback, useState} from 'react';
import {ActivityIndicator, FlatList, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from 'expo-router';
import {AmbientBackground, AnimatedEntry, ThemedText, ThemedView} from '@/components';
import {useThemeColor} from '@/hooks';
import {api} from '@/services';

interface ForecastItem {
	id: string;
	mercadoPagoTransactionId: string;
	grossAmount: number;
	platformFeeAmount: number;
	netAmount: number;
	expectedReleaseAtUtc: string;
	status: string;
}

interface DashboardData {
	grossTotal: number;
	platformFeeTotal: number;
	netTotal: number;
	releasedTotal: number;
	blockedForDisputeTotal: number;
	reversedTotal: number;
	forecastToRelease: ForecastItem[];
}

const API_ENDPOINTS = {
	DASHBOARD: '/Payout/dashboard',
} as const;

const currency = (value: number) =>
	new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(value || 0);

export default function FinanceScreen() {
	const tintColor = useThemeColor({}, 'tint');
	const cardColor = useThemeColor({}, 'card');
	const mutedColor = useThemeColor({}, 'muted');
	const borderColor = useThemeColor({}, 'border');

	const [loading, setLoading] = useState(true);
	const [dashboard, setDashboard] = useState<DashboardData | null>(null);

	const fetchDashboard = useCallback(() => {
		setLoading(true);
		api.get(API_ENDPOINTS.DASHBOARD)
			.then((response) => setDashboard(response.data))
			.catch((error) => console.error('Failed to fetch payout dashboard:', error))
			.finally(() => setLoading(false));
	}, []);

	useFocusEffect(
		useCallback(() => {
			fetchDashboard();
		}, [fetchDashboard])
	);

	if (loading) {
		return (
			<ThemedView style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={tintColor}/>
			</ThemedView>
		);
	}

	const cards = [
		{label: 'Bruto', value: dashboard?.grossTotal || 0},
		{label: 'Taxas', value: dashboard?.platformFeeTotal || 0},
		{label: 'Liquido', value: dashboard?.netTotal || 0},
		{label: 'Ja repassado', value: dashboard?.releasedTotal || 0},
		{label: 'Bloqueado disputa', value: dashboard?.blockedForDisputeTotal || 0},
		{label: 'Estornado', value: dashboard?.reversedTotal || 0},
	];

	return (
		<AmbientBackground>
			<SafeAreaView style={styles.container} edges={['top']}>
				<AnimatedEntry delay={80} duration={500}>
					<ThemedText style={styles.title}>Financeiro</ThemedText>
					<ThemedText style={[styles.subtitle, {color: mutedColor}]}>Bruto, taxas, liquido e previsao de repasse</ThemedText>
				</AnimatedEntry>

				<View style={styles.summaryGrid}>
					{cards.map((card, index) => (
						<AnimatedEntry key={card.label} delay={120 + index * 35} duration={500}>
							<ThemedView style={[styles.card, {backgroundColor: cardColor, borderColor}]}>
								<ThemedText style={[styles.cardLabel, {color: mutedColor}]}>{card.label}</ThemedText>
								<ThemedText style={styles.cardValue}>{currency(card.value)}</ThemedText>
							</ThemedView>
						</AnimatedEntry>
					))}
				</View>

				<ThemedText style={[styles.sectionTitle, {color: mutedColor}]}>Previsoes de repasse</ThemedText>
				<FlatList
					data={dashboard?.forecastToRelease || []}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={<ThemedText style={[styles.emptyText, {color: mutedColor}]}>Nenhum valor pendente para repasse.</ThemedText>}
					renderItem={({item}) => (
						<ThemedView style={[styles.forecastCard, {backgroundColor: cardColor, borderColor}]}> 
							<ThemedText style={styles.forecastTx}>TX: {item.mercadoPagoTransactionId}</ThemedText>
							<ThemedText style={[styles.forecastDate, {color: mutedColor}]}>Previsto: {new Date(item.expectedReleaseAtUtc).toLocaleDateString('pt-BR')}</ThemedText>
							<ThemedText>Bruto: {currency(item.grossAmount)} | Taxa: {currency(item.platformFeeAmount)}</ThemedText>
							<ThemedText style={[styles.forecastNet, {color: tintColor}]}>Liquido: {currency(item.netAmount)}</ThemedText>
						</ThemedView>
					)}
				/>
			</SafeAreaView>
		</AmbientBackground>
	);
}

const styles = StyleSheet.create({
	container: {flex: 1, paddingHorizontal: 20, paddingTop: 12},
	loadingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
	title: {fontSize: 28, fontWeight: '800'},
	subtitle: {fontSize: 14, marginTop: 4, marginBottom: 16},
	summaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16},
	card: {width: '48%', borderRadius: 16, padding: 14, borderWidth: 1},
	cardLabel: {fontSize: 12, marginBottom: 8},
	cardValue: {fontSize: 16, fontWeight: '700'},
	sectionTitle: {fontSize: 13, fontWeight: '700', marginBottom: 10},
	listContent: {paddingBottom: 120, gap: 10},
	forecastCard: {borderRadius: 14, borderWidth: 1, padding: 12},
	forecastTx: {fontSize: 13, fontWeight: '700'},
	forecastDate: {fontSize: 12, marginVertical: 4},
	forecastNet: {fontSize: 14, fontWeight: '700', marginTop: 4},
	emptyText: {fontSize: 14, textAlign: 'center', marginTop: 24},
});
