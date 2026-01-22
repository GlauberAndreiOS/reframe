

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {


	'house.fill': 'home',
	'paperplane.fill': 'send',
	'chevron.left.forwardslash.chevron.right': 'code',
	'chevron.right': 'chevron-right',
	'brain.head.profile': 'psychology',
	'person.fill': 'person',
	'person.2.fill': 'people',
	'bubble.left.fill': 'chat-bubble',
	'plus.circle.fill': 'add-circle',
	'plus': 'add',
	'star.fill': 'star',
	'arrow.2.squarepath': 'swap-horiz',
	'arrow.right.square': 'logout',
	'doc.text.fill': 'description',
	'doc.text': 'description',
	'envelope.fill': 'email',
	'xmark.circle.fill': 'cancel',
	'checkmark.circle.fill': 'check-circle',
	'person.slash.fill': 'person-off',
} as Partial<Record<string, ComponentProps<typeof MaterialIcons>['name']>>;

export type IconSymbolName = keyof typeof MAPPING;


export function IconSymbol({
	name,
	size = 24,
	color,
	style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
	return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
