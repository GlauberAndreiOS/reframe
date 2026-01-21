import { Tabs } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FloatingTabs from "@/components/floating-tabs";

export default function TabsPatientLayout() {
	const colorScheme = useColorScheme() ?? 'light'

	return (
		<Tabs screenOptions={{ headerShown: false }}
			tabBar={(props) => (
				<FloatingTabs
					colorScheme={colorScheme}
					{...props}
				/>
		      )}
		>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="profile" />
		</Tabs>
	);
}
