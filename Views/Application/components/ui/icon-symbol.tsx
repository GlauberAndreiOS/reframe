import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
	// See MaterialIcons here: https://icons.expo.fyi
	// See SF Symbols in the SF Symbols app on Mac.
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
  
	// Added icons
	'mic.fill': 'mic',
	'waveform': 'graphic-eq',
	'trash': 'delete',
	'arrow.clockwise.circle.fill': 'sync',
	'cloud.fill': 'cloud',
	'exclamationmark.triangle.fill': 'warning',
	'information-circle': 'info',
	'alert-circle': 'error',
	'checkmark-circle': 'check-circle',
} as Partial<Record<string, ComponentProps<typeof MaterialIcons>['name']>>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
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
