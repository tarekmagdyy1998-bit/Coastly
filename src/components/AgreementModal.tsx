import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CheckCircle2, Phone, MessageSquare, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface AgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onConfirm: () => void;
}

export const AgreementModal = ({ isOpen, onClose, amount, onConfirm }: AgreementModalProps) => {
  const { t, i18n } = useTranslation();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      onConfirm();
      onClose();
    }, 1000);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={i18n.language === 'ar' ? 'تأكيد الاتفاق النهائي' : 'Confirm Final Agreement'} 
      headerColor="bg-mint"
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-mint-l text-mint rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-black text-ink mb-2">
            {i18n.language === 'ar' ? 'أنت على وشك إتمام الاتفاق' : 'You are about to finalize the agreement'}
          </h3>
          <p className="text-sm text-ink-s">
            {i18n.language === 'ar' 
              ? 'بمجرد التأكيد، سيتم تبادل أرقام التواصل لإتمام عملية الدفع والحجز مباشرة مع المكتب.' 
              : 'Once confirmed, contact numbers will be exchanged to complete the payment and booking directly with the office.'}
          </p>
        </div>

        <div className="bg-salt p-4 rounded-rs border border-sand-d/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-ink-s font-bold">{i18n.language === 'ar' ? 'السعر المتفق عليه' : 'Agreed Price'}</span>
            <span className="text-xl font-black text-mint">{formatCurrency(amount)}</span>
          </div>
          <div className="text-[10px] text-ink-s">
            {i18n.language === 'ar' 
              ? '* الدفع يتم خارج المنصة (كاش أو تحويل) حسب اتفاقك مع المكتب.' 
              : '* Payment is handled outside the platform (Cash or Transfer) as per your agreement with the office.'}
          </div>
        </div>

        <div className="bg-gold-l/30 border border-gold/20 p-4 rounded-rs flex items-start gap-3">
          <ShieldCheck size={20} className="text-gold shrink-0 mt-0.5" />
          <div className="text-[10px] text-gold-d font-bold leading-relaxed">
            {i18n.language === 'ar'
              ? 'نحن نوفر لك منصة آمنة للتفاوض. يرجى التأكد من مراجعة كافة التفاصيل مع المكتب عند التواصل الهاتفي.'
              : 'We provide a secure platform for negotiation. Please ensure you review all details with the office during the phone call.'}
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            variant="mint" 
            className="w-full py-4 text-lg flex items-center justify-center gap-2" 
            onClick={handleConfirm}
            isLoading={isConfirming}
          >
            {i18n.language === 'ar' ? 'تأكيد ومشاركة رقمي' : 'Confirm & Share My Number'}
          </Button>
          <Button variant="ghost" className="w-full text-ink-s" onClick={onClose}>
            {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
