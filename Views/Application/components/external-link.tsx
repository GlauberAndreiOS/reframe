import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform, TouchableOpacity } from 'react-native';

type Props = ComponentProps<typeof TouchableOpacity> & { href: string };

export function ExternalLink({ href, children, ...rest }: Props) {
	return (
		<TouchableOpacity
			{...rest}
			onPress={async () => {
				if (Platform.OS !== 'web') {
					// Open the link in an in-app browser.
					await openBrowserAsync(href, {
						presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
					});
				} else {
					window.open(href, '_blank');
				}
			}}
		>
			{children}
		</TouchableOpacity>
	);
}
