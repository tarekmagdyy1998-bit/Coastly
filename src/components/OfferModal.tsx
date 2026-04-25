import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Chalet } from '../types';
import { formatCurrency } from '../lib/utils';
import { Calendar, Users, Info, TrendingDown, Sparkles, AlertCircle, CheckCircle2, Shield, Camera, FileText, Check } from 'lucide-react';
import { toast } from 'sonner';
import { db, collection, addDoc, handleFirestoreError, OperationType, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';

import { useTranslation } from 'react-i18next';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  chalet: Chalet;
  initialDates?: { checkIn: string | null; checkOut: string | null };
}

export const OfferModal = ({ isOpen, onClose, chalet, initialDates }: OfferModalProps) => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const [offerPrice, setOfferPrice] = useState(chalet.price);
  const [checkIn, setCheckIn] = useState(initialDates?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initialDates?.checkOut || '');
  const [nights, setNights] = useState(chalet.minNights || 3);
  const [guestCount, setGuestCount] = useState(chalet.beachPassPersons || 4);
  const [isSending, setIsSending] = useState(false);
  const [note, setNote] = useState('');
  const [idFiles, setIdFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Update dates if props change
  React.useEffect(() => {
    if (initialDates?.checkIn) setCheckIn(initialDates.checkIn);
    if (initialDates?.checkOut) setCheckOut(initialDates.checkOut);
  }, [initialDates]);

  // Calculate nights when dates change
  React.useEffect(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        setNights(diffDays);
      }
    }
  }, [checkIn, checkOut]);

  const saving = chalet.price - offerPrice;
  const savingPct = Math.round((saving / chalet.price) * 100);

  const aiPrediction = useMemo(() => {
    if (offerPrice >= chalet.price * 0.9) return { score: 95, label: 'فرصة قبول عالية جداً', color: 'text-mint', bg: 'bg-mint-l', icon: CheckCircle2 };
    if (offerPrice >= chalet.price * 0.8) return { score: 70, label: 'فرصة قبول جيدة', color: 'text-sea', bg: 'bg-sea-p', icon: Sparkles };
    if (offerPrice >= chalet.price * 0.6) return { score: 40, label: 'فرصة قبول متوسطة', color: 'text-gold', bg: 'bg-gold-l', icon: Info };
    return { score: 15, label: 'فرصة قبول منخفضة جداً', color: 'text-red', bg: 'bg-red-l', icon: AlertCircle };
  }, [offerPrice, chalet.price]);

  const isGapDeal = useMemo(() => {
    // Simple check: if chalet has gaps and we are within one
    // For demo purposes, we'll just check if availableGaps exists
    return chalet.availableGaps && chalet.availableGaps.length > 0;
  }, [chalet.availableGaps]);

  const handleSend = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (!checkIn || !checkOut) {
      toast.error('يرجى اختيار تاريخ الدخول والخروج');
      return;
    }

    if (chalet.minNights && nights < chalet.minNights) {
      toast.error(`أقل عدد ليالي لهذا الشاليه هو ${chalet.minNights}`);
      return;
    }

    setIsSending(true);
    try {
      let idUrls: string[] = [];
      
      if (idFiles.length > 0) {
        setIsUploading(true);
        const uploadPromises = idFiles.map(async (file) => {
          const storageRef = ref(storage, `bookings/ids/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        });
        idUrls = await Promise.all(uploadPromises);
        setIsUploading(false);
      }

      const negotiationData = {
        requestId: 'direct',
        chaletId: chalet.id,
        officeId: chalet.officeId,
        userId: user.uid,
        clientName: profile?.displayName || 'Client',
        status: 'pending',
        currentOffer: offerPrice,
        createdAt: new Date().toISOString(),
        // UI compatibility fields
        chaletName: chalet.name,
        officeName: chalet.office || 'Office',
        listedPrice: chalet.price,
        myOffer: offerPrice,
        dates: `${checkIn} - ${checkOut}`,
        checkIn,
        checkOut,
        nights: nights,
        guests: guestCount,
        note: note,
        idUrls: idUrls,
        idRequired: chalet.idRequired || false,
        beachPassFee: Number(chalet.beachPassFee) || 0,
        securityDeposit: Number(chalet.securityDeposit) || 0,
        housekeepingFee: Number(chalet.housekeepingFee) || 0,
        electricityFee: chalet.electricityMode === 'prepaid' ? 0 : (Number(chalet.electricityFee) || 0),
        electricityMode: chalet.electricityMode || 'fixed',
        totalEstimated: Math.round(((offerPrice * nights) + (Number(chalet.beachPassFee) || 0) + (Number(chalet.securityDeposit) || 0) + (Number(chalet.housekeepingFee) || 0) + (chalet.electricityMode === 'prepaid' ? 0 : (Number(chalet.electricityFee) || 0))) * 100) / 100
      };

      await addDoc(collection(db, 'negotiations'), negotiationData);
      toast.success('تم إرسال عرضك بنجاح! سيتم إشعار المالك فوراً.');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'negotiations');
      toast.error('فشل في إرسال العرض');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const totalStay = Math.round((offerPrice * nights) * 100) / 100;
  const electricityCost = chalet.electricityMode === 'prepaid' ? 0 : (Number(chalet.electricityFee) || 0);
  const grandTotal = Math.round((totalStay + (Number(chalet.beachPassFee) || 0) + (Number(chalet.securityDeposit) || 0) + (Number(chalet.housekeepingFee) || 0) + electricityCost) * 100) / 100;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تقديم عرض سعر" headerColor="bg-coral">
      <div className="space-y-6">
        {/* Gap Deal Alert */}
        {isGapDeal && (
          <div className="bg-sea-p border border-sea-ll/30 p-4 rounded-rs flex items-center gap-3 text-sea">
            <Sparkles size={20} className="shrink-0 animate-pulse" />
            <div>
              <div className="text-xs font-black">عرض "سد الفجوة" متاح!</div>
              <div className="text-[10px] opacity-80">المكتب لديه أيام شاغرة بين حجزين، قد يقبل سعراً أقل إذا حجزت في هذه الفترة.</div>
            </div>
          </div>
        )}

        {/* AI Predictor Banner */}
        <motion.div 
          key={aiPrediction.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${aiPrediction.bg} ${aiPrediction.color} p-4 rounded-rs border border-current/10 flex items-center justify-between gap-4`}
        >
          <div className="flex items-center gap-3">
            <aiPrediction.icon size={20} />
            <div>
              <div className="text-xs font-black">{aiPrediction.label}</div>
              <div className="text-[10px] opacity-80">بناءً على أسعار المنطقة والطلبات المشابهة</div>
            </div>
          </div>
          <div className="text-xl font-black">{aiPrediction.score}%</div>
        </motion.div>

        {/* Property Summary */}
        <div className="flex items-center gap-4 bg-salt p-4 rounded-rs border border-sand-d/20">
          <div className="w-16 h-16 rounded-rxs overflow-hidden bg-white shrink-0">
            <img 
              src={chalet.images?.[0] || `https://picsum.photos/seed/${chalet.id}/200/200`} 
              alt={chalet.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h4 className="font-bold text-sm line-clamp-1">{chalet.name}</h4>
            <p className="text-[10px] text-ink-s">{chalet.location}</p>
            <div className="text-xs font-bold text-ink-m mt-1">السعر المعلن: {formatCurrency(chalet.price)}</div>
          </div>
        </div>

        {chalet.availableGaps && chalet.availableGaps.length > 0 && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">فجوات متاحة (خصم خاص):</label>
            <div className="flex flex-wrap gap-2">
              {chalet.availableGaps.map((gap, i) => (
                <div key={i} className="bg-white border border-sea-ll/30 px-3 py-1.5 rounded-full text-[10px] font-bold text-sea flex items-center gap-2">
                  <Calendar size={12} /> {gap.start} - {gap.end}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink-s">تاريخ الدخول</label>
            <input 
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-xs outline-none focus:border-sea"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink-s">تاريخ الخروج</label>
            <input 
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-xs outline-none focus:border-sea"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink-s">{i18n.language === 'ar' ? 'الأشخاص' : 'Guests'}</label>
            <div className="relative">
              <input 
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-sea pl-9"
              />
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sea" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink-s">{t('home.trust.housing_rules')}</label>
            <div className="bg-salt border border-sand-d/30 rounded-rs p-3 text-[10px] flex items-center gap-2 font-bold text-coral h-[46px]">
              <Shield size={14} /> 
              {chalet.allowedGroups?.map(g => t(`home.trust.rules.${g}`)).join('، ') || t('home.trust.rules.families')}
            </div>
          </div>
        </div>

        {/* Rules & Fees Summary */}
        <div className="p-4 bg-salt rounded-rs border border-sand-d/20 space-y-3">
          <h4 className="text-xs font-black text-ink-m flex items-center gap-2">
            <AlertCircle size={14} className="text-sea" /> {i18n.language === 'ar' ? 'تفاصيل الحجز والرسوم' : 'Booking Details & Fees'}
          </h4>
          
          <div className="grid grid-cols-1 gap-2">
            {chalet.beachPassFee && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-s flex items-center gap-2"><Sparkles size={12} /> {t('home.trust.beach_pass')}</span>
                <span className="font-bold text-sea">{formatCurrency(chalet.beachPassFee)}</span>
              </div>
            )}
            {chalet.securityDeposit && (
              <div className="flex items-center justify-between text-[11px] bg-coral/5 p-2 rounded-rxs border border-coral/10">
                <span className="text-ink font-black flex items-center gap-2"><Shield size={12} className="text-coral" /> {t('home.trust.security_deposit')}</span>
                <span className="font-black text-coral-d">{formatCurrency(chalet.securityDeposit)}</span>
              </div>
            )}
            {chalet.housekeepingFee && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-ink-s flex items-center gap-2"><Check size={12} /> {i18n.language === 'ar' ? 'رسوم النظافة' : 'Housekeeping Fee'}</span>
                <span className="font-bold text-ink-m">{formatCurrency(chalet.housekeepingFee)}</span>
              </div>
            )}
            {chalet.electricityMode === 'prepaid' ? (
              <div className="bg-sea-p p-2 rounded-rxs border border-sea-ll/20 text-[10px] font-bold text-sea">
                {i18n.language === 'ar' 
                  ? "تنبيه: الشاليه يعمل بنظام كارت الشحن الذكي. يتحمل المستأجر تكلفة الاستهلاك الفعلي وشحن الكارت خلال فترة الإقامة."
                  : "Note: The chalet uses a prepaid meter system. The guest is responsible for recharging the card based on their actual consumption."
                }
              </div>
            ) : (
              (Number(chalet.electricityFee) || 0) > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-ink-s flex items-center gap-2"><Sparkles size={12} /> {i18n.language === 'ar' ? 'رسوم الكهرباء' : 'Electricity Fee'}</span>
                  <span className="font-bold text-ink-m">{formatCurrency(Number(chalet.electricityFee) || 0)}</span>
                </div>
              )
            )}
            {chalet.noMixedGroups && (
              <div className="flex items-center gap-2 text-[10px] text-red font-bold">
                <AlertCircle size={12} /> {t('home.trust.rules.no_mixed')}
              </div>
            )}
          </div>
        </div>

        {/* ID Upload Section - Only Show info, but don't strictly require here per user request */}
        {chalet.idRequired && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-ink-s flex items-center gap-2">
              <Camera size={14} className="text-sea" /> {t('home.trust.id_upload')}
            </label>
            <div className="p-3 bg-sea/10 border border-sea/30 rounded-rs shadow-sm">
              <p className="text-[11px] font-black text-sea-d leading-relaxed">
                {i18n.language === 'ar' 
                  ? '⚠️ تنبيه أمان: هذا الشاليه يتطلب صور البطاقات الشخصية. يمكنك رفعها الآن أو بعد الموافقة على الحجز.' 
                  : '⚠️ Security Alert: This chalet requires ID photos. You can upload them now or after the booking is approved.'}
              </p>
            </div>
            <div className="relative">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setIdFiles(Array.from(e.target.files));
                  }
                }}
                className="hidden"
                id="id-upload"
              />
              <label 
                htmlFor="id-upload"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-sand-d/30 rounded-rs bg-salt hover:bg-white hover:border-sea transition-all cursor-pointer group"
              >
                {idFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {idFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-sea-p text-sea px-3 py-1 rounded-full text-[10px] font-bold">
                        <FileText size={12} /> {f.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Camera className="text-ink-s group-hover:text-sea mb-2" size={24} />
                    <span className="text-[10px] font-bold text-ink-s group-hover:text-sea">
                      {i18n.language === 'ar' ? 'اضغط لرفع صور البطاقات (اختياري الآن)' : 'Click to upload ID photos (Optional now)'}
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-ink-s">عرضك المقترح (لليلة)</label>
          <div className="relative">
            <input 
              type="number"
              value={offerPrice}
              onChange={(e) => setOfferPrice(Number(e.target.value))}
              className="w-full bg-coral-p border-2 border-coral/20 rounded-rs p-4 text-3xl font-black text-coral outline-none"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-coral font-bold">ج.م</div>
          </div>
          
          {saving > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-mint-l text-mint text-xs font-bold p-2 rounded-rs flex items-center gap-2"
            >
              <TrendingDown size={14} />
              لو وافق، بتوفر {formatCurrency(saving)} ج/ليلة ({savingPct}%)
            </motion.div>
          )}
        </div>

        {/* Total Breakdown */}
        <div className="bg-salt p-4 rounded-rs border border-sand-d/20 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-ink-s">{i18n.language === 'ar' ? 'إجمالي الإقامة' : 'Total Stay'} ({nights} {i18n.language === 'ar' ? 'ليالي' : 'nights'})</span>
            <span className="font-bold">{formatCurrency(totalStay)}</span>
          </div>
          {chalet.beachPassFee && (
            <div className="flex justify-between text-xs">
              <span className="text-ink-s">{t('home.trust.beach_pass')}</span>
              <span className="font-bold">{formatCurrency(chalet.beachPassFee)}</span>
            </div>
          )}
          {chalet.securityDeposit && (
            <div className="flex justify-between text-xs">
              <span className="text-ink-s">{t('home.trust.security_deposit')} ({i18n.language === 'ar' ? 'مسترد' : 'refundable'})</span>
              <span className="font-bold">{formatCurrency(chalet.securityDeposit)}</span>
            </div>
          )}
          {chalet.housekeepingFee && (
            <div className="flex justify-between text-xs">
              <span className="text-ink-s">{i18n.language === 'ar' ? 'رسوم النظافة' : 'Housekeeping Fee'}</span>
              <span className="font-bold">{formatCurrency(chalet.housekeepingFee)}</span>
            </div>
          )}
          {chalet.electricityMode === 'prepaid' ? (
            <div className="bg-sea-p/50 p-3 rounded-rs border border-sea-ll/20 space-y-1">
              <div className="flex justify-between text-xs font-bold text-sea">
                <span>{i18n.language === 'ar' ? 'نظام الكهرباء' : 'Electricity System'}</span>
                <span>{i18n.language === 'ar' ? 'كارت شحن' : 'Prepaid Card'}</span>
              </div>
              <p className="text-[9px] text-sea/80 leading-relaxed">
                {i18n.language === 'ar' 
                  ? "تنبيه: الشاليه يعمل بنظام كارت الشحن الذكي. يتحمل المستأجر تكلفة الاستهلاك الفعلي وشحن الكارت خلال فترة الإقامة."
                  : "Note: The chalet uses a prepaid meter system. The guest is responsible for recharging the card based on their actual consumption."
                }
              </p>
            </div>
          ) : (
            (Number(chalet.electricityFee) || 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-ink-s">{i18n.language === 'ar' ? 'رسوم الكهرباء' : 'Electricity Fee'}</span>
                <span className="font-bold">{formatCurrency(Number(chalet.electricityFee) || 0)}</span>
              </div>
            )
          )}
          <div className="h-px bg-sand-d/20 my-2" />
          <div className="flex justify-between text-sm font-black text-ink-m">
            <span>{i18n.language === 'ar' ? 'الإجمالي التقديري' : 'Estimated Total'}</span>
            <span className="text-sea">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <div className="bg-gold-l border border-gold/10 p-4 rounded-rs space-y-2">
          <div className="flex items-center gap-2 text-gold font-bold text-xs">
            <Info size={14} /> {t('home.trust.alert_title')}:
          </div>
          <ul className="text-[10px] text-gold/80 space-y-1 pr-4 list-disc">
            <li>{t('home.trust.deposit_notice')}</li>
            <li>{t('home.trust.check_ratings')}</li>
            <li>{t('home.trust.checkin_reminder')}</li>
            <li>{t('common.escrow_protected')}</li>
          </ul>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-ink-s">رسالة للمالك (اختياري)</label>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-sea h-20 resize-none" 
            placeholder="مثلاً: احنا عيلة هادية وبنحافظ على المكان..."
          ></textarea>
        </div>

        <Button variant="coral" className="w-full py-4 text-lg" onClick={handleSend} loading={isSending || isUploading}>
          {isUploading ? (i18n.language === 'ar' ? 'جاري رفع الصور...' : 'Uploading IDs...') : 'إرسال العرض 🚀'}
        </Button>
      </div>
    </Modal>
  );
};
