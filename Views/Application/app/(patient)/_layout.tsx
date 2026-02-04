import {Stack} from 'expo-router';

export default function PatientLayout() {
	return (
		<Stack screenOptions={{headerShown: false}}>
			<Stack.Screen name="(tabs)"/>
			<Stack.Screen
				name="new-thought"
				options={{
					headerShown: true,
					presentation: 'modal',
				}}
			/>
		</Stack>
	);
}
