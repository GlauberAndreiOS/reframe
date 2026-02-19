import React, {useCallback, useEffect, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ThemedText, ThemedView, Card, AnimatedEntry} from '@/components';
import {useThemeColor} from '@/hooks';
import {financeService, type SessionReceipt} from '@/services';

const STATUS_LABELS: Record<number, string> = {
	0: 'Cobrança efetuada',
	1: 'Cobrança falhou',
	2: 'Estorno emitido',
	3: 'Repasse realizado',
};

export default function ReceiptsCenterScreen() {
	const [receipts, setReceipts] = useState<SessionReceipt[]>([]);
	const [loading, setLoading] = useState(true);
	const textMuted = useThemeColor({}, 'muted');

	const load = useCallback(() => {
		setLoading(true);
		financeService.getReceiptsCenter()
			.then(setReceipts)
			.catch((error) => {
				console.error('Failed to load receipts center', error);
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<ThemedView style={styles.container}>
				<ScrollView contentContainerStyle={styles.content}>
					<AnimatedEntry>
						<ThemedText type="title">Central de Comprovantes</ThemedText>
						<ThemedText style={[styles.subtitle, {color: textMuted}]}>Recibo por sessão e histórico detalhado de notificações.</ThemedText>
					</AnimatedEntry>

					{loading ? <ThemedText style={{color: textMuted}}>Carregando...</ThemedText> : null}

					{!loading && !receipts.length ? (
						<ThemedText style={{color: textMuted}}>Nenhum comprovante encontrado.</ThemedText>
					) : null}

					{receipts.map((receipt) => (
						<Card key={receipt.id} style={styles.card}>
							<ThemedText type="defaultSemiBold">{STATUS_LABELS[receipt.status] ?? 'Atualização financeira'}</ThemedText>
							<ThemedText>Sessão: {new Date(receipt.sessionStart).toLocaleString('pt-BR')}</ThemedText>
							<ThemedText>Valor: {receipt.amount.toLocaleString('pt-BR', {style: 'currency', currency: receipt.currency || 'BRL'})}</ThemedText>
							<ThemedText>Descrição: {receipt.description}</ThemedText>
							<ThemedText>Emitido em: {new Date(receipt.issuedAt).toLocaleString('pt-BR')}</ThemedText>

							<View style={styles.historyWrap}>
								<ThemedText type="defaultSemiBold">Histórico detalhado</ThemedText>
								{receipt.notificationHistory.map((item, index) => (
									<ThemedText key={`${receipt.id}-${index}`} style={{color: textMuted}}>
										{item.template} · canal {item.channel} · status {item.deliveryStatus} · {new Date(item.sentAt).toLocaleString('pt-BR')}
									</ThemedText>
								))}
							</View>
						</Card>
					))}
				</ScrollView>
			</ThemedView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {flex: 1},
	container: {flex: 1},
	content: {padding: 16, gap: 12, paddingBottom: 120},
	subtitle: {marginTop: 6},
	card: {gap: 6},
	historyWrap: {marginTop: 8, gap: 4},
});
