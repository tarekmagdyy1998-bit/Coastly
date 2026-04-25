import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Chalet, Request } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, handleFirestoreError, OperationType, serverTimestamp } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { MapPin, BedDouble } from 'lucide-react';
import { createNotification } from '../services/notificationService';
import { useTranslation } from 'react-i18next';

interface SelectChaletModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request;
}

export const SelectChaletModal = ({ isOpen, onClose, request }: SelectChaletModalProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChaletId, setSelectedChaletId] = useState<string | null>(null);
  const [offerPrice, setOfferPrice] = useState(request.budget);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, 'chalets'),
      where('officeId', '==', user.uid),
      where('status', '==', 'available')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChalets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Chalet[];
      setChalets(fetchedChalets);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chalets');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  const handleSendOffer = async () => {
    if (!user || !selectedChaletId) return;

    const selectedChalet = chalets.find(c => c.id === selectedChaletId);
    if (!selectedChalet) return;

    setIsSending(true);
    try {
      const negotiationData = {
        requestId: request.id,
        chaletId: selectedChalet.id,
        officeId: user.uid,
        userId: request.userId,
        status: 'pending',
        currentOffer: offerPrice,
        createdAt: serverTimestamp(),
        // UI compatibility fields
        chaletName: selectedChalet.name,
        chaletImage: selectedChalet.images?.[0] || '',
        officeName: user.displayName || 'Office',
        listedPrice: selectedChalet.price,
        myOffer: offerPrice,
        requestBudget: request.budget,
        dates: `${request.checkIn} - ${request.checkOut}`,
        checkIn: request.checkIn,
        checkOut: request.checkOut,
        nights: Math.ceil(Math.abs(new Date(request.checkOut).getTime() - new Date(request.checkIn).getTime()) / (1000 * 60 * 60 * 24))
      };

      await addDoc(collection(db, 'negotiations'), negotiationData);

      // Trigger Notification
      await createNotification(
        request.userId,
        i18n.language === 'ar' ? 'عرض جديد لطلبك' : 'New Offer for your request',
        i18n.language === 'ar' 
          ? `قدم ${user.displayName || 'مكتب'} عرضاً لشاليه ${selectedChalet.name} بسعر ${offerPrice} ج.م`
          : `${user.displayName || 'Office'} made an offer for ${selectedChalet.name} at ${offerPrice} EGP`,
        'offer',
        '/negotiations'
      );

      toast.success(i18n.language === 'ar' ? 'تم إرسال عرضك للعميل بنجاح!' : 'Offer sent successfully!');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'negotiations');
      toast.error('فشل في إرسال العرض');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقديم عرض للعميل" headerColor="bg-sea">
      <div className="space-y-6">
        <div className="bg-salt p-4 rounded-rs border border-sand-d/20">
          <h4 className="text-xs font-bold text-ink-s mb-2">طلب العميل:</h4>
          <div className="flex justify-between items-center">
            <div className="text-sm font-bold">{request.location}</div>
            <div className="text-coral font-black">{formatCurrency(request.budget)}</div>
          </div>
          <div className="text-[10px] text-ink-s mt-1">{request.checkIn} - {request.checkOut}</div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-ink-s">اختر الوحدة المناسبة من مكتبك:</label>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className="text-center py-4 text-xs text-ink-s">جاري التحميل...</div>
            ) : chalets.length > 0 ? (
              chalets.map(chalet => (
                <div 
                  key={chalet.id}
                  onClick={() => {
                    setSelectedChaletId(chalet.id);
                    setOfferPrice(chalet.price);
                  }}
                  className={`p-3 rounded-rs border-2 cursor-pointer transition-all ${
                    selectedChaletId === chalet.id ? 'border-sea bg-sea-p' : 'border-sand-d/20 bg-white hover:border-sea/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold">{chalet.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-ink-s mt-1">
                        <MapPin size={10} /> {chalet.location}
                        <BedDouble size={10} /> {chalet.rooms} غرف
                      </div>
                    </div>
                    <div className="text-sm font-black text-sea">{formatCurrency(chalet.price)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-ink-s">لا توجد وحدات متاحة حالياً</div>
            )}
          </div>
        </div>

        {selectedChaletId && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink-s">سعرك المقترح للعميل (لليلة):</label>
            <div className="relative">
              <input 
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(Number(e.target.value))}
                className="w-full bg-sea-p border-2 border-sea/20 rounded-rs p-4 text-3xl font-black text-sea outline-none"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sea font-bold">ج.م</div>
            </div>
          </div>
        )}

        <Button 
          variant="sea" 
          className="w-full py-4 text-lg" 
          onClick={handleSendOffer} 
          disabled={!selectedChaletId}
          loading={isSending}
        >
          إرسال العرض للعميل 🚀
        </Button>
      </div>
    </Modal>
  );
};
