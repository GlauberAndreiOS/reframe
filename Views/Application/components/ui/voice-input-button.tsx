import React, { useEffect, useState, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { 
	ExpoSpeechRecognitionModule, 
	useSpeechRecognitionEvent 
} from 'expo-speech-recognition';
import { useToast } from '@/context/ToastContext';

interface VoiceInputButtonProps {
  onTextRecognized: (text: string) => void;
  isListening?: boolean;
  onListeningStateChanged?: (isListening: boolean) => void;
}

export function VoiceInputButton({ 
	onTextRecognized, 
	isListening: externalIsListening,
	onListeningStateChanged 
}: VoiceInputButtonProps) {
	const [internalIsListening, setInternalIsListening] = useState(false);
	const [permissionGranted, setPermissionGranted] = useState(false);
	const { showToast } = useToast();

	const isListeningRef = useRef(false);
	const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

	const mutedColor = useThemeColor({}, 'muted');
	const errorColor = '#EF4444';

	const isListening = externalIsListening ?? internalIsListening;

	useEffect(() => {
		isListeningRef.current = !!isListening;
		if (!isListening) {
			clearSilenceTimer();
		}
	}, [isListening]);

	useEffect(() => {
		const checkPermissions = async () => {
			const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
			setPermissionGranted(result.granted);
		};
		checkPermissions();
	}, []);

	const clearSilenceTimer = () => {
		if (silenceTimerRef.current) {
			clearTimeout(silenceTimerRef.current);
			silenceTimerRef.current = null;
		}
	};

	const resetSilenceTimer = () => {
		clearSilenceTimer();
		silenceTimerRef.current = setTimeout(() => {
			if (isListeningRef.current) {
				handleStop();
				showToast("Parei de ouvir por inatividade.", "info");
			}
		}, 3000);
	};

	useSpeechRecognitionEvent("start", () => {
		if (isListeningRef.current) {
			setInternalIsListening(true);
			onListeningStateChanged?.(true);
			resetSilenceTimer();
		}
	});

	useSpeechRecognitionEvent("end", () => {
		if (isListeningRef.current) {
			setInternalIsListening(false);
			onListeningStateChanged?.(false);
			clearSilenceTimer();
		}
	});

	useSpeechRecognitionEvent("result", (event) => {
		if (!isListeningRef.current) return;

		resetSilenceTimer();

		if (event.results && event.results.length > 0) {
			const text = event.results[0]?.transcript;
			if (text) {
				onTextRecognized(text);
			}
		}
	});

	useSpeechRecognitionEvent("error", (event) => {
		if (!isListeningRef.current) return;
    
		setInternalIsListening(false);
		onListeningStateChanged?.(false);
		clearSilenceTimer();
	});

	const handleStart = async () => {
		if (!permissionGranted) {
			const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
			if (!result.granted) {
				showToast("Permissão de microfone negada.", "error");
				return;
			}
			setPermissionGranted(true);
		}

		try {
			isListeningRef.current = true;
      
			ExpoSpeechRecognitionModule.start({
				lang: "pt-BR",
				interimResults: true,
				maxAlternatives: 1,
				continuous: true,
			});
      
			setInternalIsListening(true);
			onListeningStateChanged?.(true);
		} catch {
			showToast("Falha ao iniciar reconhecimento.", "error");
			isListeningRef.current = false;
		}
	};

	const handleStop = () => {
		try {
			ExpoSpeechRecognitionModule.stop();
		} catch {}
	};

	const toggleListening = () => {
		if (isListening) {
			handleStop();
		} else {
			handleStart();
		}
	};

	return (
		<TouchableOpacity 
			onPress={toggleListening}
			hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
		>
			<IconSymbol
				size={20}
				name={isListening ? "waveform" : "mic.fill"} 
				color={isListening ? errorColor : mutedColor} 
			/>
		</TouchableOpacity>
	);
}
