import {Tabs} from 'expo-router';
import {FloatingTabsComponent, IconSymbol} from '@/components';

// ============= CONSTANTS =============
const TAB_SCREEN_NAMES = {
	PATIENTS: 'index',
	QUESTIONNAIRES: 'questionnaires',
	AGENDA: 'agenda',
	PROFILE: 'profile',
} as const;

const TAB_SCREENS = [
	{
		name: TAB_SCREEN_NAMES.PATIENTS,
		title: 'Pacientes',
		icon: 'person.2.fill',
	},
	{
		name: TAB_SCREEN_NAMES.QUESTIONNAIRES,
		title: 'Questionários',
		icon: 'doc.text.fill',
	},
	{
		name: TAB_SCREEN_NAMES.AGENDA,
		title: 'Agenda',
		icon: 'calendar-month',
	},
	{
		name: TAB_SCREEN_NAMES.PROFILE,
		title: 'Perfil',
		icon: 'person.fill',
	},
] as const;

const TABS_OPTIONS = {
	headerShown: false,
	animation: 'shift',
} as const;

// ============= PSYCHOLOGIST TABS LAYOUT COMPONENT =============
export default function TabsPsychologistLayout() {
	return (
		<Tabs
			screenOptions={TABS_OPTIONS}
			tabBar={(props) => <FloatingTabsComponent {...props}/>}
		>
			{TAB_SCREENS.map((screen) => (
				<Tabs.Screen
					key={screen.name}
					name={screen.name}
					options={{
						title: screen.title,
						tabBarIcon: ({color}) => (
							<IconSymbol name={screen.icon} size={24} color={color}/>
						),
					}}
				/>
			))}
		</Tabs>
	);
}
