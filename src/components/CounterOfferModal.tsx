import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Negotiation, Chalet } from '../types';
import { db, doc, updateDoc, handleFirestoreError, OperationType, collection, query, where, getDocs } from '../firebase';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { TrendingUp, Sparkles, Calendar, Tag, MessageSquare, Home, Search, ChevronDown } from 'lucide-react';
import { createNotification } from '../services/notificationService';
import { useTranslation } from 'react-i18next';

interface CounterOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  negotiation: Negotiation;
}

export const CounterOfferModal = ({ isOpen, onClose, negotiation }: CounterOfferModalProps) => {
  const { t, i18n } = useTranslation();
  const [counterPrice, setCounterPrice] = useState(negotiation.currentOffer);
  const [suggestedDates, setSuggestedDates] = useState(negotiation.dates || '');
  const [isSpecialDeal, setIsSpecialDeal] = useState(false);
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [otherChalets, setOtherChalets] = useState<Chalet[]>([]);
  const [selectedChalet, setSelectedChalet] = useState<{ id: string, name: string, image?: string } | null>(null);
  const [isChaletListOpen, setIsChaletListOpen] = useState(false);

  useEffect(() => {
    const fetchOtherChalets = async () => {
      try {
        const q = query(
          collection(db, 'chalets'),
          where('officeId', '==', negotiation.officeId)
        );
        const snapshot = await getDocs(q);
        const chalets = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Chalet))
          .filter(c => c.id !== negotiation.chaletId);
        setOtherChalets(chalets);
      } catch (error) {
        console.error('Error fetching office chalets:', error);
      }
    };

    if (isOpen) {
      fetchOtherChalets();
    }
  }, [isOpen, negotiation.officeId, negotiation.chaletId]);

  const handleSendCounter = async () => {
    setIsSending(true);
    try {
      const negRef = doc(db, 'negotiations', negotiation.id);
      await updateDoc(negRef, {
        status: 'counter',
        counterOffer: counterPrice,
        currentOffer: counterPrice,
        suggestedDates: suggestedDates !== negotiation.dates ? suggestedDates : null,
        isSpecialDeal: isSpecialDeal,
        note: note || null,
        suggestedChaletId: selectedChalet?.id || null,
        suggestedChaletName: selectedChalet?.name || null,
        suggestedChaletImage: selectedChalet?.image || null
      });

      // Trigger Notification
      await createNotification(
        negotiation.userId,
        i18n.language === 'ar' ? 'عرض مقابل جديد' : 'New Counter Offer',
        i18n.language === 'ar' 
          ? `قدم المكتب عرضاً مقابلاً لشاليه ${negotiation.chaletName} بسعر ${counterPrice} ج.م`
          : `The office made a counter offer for ${negotiation.chaletName} at ${counterPrice} EGP`,
        'offer',
        '/negotiations'
      );

      toast.success(i18n.language === 'ar' ? 'تم إرسال العرض المقابل بنجاح!' : 'Counter offer sent successfully!');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${negotiation.id}`);
      toast.error('فشل في إرسال العرض المقابل');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقديم عرض مقابل" headerColor="bg-gold">
      <div className="space-y-6">
        <div className="bg-salt p-4 rounded-rs border border-sand-d/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-ink-s">العرض الحالي:</span>
            <span className="text-sm font-black text-ink">{formatCurrency(negotiation.currentOffer)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-ink-s">التواريخ المطلوبة:</span>
            <span className="text-sm font-bold text-ink-m">{negotiation.dates}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ink-s flex items-center gap-2">
            <TrendingUp size={14} className="text-gold" /> سعرك المقابل المقترح:
          </label>
          <div className="relative">
            <input 
              type="number"
              value={counterPrice}
              onChange={(e) => setCounterPrice(Number(e.target.value))}
              className="w-full bg-gold-l border-2 border-gold/20 rounded-rs p-4 text-3xl font-black text-gold outline-none"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gold font-bold">ج.م</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ink-s flex items-center gap-2">
            <Calendar size={14} className="text-gold" /> اقتراح تواريخ بديلة (اختياري):
          </label>
          <input 
            type="text"
            value={suggestedDates}
            onChange={(e) => setSuggestedDates(e.target.value)}
            placeholder="مثلاً: ١٥ - ٢٠ يوليو بدلاً من ١٠ - ١٥"
            className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-gold"
          />
        </div>

        {otherChalets.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink-s flex items-center gap-2">
              <Home size={14} className="text-gold" /> ترشيح شاليه آخر (اختياري):
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsChaletListOpen(!isChaletListOpen)}
                className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm flex items-center justify-between outline-none focus:border-gold"
              >
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-ink-s" />
                  <span className={selectedChalet ? 'text-ink' : 'text-ink-s'}>
                    {selectedChalet ? selectedChalet.name : 'اختر شالية آخر للترشيح...'}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-ink-s transition-transform ${isChaletListOpen ? 'rotate-180' : ''}`} />
              </button>

              {isChaletListOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-sand-d/20 rounded-rs shadow-shxl max-h-48 overflow-y-auto">
                  <div 
                    className="p-3 text-xs text-ink-s hover:bg-salt cursor-pointer font-bold border-b border-sand-d/10"
                    onClick={() => {
                      setSelectedChalet(null);
                      setIsChaletListOpen(false);
                    }}
                  >
                    بدون ترشيح
                  </div>
                  {otherChalets.map(chalet => (
                    <div 
                      key={chalet.id}
                      className="p-3 text-xs text-ink hover:bg-gold-l hover:text-gold cursor-pointer font-bold border-b border-sand-d/10 last:border-0"
                      onClick={() => {
                        setSelectedChalet({ id: chalet.id, name: chalet.name, image: chalet.images?.[0] });
                        setIsChaletListOpen(false);
                      }}
                    >
                      {chalet.name} — {formatCurrency(chalet.price)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-sea-p rounded-rs border border-sea-ll/20">
          <input 
            type="checkbox" 
            id="specialDeal"
            checked={isSpecialDeal}
            onChange={(e) => setIsSpecialDeal(e.target.checked)}
            className="accent-sea w-4 h-4"
          />
          <label htmlFor="specialDeal" className="text-xs font-bold text-sea flex items-center gap-2 cursor-pointer">
            <Tag size={14} /> تمييز كعرض خاص (لسد فجوة في الحجوزات)
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ink-s flex items-center gap-2">
            <MessageSquare size={14} className="text-gold" /> رسالة توضيحية للعميل:
          </label>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً: السعر ده متاح فقط في التواريخ المقترحة لسد فجوة بين حجزين..."
            className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-gold h-20 resize-none"
          />
        </div>

        <Button 
          variant="gold" 
          className="w-full py-4 text-lg" 
          onClick={handleSendCounter} 
          loading={isSending}
        >
          إرسال العرض المقابل 🚀
        </Button>
      </div>
    </Modal>
  );
};
