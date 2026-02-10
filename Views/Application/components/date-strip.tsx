import React, { useRef, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface DateStripProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    dayStatusMap?: Record<string, 'requested' | 'confirmed' | 'rejected'>;
}

export function DateStrip({ selectedDate, onSelectDate, dayStatusMap }: DateStripProps) {
	const scrollViewRef = useRef<ScrollView>(null);
	const dates: Date[] = [];

	// Generate next 30 days
	for (let i = 0; i < 30; i++) {
		const d = new Date();
		d.setDate(d.getDate() + i);
		dates.push(d);
	}

	const isSelected = (d: Date) =>
		d.getDate() === selectedDate.getDate() &&
        d.getMonth() === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear();

	const toDateKey = (date: Date): string => {
		const y = date.getFullYear();
		const m = `${date.getMonth() + 1}`.padStart(2, '0');
		const d = `${date.getDate()}`.padStart(2, '0');
		return `${y}-${m}-${d}`;
	};

	const getDateStatusStyle = (date: Date) => {
		const status = dayStatusMap?.[toDateKey(date)];
		switch (status) {
		case 'confirmed':
			return styles.dateItemConfirmed;
		case 'requested':
			return styles.dateItemRequested;
		case 'rejected':
			return styles.dateItemRejected;
		default:
			return null;
		}
	};

	const hasDayStatus = (date: Date): boolean => {
		return !!dayStatusMap?.[toDateKey(date)];
	};

	return (
		<View style={styles.container}>
			<ScrollView
				ref={scrollViewRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{dates.map((date, index) => {
					const selected = isSelected(date);
					const isColoredDay = hasDayStatus(date);
					return (
						<TouchableOpacity
							key={index}
							style={[
								styles.dateItem,
								!selected && getDateStatusStyle(date),
								selected && styles.dateItemSelected,
							]}
							onPress={() => onSelectDate(date)}
						>
							<ThemedText style={[styles.dayText, isColoredDay && styles.textOnColored, selected && styles.textSelected]}>
								{date.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '')}
							</ThemedText>
							<ThemedText type="title" style={[styles.dateText, isColoredDay && styles.textOnColored, selected && styles.textSelected]}>
								{date.getDate()}
							</ThemedText>
						</TouchableOpacity>
					);
				})}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		height: 80,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	scrollContent: {
		paddingHorizontal: 16,
		alignItems: 'center',
	},
	dateItem: {
		width: 60,
		height: 70,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 8,
		borderRadius: 12,
		backgroundColor: 'rgba(0,0,0,0.02)',
	},
	dateItemSelected: {
		backgroundColor: '#0a7ea4',
	},
	dateItemRequested: {
		backgroundColor: '#facc15',
	},
	dateItemConfirmed: {
		backgroundColor: '#22c55e',
	},
	dateItemRejected: {
		backgroundColor: '#ef4444',
	},
	dayText: {
		fontSize: 12,
		opacity: 0.6,
	},
	dateText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	textSelected: {
		color: '#fff',
		opacity: 1,
	},
	textOnColored: {
		color: '#fff',
		opacity: 1,
	},
});
