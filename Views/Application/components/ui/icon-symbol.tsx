import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
	'house.fill': 'home-variant',
	'paperplane.fill': 'send',
	'chevron.left.forwardslash.chevron.right': 'code-braces',
	'chevron.right': 'chevron-right',
	'chevron.left': 'chevron-left',
	'brain.head.profile': 'brain',
	'person.fill': 'account',
	'person.2.fill': 'account-group',
	'bubble.left.fill': 'chat',
	'plus.circle.fill': 'plus-circle',
	'plus': 'add',
	'star.fill': 'star',
	'arrow.2.squarepath': 'swap-horizontal',
	'arrow.right.square': 'logout',
	'doc.text.fill': 'file-document',
	'doc.text': 'file-document-outline',
	'envelope.fill': 'email',
	'xmark.circle.fill': 'close-circle',
	'checkmark.circle.fill': 'check-circle-outline',
	'checkmark': 'check',
	'person.slash.fill': 'account-cancel',
	'trash': 'trash-can-outline',
	'doc.on.doc': 'content-copy',
	'plus.circle': 'plus-circle-outline',
	'edit': 'pencil',
	'check-box': 'checkbox-marked',
	'check-box-outline-blank': 'checkbox-blank-outline',
	'close': 'close',
	'mic.fill': 'microphone',
	'waveform.path.ecg': 'chart-timeline-variant',
	'eye.fill': 'visibility',
	'eye.slash.fill': 'visibility-off',
} as Partial<Record<string, string>>;

export type IconSymbolName = keyof typeof MAPPING;


export function IconSymbol({
	name,
	size = 24,
	color,
	style,
}: {
	name: IconSymbolName | string;
	size?: number;
	color: string | OpaqueColorValue;
	style?: StyleProp<TextStyle>;
	weight?: SymbolWeight;
}) {
	const iconName = String(MAPPING[name as IconSymbolName] || name);
	const communityGlyphMap = (MaterialCommunityIcons as unknown as { glyphMap?: Record<string, number> }).glyphMap ?? {};
	const materialGlyphMap = (MaterialIcons as unknown as { glyphMap?: Record<string, number> }).glyphMap ?? {};

	if (communityGlyphMap[iconName]) {
		return <MaterialCommunityIcons color={color} size={size} name={iconName as ComponentProps<typeof MaterialCommunityIcons>['name']} style={style} />;
	}

	if (materialGlyphMap[iconName]) {
		return <MaterialIcons color={color} size={size} name={iconName as ComponentProps<typeof MaterialIcons>['name']} style={style} />;
	}

	return <MaterialCommunityIcons color={color} size={size} name="help-circle-outline" style={style} />;
}
