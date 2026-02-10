import {Stack} from 'expo-router';

// ============= CONSTANTS =============
const STACK_OPTIONS = {
	headerShown: false,
} as const;

// ============= PSYCHOLOGIST LAYOUT COMPONENT =============
export default function PsychologistLayout() {
	return <Stack screenOptions={STACK_OPTIONS}/>;
}