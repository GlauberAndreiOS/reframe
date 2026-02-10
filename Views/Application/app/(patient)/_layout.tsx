import {Stack} from 'expo-router';

// ============= CONSTANTS =============
const SCREEN_NAMES = {
	TABS: '(tabs)',
	NEW_THOUGHT: 'new-thought',
} as const;

const STACK_OPTIONS = {
	headerShown: false,
} as const;

const NEW_THOUGHT_SCREEN_OPTIONS = {
	headerShown: true,
	presentation: 'modal',
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
		</Stack>
	);
}
