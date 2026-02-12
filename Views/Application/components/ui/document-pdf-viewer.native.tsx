import React from 'react';
import Pdf from 'react-native-pdf';

interface DocumentPdfViewerProps {
	uri: string;
	style?: any;
	trustAllCerts?: boolean;
	onError?: (error: any) => void;
}

export function DocumentPdfViewer({uri, style, trustAllCerts = false, onError}: DocumentPdfViewerProps) {
	return (
		<Pdf
			source={{uri, cache: true}}
			style={style}
			trustAllCerts={trustAllCerts}
			onError={onError}
		/>
	);
}

