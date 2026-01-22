import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [modalConfig, setModalConfig] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    setModalConfig(options);
    setVisible(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (modalConfig?.onConfirm) {
      modalConfig.onConfirm();
    }
    setVisible(false);
  }, [modalConfig]);

  const handleCancel = useCallback(() => {
    if (modalConfig?.onCancel) {
      modalConfig.onCancel();
    }
    setVisible(false);
  }, [modalConfig]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {modalConfig && (
        <ConfirmModal
          visible={visible}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          isDestructive={modalConfig.isDestructive}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
