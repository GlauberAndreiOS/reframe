import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent, ExpoSpeechRecognitionResultEvent, ExpoSpeechRecognitionErrorEvent } from 'expo-speech-recognition';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useToast } from '@/context/ToastContext';

interface VoiceInputAdornmentProps {
    onResult: (text: string) => void;
    onListeningChange?: (isListening: boolean) => void;
}

export function VoiceInputAdornment({ onResult, onListeningChange }: VoiceInputAdornmentProps) {
    const { showToast } = useToast();
    const [listening, setListening] = useState(false);
    const silenceTimer = useRef<NodeJS.Timeout | null>(null);
    const tintColor = useThemeColor({}, 'tint');
    const dangerColor = useThemeColor({}, 'danger');
    const textRef = useRef('');

    const resetSilenceTimer = () => {
        if (silenceTimer.current) {
            clearTimeout(silenceTimer.current);
        }
        silenceTimer.current = setTimeout(() => {
            stopListening();
        }, 2000);
    };

    const startListening = async () => {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!result.granted) {
            showToast('Permissão de microfone negada', 'error');
            return;
        }

        setListening(true);
        onListeningChange?.(true);
        textRef.current = '';

        ExpoSpeechRecognitionModule.start({
            lang: 'pt-BR',
            interimResults: true,
            maxAlternatives: 1,
            continuous: true,
        });

        resetSilenceTimer();
    };

    const stopListening = () => {
        if (silenceTimer.current) {
            clearTimeout(silenceTimer.current);
            silenceTimer.current = null;
        }
        ExpoSpeechRecognitionModule.stop();
        setListening(false);
        onListeningChange?.(false);
    };

    useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
        const result = event.results[0]?.transcript;
        if (result) {
            if (result !== textRef.current) {
                textRef.current = result;
                onResult(result);
                resetSilenceTimer();
            }
        }
    });

    useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
        console.log('Speech recognition error:', event);
        showToast('Erro no reconhecimento de voz', 'error');
        stopListening();
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (listening) {
                ExpoSpeechRecognitionModule.stop();
            }
            if (silenceTimer.current) {
                clearTimeout(silenceTimer.current);
            }
        };
    }, []);

    const toggleListening = () => {
        if (listening) {
            stopListening();
        } else {
            startListening();
        }
    };

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
