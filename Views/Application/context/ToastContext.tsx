import React, {createContext, ReactNode, useCallback, useContext, useState} from 'react';
import {Toast, ToastType} from '@/components/ui/toast';

interface ToastData {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({children}: { children: ReactNode }) {
	const [toast, setToast] = useState<ToastData | null>(null);

	const hideToast = useCallback(() => {
		setToast(null);
	}, []);

	const showToast = useCallback((message: string, type: ToastType = 'info') => {
		const id = Math.random().toString(36).substring(7);
		setToast({id, message, type});

		setTimeout(() => {
			setToast((current) => (current?.id === id ? null : current));
		}, 3000);
	}, []);

	return (
		<ToastContext.Provider value={{showToast, hideToast}}>
			{children}
			{toast && (
				<Toast
					key={toast.id}
					message={toast.message}
					type={toast.type}
					onHide={hideToast}
				/>
			)}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context;
}
