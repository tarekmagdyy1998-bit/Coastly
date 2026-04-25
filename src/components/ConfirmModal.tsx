import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger'
}) => {
  const { i18n } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-r shadow-shl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              variant === 'danger' ? 'bg-red-l text-red' : 
              variant === 'warning' ? 'bg-gold-l text-gold' : 'bg-sea-p text-sea'
            }`}>
              <AlertTriangle size={24} />
            </div>
            <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
              <h3 className="text-lg font-black">{title}</h3>
              <p className="text-sm text-ink-s">{message}</p>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {cancelText || (i18n.language === 'ar' ? 'إلغاء' : 'Cancel')}
            </Button>
            <Button 
              variant={variant === 'danger' ? 'ink' : 'sea'} 
              className={`flex-1 ${variant === 'danger' ? 'bg-red hover:bg-red-d' : ''}`}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText || (i18n.language === 'ar' ? 'تأكيد' : 'Confirm')}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
