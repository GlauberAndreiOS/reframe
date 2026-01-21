import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FloatingTabs from '@/components/floating-tabs';

export default function TabsPsychologistLayout() {
	const colorScheme = useColorScheme() ?? 'light';

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
			}}
			tabBar={(props) => (
				<FloatingTabs
					{...props}
					colorScheme={colorScheme}
				/>
			)}
		>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="profile" />
		</Tabs>
	);
}
