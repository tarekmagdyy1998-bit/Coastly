import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'red' | 'sea' | 'coral';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'red',
  loading = false
}) => {
  const { i18n } = useTranslation();
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      headerColor={variant === 'red' ? 'bg-red' : variant === 'sea' ? 'bg-sea' : 'bg-coral'}
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${variant === 'red' ? 'bg-red-l text-red' : variant === 'sea' ? 'bg-sea-l text-sea' : 'bg-coral-l text-coral'}`}>
            <AlertTriangle size={24} />
          </div>
          <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
            <p className="text-sm text-ink-s leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText || (i18n.language === 'ar' ? 'إلغاء' : 'Cancel')}
          </Button>
          <Button 
            variant={variant} 
            className="flex-1" 
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText || (i18n.language === 'ar' ? 'تأكيد' : 'Confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
