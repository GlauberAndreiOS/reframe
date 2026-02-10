import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import {
	ExpoSpeechRecognitionModule,
	useSpeechRecognitionEvent,
	ExpoSpeechRecognitionResultEvent,
	ExpoSpeechRecognitionErrorEvent,
} from 'expo-speech-recognition';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/ToastContext';
import { getActiveSession, setActiveSession } from '@/utils/speech-session';

interface VoiceInputAdornmentProps {
	id: string;
	value: string;
	onResult: (text: string) => void;
	onListeningChange?: (isListening: boolean) => void;
}

export function VoiceInputAdornment({
	id,
	value,
	onResult,
	onListeningChange,
}: VoiceInputAdornmentProps) {
	const isWeb = Platform.OS === 'web';
	const { showToast } = useToast();

	const [listening, setListening] = useState(false);
	const listeningRef = useRef(false);

	const baseTextRef = useRef('');
	const lastTranscriptRef = useRef('');

	const tintColor = useThemeColor({}, 'tint');
	const dangerColor = useThemeColor({}, 'danger');

	useEffect(() => {
		listeningRef.current = listening;
		onListeningChange?.(listening);
	}, [listening, onListeningChange]);

	const startListening = useCallback(async () => {
		if (isWeb) return;

		try {
			const active = getActiveSession();
			if (active && active !== id) return;

			const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
			if (!perm.granted) {
				showToast('Permissão de microfone negada', 'error');
				return;
			}

			baseTextRef.current = value?.trim() ? value + ' ' : '';
			lastTranscriptRef.current = '';

			setActiveSession(id);
			setListening(true);

			ExpoSpeechRecognitionModule.start({
				lang: 'pt-BR',
				interimResults: true,
				maxAlternatives: 1,
				continuous: false,
			});
		} catch {
			showToast('Erro ao iniciar reconhecimento de voz', 'error');
			setListening(false);
			setActiveSession(null);
		}
	}, [id, value, showToast, isWeb]);

	const stopListening = useCallback(() => {
		if (isWeb) return;

		if (getActiveSession() === id) {
			setActiveSession(null);
		}
		try {
			ExpoSpeechRecognitionModule.stop();
		} catch {}
		setListening(false);
	}, [id, isWeb]);

	useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
		if (isWeb) return;
		if (getActiveSession() !== id) return;

		const transcript = event.results?.[0]?.transcript;
		if (!transcript) return;
		if (transcript === lastTranscriptRef.current) return;

		lastTranscriptRef.current = transcript;
		onResult(baseTextRef.current + transcript);
	});

	useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
		if (isWeb) return;
		if (getActiveSession() !== id) return;

		if (event.error === 'no-speech' || event.code === 7) {
			setActiveSession(null);
			setListening(false);
			return;
		}

		showToast('Erro no reconhecimento de voz', 'error');
		setActiveSession(null);
		setListening(false);
	});

	useEffect(() => {
		return () => {
			if (isWeb) return;
			if (getActiveSession() === id) {
				try { ExpoSpeechRecognitionModule.stop(); } catch {}
				setActiveSession(null);
			}
		};
	}, [id, isWeb]);

	const toggleListening = () => {
		if (listeningRef.current) stopListening();
		else void startListening();
	};

	if (isWeb) return null;

	return (
		<TouchableOpacity onPress={toggleListening} style={{ padding: 4 }}>
			<IconSymbol
				name={listening ? 'waveform.path.ecg' : 'mic.fill'}
				size={24}
				color={listening ? dangerColor : tintColor}
			/>
		</TouchableOpacity>
	);
}
