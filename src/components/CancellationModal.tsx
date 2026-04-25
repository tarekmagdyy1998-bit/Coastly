import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Send } from 'lucide-react';
import { Button } from './Button';
import { motion, AnimatePresence } from 'motion/react';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  requestedBy: 'client' | 'office';
}

export const CancellationModal = ({ isOpen, onClose, onConfirm, requestedBy }: CancellationModalProps) => {
  const { t, i18n } = useTranslation();
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-r shadow-shl overflow-hidden"
          >
            <div className="p-6 border-b border-sand-d/10 flex justify-between items-center bg-red-l/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red text-white rounded-full flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red">
                    {i18n.language === 'ar' ? 'طلب إلغاء الحجز' : 'Request Cancellation'}
                  </h3>
                  <p className="text-[10px] text-ink-s font-bold uppercase tracking-wider">
                    {i18n.language === 'ar' ? 'إجراء حساس' : 'Sensitive Action'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                <X size={20} className="text-ink-s" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="bg-salt p-4 rounded-rs border border-sand-d/10">
                <p className="text-xs text-ink-s leading-relaxed">
                  {i18n.language === 'ar' 
                    ? 'بمجرد طلب الإلغاء، سيتم إخطار الطرف الآخر. يجب أن يوافق الطرفان على الإلغاء وتأكيد استرداد المستحقات المالية قبل إغلاق الحجز نهائياً.' 
                    : 'Once cancellation is requested, the other party will be notified. Both parties must agree and confirm financial reconciliation before the booking is finalized as cancelled.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-ink flex items-center gap-2">
                  {i18n.language === 'ar' ? 'سبب الإلغاء' : 'Reason for Cancellation'}
                  <span className="text-red">*</span>
                </label>
                <textarea 
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={i18n.language === 'ar' ? 'يرجى توضيح سبب الإلغاء بالتفصيل...' : 'Please explain the reason for cancellation...'}
                  className="w-full p-4 bg-salt border border-sand-d/20 rounded-rs text-sm focus:outline-none focus:border-red min-h-[120px] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex-1"
                  onClick={onClose}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit"
                  variant="ink" 
                  className="flex-1 bg-red text-white hover:bg-red-d flex items-center justify-center gap-2"
                  disabled={!reason.trim()}
                >
                  <Send size={16} /> {i18n.language === 'ar' ? 'إرسال الطلب' : 'Send Request'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
