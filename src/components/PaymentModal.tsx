import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ShieldCheck, CreditCard, Smartphone, Landmark, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess?: () => void;
}

export const PaymentModal = ({ isOpen, onClose, amount, onSuccess }: PaymentModalProps) => {
  const [method, setMethod] = useState<'card' | 'wallet' | 'bank'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('تم الدفع بنجاح! تم حجز المبلغ في نظام الضمان.');
      if (onSuccess) onSuccess();
      onClose();
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إتمام الدفع الآمن" headerColor="bg-mint">
      <div className="space-y-6">
        {/* Steps Row */}
        <div className="flex justify-between items-center px-4 mb-8">
          {[
            { label: 'اتفاق', done: true },
            { label: 'دفع', active: true },
            { label: 'الضمان', future: true },
            { label: 'وصول', future: true },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                s.done ? "bg-mint text-white" : 
                s.active ? "bg-mint ring-4 ring-mint/20 text-white" : 
                "bg-salt text-ink-s border border-sand-d/30"
              )}>
                {s.done ? '✓' : i + 1}
              </div>
              <span className="text-[10px] font-bold text-ink-s">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Escrow Info Box */}
        <div className="bg-mint-l border border-mint/20 p-4 rounded-rs flex items-center gap-4">
          <div className="bg-mint text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="text-[10px] text-mint font-bold leading-relaxed">
            سيتم حجز المبلغ في حساب ضمان آمن. لن يتم تحويل الأموال للمكتب إلا بعد وصولك وتأكيدك للاستلام.
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="bg-salt p-4 rounded-rs border border-sand-d/20 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-ink-s">قيمة الحجز (٦ ليالٍ)</span>
            <span className="font-bold">{formatCurrency(amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-s">عمولة المنصة (مجانية)</span>
            <span className="text-gold font-bold">{formatCurrency(0)}</span>
          </div>
          <div className="pt-3 border-t border-sand-d/20 flex justify-between items-center">
            <span className="font-black">الإجمالي المطلوب</span>
            <span className="text-2xl font-black text-mint">{formatCurrency(amount)}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'card', label: 'فيزا / ماستر', icon: <CreditCard size={18} /> },
            { id: 'wallet', label: 'محفظة', icon: <Smartphone size={18} /> },
            { id: 'bank', label: 'تحويل', icon: <Landmark size={18} /> },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id as any)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-rs border-2 transition-all",
                method === m.id ? "border-mint bg-mint-l text-mint" : "border-salt bg-salt text-ink-s hover:border-sand-d"
              )}
            >
              {m.icon}
              <span className="text-[10px] font-bold">{m.label}</span>
            </button>
          ))}
        </div>

        {/* Card Fields (Simplified) */}
        {method === 'card' && (
          <div className="space-y-3">
            <input type="text" placeholder="رقم الكارت" className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-mint" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="MM/YY" className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-mint" />
              <input type="text" placeholder="CVV" className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-mint" />
            </div>
          </div>
        )}

        <Button 
          variant="mint" 
          className="w-full py-4 text-lg" 
          onClick={handlePay}
          isLoading={isProcessing}
        >
          ✅ ادفع {formatCurrency(amount)} — محمي بنظام الضمان
        </Button>
      </div>
    </Modal>
  );
};

import { cn } from '../lib/utils';
