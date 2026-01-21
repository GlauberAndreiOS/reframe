/**
 * Paleta conceitual:
 * - primary: introspecção / base cognitiva
 * - secondary: transição / clareza
 * - accent: reestruturação / esperança
 */

export const Colors = {
	light: {
		/** Texto e fundo */
		text: '#11181C',
		background: '#FFFFFF',

		/** Superfícies */
		card: '#F5F7FA',
		border: '#E0E4E8',
		muted: '#6B7280',

		/** Conceito terapêutico */
		primary: '#1A237E',   // Azul profundo
		secondary: '#0277BD', // Azul oceano
		accent: '#8BC34A',    // Verde reframe

		/** UI padrão */
		tint: '#0277BD',
		icon: '#687076',

		tabIconDefault: '#687076',
		tabIconSelected: '#0277BD',
	},

	dark: {
		/** Texto e fundo */
		text: '#ECEDEE',
		background: '#151718',

		/** Superfícies */
		card: '#1E2226',
		border: '#2A2F34',
		muted: '#9BA1A6',

		/** Conceito terapêutico (adaptado ao dark) */
		primary: '#7986CB',   // Azul profundo suavizado
		secondary: '#4FC3F7', // Azul oceano claro
		accent: '#AED581',    // Verde esperança

		/** UI padrão */
		tint: '#4FC3F7',
		icon: '#9BA1A6',

		tabIconDefault: '#9BA1A6',
		tabIconSelected: '#4FC3F7',
	},
};