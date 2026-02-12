import {Stack} from 'expo-router';

// ============= CONSTANTS =============
const SCREEN_NAMES = {
	TABS: '(tabs)',
	NEW_THOUGHT: 'new-thought',
	DOCUMENTS: 'documents/index',
} as const;

const STACK_OPTIONS = {
	headerShown: false,
} as const;

const NEW_THOUGHT_SCREEN_OPTIONS = {
	headerShown: true,
	presentation: 'modal',
} as const;

const DOCUMENTS_SCREEN_OPTIONS = {
	headerShown: true,
	title: 'Documentos',
} as const;

// ============= PATIENT LAYOUT COMPONENT =============
export default function PatientLayout() {
	return (
		<Stack screenOptions={STACK_OPTIONS}>
			<Stack.Screen name={SCREEN_NAMES.TABS}/>
			<Stack.Screen
				name={SCREEN_NAMES.NEW_THOUGHT}
				options={NEW_THOUGHT_SCREEN_OPTIONS}
			/>
			<Stack.Screen
				name={SCREEN_NAMES.DOCUMENTS}
				options={DOCUMENTS_SCREEN_OPTIONS}
			/>
		</Stack>
	);
}
