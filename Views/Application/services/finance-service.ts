import api from './api';
import type {NotificationChannel, NotificationDeliveryStatus} from './finance-types';

export interface ReceiptNotificationLog {
	template: string;
	channel: NotificationChannel;
	sentAt: string;
	deliveryStatus: NotificationDeliveryStatus;
}

export interface SessionReceipt {
	id: string;
	appointmentId: string;
	sessionStart: string;
	sessionEnd: string;
	amount: number;
	currency: string;
	status: number;
	description: string;
	issuedAt: string;
	notificationHistory: ReceiptNotificationLog[];
}

const API_ENDPOINTS = {
	GET_RECEIPTS_CENTER: '/Finance/receipts-center',
} as const;

export const financeService = {
	getReceiptsCenter: (): Promise<SessionReceipt[]> => {
		return api.get(API_ENDPOINTS.GET_RECEIPTS_CENTER)
			.then((response) => response.data)
			.catch((error) => {
				console.error('Error fetching receipts center:', error);
				throw error;
			});
	},
};
