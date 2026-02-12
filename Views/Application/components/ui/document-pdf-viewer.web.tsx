import React from 'react';
import {StyleSheet, View} from 'react-native';
import {ThemedText} from '@/components/themed-text';

interface DocumentPdfViewerProps {
	uri: string;
	style?: any;
	trustAllCerts?: boolean;
	onError?: (error: any) => void;
}

export function DocumentPdfViewer({style}: DocumentPdfViewerProps) {
	return (
		<View style={[styles.container, style]}>
			<ThemedText>Visualização de PDF indisponível na web.</ThemedText>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
	},
});

