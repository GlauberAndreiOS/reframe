import { Tabs } from 'expo-router';
import FloatingTabs from "@/components/floating-tabs";
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabsPatientLayout() {
	return (
		<Tabs 
			screenOptions={{ headerShown: false }}
			tabBar={(props) => <FloatingTabs {...props} />}
		>
			<Tabs.Screen 
				name="index" 
				options={{
					title: 'Home',
					tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={24} color={color} />,
				}}
			/>
			<Tabs.Screen 
				name="profile" 
				options={{
					title: 'Perfil',
					tabBarIcon: ({ color }) => <IconSymbol name="person.fill" size={24} color={color} />,
				}}
			/>
		</Tabs>
	);
}
