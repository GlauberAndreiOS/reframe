import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Image} from 'expo-image';
import {IconSymbol} from '@/components/ui/icon-symbol';
import {useThemeColor} from '@/hooks/use-theme-color';
import * as ImagePicker from 'expo-image-picker';

interface AvatarProps {
    uri?: string | null;
    size?: number;
    onUpload?: (file: any) => Promise<void>;
    editable?: boolean;
    name?: string;
}

export function Avatar({uri, size = 100, onUpload, editable = false, name}: AvatarProps) {
	const [loading, setLoading] = useState(false);
	const primaryColor = useThemeColor({}, 'tint');
	const backgroundColor = useThemeColor({}, 'card');
	const textColor = useThemeColor({}, 'text');

	const handlePickImage = async () => {
		if (!editable || !onUpload) return;

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			allowsMultipleSelection: false,
			aspect: [1, 1],
			quality: 0.8,
		});

		if (!result.canceled && result.assets && result.assets.length > 0) {
			setLoading(true);
			try {
				const asset = result.assets[0];
                
				const formData = new FormData();
				// @ts-ignore
				formData.append('file', {
					uri: asset.uri,
					name: 'profile.jpg',
					type: 'image/jpeg',
				});

				await onUpload(formData);
			} catch (error) {
				console.error("Upload failed", error);
			} finally {
				setLoading(false);
			}
		}
	};

	const getInitials = (name?: string) => {
		if (!name) return '?';
		const parts = name.split(' ');
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};

	const imageUrl = uri?.startsWith('/') 
		? `${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.5:5088'}${uri}` 
		: uri;

	return (
		<TouchableOpacity 
			onPress={handlePickImage} 
			disabled={!editable} 
			style={[styles.container, {width: size, height: size, borderRadius: size / 2, backgroundColor}]}
		>
			{imageUrl ? (
				<Image
					style={{width: size, height: size, borderRadius: size / 2}}
					source={{ uri: imageUrl }}
					contentFit="cover"
					transition={500}
					cachePolicy="disk"
					onLoadStart={() => setLoading(true)}
					onLoadEnd={() => setLoading(false)}
				/>
			) : (
				<View style={[styles.placeholder, {width: size, height: size, borderRadius: size / 2}]}>
					{name ? (
						<Text style={[styles.initials, {fontSize: size * 0.4, color: primaryColor}]}>
							{getInitials(name)}
						</Text>
					) : (
						<IconSymbol name="person.fill" size={size * 0.5} color={textColor + '40'} />
					)}
				</View>
			)}

			{loading && (
				<View style={[styles.loadingOverlay, {borderRadius: size / 2}]}>
					<ActivityIndicator color={primaryColor} />
				</View>
			)}

			{editable && !loading && (
				<View style={[styles.editBadge, {backgroundColor: primaryColor}]}>
					<IconSymbol name="edit" size={14} color="#fff" />
				</View>
			)}
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'visible',
		borderWidth: 1,
		borderColor: 'rgba(150,150,150,0.1)',
	},
	placeholder: {
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	initials: {
		fontWeight: 'bold',
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.3)',
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	editBadge: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		width: 28,
		height: 28,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: '#fff',
		zIndex: 10,
		elevation: 5,
	}
});
