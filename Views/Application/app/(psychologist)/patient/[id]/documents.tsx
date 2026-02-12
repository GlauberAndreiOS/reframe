import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Stack, useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AmbientBackground, DocumentPdfViewer, GlassInput, IconSymbol, ThemedText, ThemedView} from '@/components';
import {api, buildFileUrl} from '@/services';
import type {PatientDocumentDto} from '@/services';
import {useThemeColor, useColorScheme} from '@/hooks';
import {useToast} from '@/context';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const TEXT_EXTENSIONS = new Set(['.txt', '.json', '.log', '.md']);
const BINARY_PREVIEW_BYTES = 256;
const MAX_CSV_PREVIEW_ROWS = 60;

type ViewerMode = 'loading' | 'pdf' | 'csv' | 'text' | 'binary' | 'error';

const normalizeExtension = (extension?: string | null): string => (extension || '').toLowerCase();
const parseCsvLine = (line: string, delimiter: string): string[] => {
	const values: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
				current += '"';
				i++;
				continue;
			}
			inQuotes = !inQuotes;
			continue;
		}

		if (char === delimiter && !inQuotes) {
			values.push(current.trim());
			current = '';
			continue;
		}
		current += char;
	}

	values.push(current.trim());
	return values;
};

const parseCsvContent = (content: string): string[][] => {
	const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
	if (!lines.length) return [];
	const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
	return lines.slice(0, MAX_CSV_PREVIEW_ROWS).map((line) => parseCsvLine(line, delimiter));
};

const toHexPreview = (bytes: Uint8Array): string => {
	const preview = bytes.slice(0, BINARY_PREVIEW_BYTES);
	return Array.from(preview)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join(' ');
};

export default function PsychologistPatientDocumentsScreen() {
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

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [documents, setDocuments] = useState<PatientDocumentDto[]>([]);
	const [search, setSearch] = useState('');
	const [viewerVisible, setViewerVisible] = useState(false);
	const [viewerUrl, setViewerUrl] = useState<string | null>(null);
	const [viewerTitle, setViewerTitle] = useState('');
	const [viewerMode, setViewerMode] = useState<ViewerMode>('loading');
	const [viewerError, setViewerError] = useState('');
	const [viewerText, setViewerText] = useState('');
	const [viewerCsvRows, setViewerCsvRows] = useState<string[][]>([]);
	const [viewerBinaryPreview, setViewerBinaryPreview] = useState('');
	const [viewerDocMeta, setViewerDocMeta] = useState<PatientDocumentDto | null>(null);

	const fetchDocuments = useCallback(() => {
		if (!patientId) return;
		setLoading(true);
		api.get<PatientDocumentDto[]>(`/Psychologist/patient/${patientId}/documents`)
			.then((response) => setDocuments(response.data ?? []))
			.catch((error) => {
				console.error('Failed to load patient documents:', error);
				showToast('Falha ao carregar documentos.', 'error');
			})
			.finally(() => setLoading(false));
	}, [patientId, showToast]);

	useEffect(() => {
		fetchDocuments();
	}, [fetchDocuments]);

	const refreshDocuments = useCallback(() => {
		if (!patientId) return;
		setRefreshing(true);
		api.get<PatientDocumentDto[]>(`/Psychologist/patient/${patientId}/documents`)
			.then((response) => setDocuments(response.data ?? []))
			.catch((error) => {
				console.error('Failed to refresh patient documents:', error);
				showToast('Falha ao carregar documentos.', 'error');
			})
			.finally(() => setRefreshing(false));
	}, [patientId, showToast]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return documents;
		return documents.filter((doc) =>
			(doc.displayName || '').toLowerCase().includes(q) ||
			(doc.originalFileName || '').toLowerCase().includes(q) ||
			(doc.kind || '').toLowerCase().includes(q)
		);
	}, [documents, search]);

	const resolveFileUrl = (path: string): string => {
		return buildFileUrl(path);
	};

	const handleOpen = async (doc: PatientDocumentDto) => {
		const fileUrl = resolveFileUrl(doc.relativePath);
		const extension = normalizeExtension(doc.extension);
		const mimeType = (doc.mimeType || '').toLowerCase();
		const isPdf = extension === '.pdf' || mimeType.includes('pdf');
		const isCsv = extension === '.csv' || mimeType.includes('csv');
		const isText = mimeType.startsWith('text/') || TEXT_EXTENSIONS.has(extension);

		setViewerVisible(true);
		setViewerUrl(fileUrl);
		setViewerTitle(doc.displayName || doc.originalFileName);
		setViewerMode('loading');
		setViewerError('');
		setViewerText('');
		setViewerCsvRows([]);
		setViewerBinaryPreview('');
		setViewerDocMeta(doc);

		try {
			if (isPdf) {
				setViewerMode('pdf');
				return;
			}
			const response = await fetch(fileUrl);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			if (isCsv) {
				const content = await response.text();
				setViewerCsvRows(parseCsvContent(content));
				setViewerMode('csv');
				return;
			}

			if (isText) {
				const content = await response.text();
				setViewerText(content);
				setViewerMode('text');
				return;
			}

			const bytes = new Uint8Array(await response.arrayBuffer());
			setViewerBinaryPreview(toHexPreview(bytes));
			setViewerMode('binary');
		} catch (error) {
			console.error('Failed to open document:', error);
			setViewerMode('error');
			setViewerError('Nao foi possivel carregar o documento para visualizacao.');
		}
	};

	const handleOpenExternal = async () => {
		if (!viewerUrl) return;
		try {
			await Linking.openURL(viewerUrl);
		} catch (error) {
			console.error('Failed to open external URL:', error);
			showToast('Nao foi possivel abrir no navegador.', 'error');
		}
	};

	const getDocumentKey = (item: PatientDocumentDto, index: number): string => {
		if (item.id && item.id !== EMPTY_GUID) return item.id;
		return `${item.relativePath || 'doc'}-${item.uploadedAtUtc || 'no-date'}-${index}`;
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					header: ({navigation}) => (
						<SafeAreaView edges={['top']} style={[styles.customHeader, {borderBottomColor: borderColor}]}>
							<View style={styles.customHeaderContent}>
								<TouchableOpacity style={styles.customBackButton} onPress={() => navigation.goBack()}>
									<IconSymbol name="chevron.left" size={20} color={tintColor}/>
								</TouchableOpacity>
								<View style={styles.customHeaderTextContainer}>
									<ThemedText style={styles.customHeaderTitle}>Documentos</ThemedText>
									<ThemedText style={[styles.customHeaderSubtitle, {color: mutedColor}]}>
										Paciente: {patientName}
									</ThemedText>
								</View>
							</View>
						</SafeAreaView>
					),
				}}
			/>
			<AmbientBackground/>
			<SafeAreaView style={styles.safeArea}>
				<View style={[styles.card, {borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : cardColor}]}>
					<GlassInput placeholder="Buscar por nome/tipo" value={search} onChangeText={setSearch}/>
				</View>

				{loading ? (
					<View style={styles.center}><ActivityIndicator size="large" color={tintColor}/></View>
				) : (
					<FlatList
						data={filtered}
						keyExtractor={getDocumentKey}
						refreshing={refreshing}
						onRefresh={refreshDocuments}
						contentContainerStyle={styles.list}
						ListEmptyComponent={<ThemedText style={{color: mutedColor}}>Nenhum documento.</ThemedText>}
						renderItem={({item}) => (
							<View style={[styles.item, {borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : cardColor}]}>
								<View style={{flex: 1}}>
									<ThemedText style={styles.itemTitle}>{item.displayName || item.originalFileName}</ThemedText>
									<ThemedText style={{color: mutedColor, fontSize: 12}}>
										{item.kind} | {item.extension} | {new Date(item.uploadedAtUtc).toLocaleString('pt-BR')}
									</ThemedText>
								</View>
								<TouchableOpacity style={[styles.actionBtn, {borderColor: tintColor}]} onPress={() => handleOpen(item)}>
									<IconSymbol name="arrow.up.forward.app.fill" size={16} color={tintColor}/>
								</TouchableOpacity>
							</View>
						)}
					/>
				)}

				<Modal visible={viewerVisible} animationType="slide" onRequestClose={() => setViewerVisible(false)}>
					<ThemedView style={styles.viewerContainer}>
						<SafeAreaView style={styles.viewerSafeArea}>
							<View style={styles.viewerHeader}>
								<ThemedText style={styles.viewerTitle} numberOfLines={1}>{viewerTitle || 'Documento'}</ThemedText>
								<View style={styles.viewerHeaderActions}>
									<TouchableOpacity style={[styles.viewerButton, {borderColor: tintColor}]} onPress={handleOpenExternal}>
										<IconSymbol name="arrow.up.forward.app.fill" size={16} color={tintColor}/>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.viewerButton, {borderColor: borderColor}]} onPress={() => setViewerVisible(false)}>
										<IconSymbol name="xmark.circle.fill" size={16} color={mutedColor}/>
									</TouchableOpacity>
								</View>
							</View>
							{viewerMode === 'loading' && <View style={styles.center}><ActivityIndicator size="large" color={tintColor}/></View>}
							{viewerMode === 'pdf' && viewerUrl && (
								<DocumentPdfViewer
									uri={viewerUrl}
									style={styles.pdfView}
									onError={(error) => {
										console.error('Failed to render PDF:', error);
										setViewerMode('error');
										setViewerError('Nao foi possivel renderizar o PDF neste dispositivo.');
									}}
								/>
							)}
							{viewerMode === 'csv' && (
								<ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
									{viewerCsvRows.map((row, rowIndex) => (
										<View key={`row-${rowIndex}`} style={[styles.csvRow, rowIndex === 0 && styles.csvHeaderRow]}>
											{row.map((cell, colIndex) => (
												<View key={`cell-${rowIndex}-${colIndex}`} style={styles.csvCell}>
													<ThemedText style={[styles.csvText, rowIndex === 0 && styles.csvHeaderText]}>{cell || '-'}</ThemedText>
												</View>
											))}
										</View>
									))}
								</ScrollView>
							)}
							{viewerMode === 'text' && (
								<ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
									<ThemedText style={styles.textPreview}>{viewerText || '-'}</ThemedText>
								</ScrollView>
							)}
							{viewerMode === 'binary' && (
								<ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
									<ThemedText style={styles.binaryMeta}>Tipo: {viewerDocMeta?.mimeType || viewerDocMeta?.extension || 'binario'}</ThemedText>
									<ThemedText style={styles.binaryMeta}>Tamanho: {viewerDocMeta?.sizeBytes ?? 0} bytes</ThemedText>
									<ThemedText style={styles.binaryPreview}>{viewerBinaryPreview || '-'}</ThemedText>
								</ScrollView>
							)}
							{viewerMode === 'error' && <View style={styles.center}><ThemedText>{viewerError}</ThemedText></View>}
						</SafeAreaView>
					</ThemedView>
				</Modal>
			</SafeAreaView>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {flex: 1},
	safeArea: {flex: 1},
	customHeader: {
		backgroundColor: 'transparent',
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	customHeaderContent: {
		paddingHorizontal: 10,
		paddingBottom: 10,
		flexDirection: 'row',
		alignItems: 'center',
	},
	customBackButton: {
		width: 36,
		height: 36,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 2,
	},
	customHeaderTextContainer: {
		flex: 1,
	},
	customHeaderTitle: {
		fontSize: 16,
		fontWeight: '800',
	},
	customHeaderSubtitle: {
		fontSize: 12,
		marginTop: 2,
	},
	card: {marginHorizontal: 24, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10},
	center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
	list: {padding: 24, gap: 10},
	item: {borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8},
	itemTitle: {fontSize: 14, fontWeight: '700'},
	actionBtn: {width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
	viewerContainer: {flex: 1},
	viewerSafeArea: {flex: 1},
	viewerHeader: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	viewerTitle: {
		flex: 1,
		fontSize: 14,
		fontWeight: '700',
		marginRight: 12,
	},
	viewerHeaderActions: {
		flexDirection: 'row',
		gap: 8,
	},
	viewerButton: {
		width: 36,
		height: 36,
		borderRadius: 10,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pdfView: {flex: 1},
	previewContainer: {flex: 1},
	previewContent: {padding: 12, gap: 8},
	csvRow: {flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#444'},
	csvHeaderRow: {backgroundColor: 'rgba(255,255,255,0.06)'},
	csvCell: {flex: 1, paddingVertical: 8, paddingHorizontal: 6},
	csvText: {fontSize: 12},
	csvHeaderText: {fontWeight: '700'},
	textPreview: {fontSize: 13, lineHeight: 20},
	binaryMeta: {fontSize: 12, marginBottom: 6},
	binaryPreview: {fontSize: 11, lineHeight: 16},
});
