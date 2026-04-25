import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { MessageSquare, CheckCircle2, Clock, ArrowLeftRight, Sparkles, XCircle, Calendar, Phone, CreditCard, Receipt, ShieldCheck, Download, MapPin, Info, Star, Camera, AlertCircle, Home, User } from 'lucide-react';
import { formatCurrency, getDateRange } from '../lib/utils';
import { motion } from 'motion/react';
import { ChatModal } from '../components/ChatModal';
import { AgreementModal } from '../components/AgreementModal';
import { CounterOfferModal } from '../components/CounterOfferModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { VoucherModal } from '../components/VoucherModal';
import { ReviewModal } from '../components/ReviewModal';
import { CancellationModal } from '../components/CancellationModal';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, or, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Negotiation, UserProfile } from '../types';
import { createNotification } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const NegotiationsPage = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAgreementOpen, setIsAgreementOpen] = useState(false);
  const [isCounterOpen, setIsCounterOpen] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isCancellationOpen, setIsCancellationOpen] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState<{ isOpen: boolean, negId: string, price: number }>({ isOpen: false, negId: '', price: 0 });
  const [confirmReject, setConfirmReject] = useState<{ isOpen: boolean, negId: string }>({ isOpen: false, negId: '' });
  const [confirmPayment, setConfirmPayment] = useState<{ isOpen: boolean, neg: Negotiation | null, type: 'sent' | 'received' }>({ isOpen: false, neg: null, type: 'sent' });
  const [depositInput, setDepositInput] = useState<string>('');
  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadingId, setIsUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNegotiations([]);
      setLoading(false);
      return;
    }

    // Show negotiations where user is either the client or the office
    const q = profile?.role === 'admin'
      ? query(collection(db, 'negotiations'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'negotiations'),
          or(
            where('userId', '==', user.uid),
            where('officeId', '==', user.uid)
          ),
          orderBy('createdAt', 'desc')
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const negs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Negotiation[];
      setNegotiations(negs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'negotiations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusUpdate = async (negId: string, newStatus: string, extraData: any = {}) => {
    try {
      const negRef = doc(db, 'negotiations', negId);
      
      // If status is agreed, we should share the current user's phone number
      const updateData: any = {
        status: newStatus,
        ...extraData
      };

      if (newStatus === 'agreed' && profile?.phoneNumber) {
        if (profile.role === 'office' || profile.role === 'admin') {
          updateData.officePhone = profile.phoneNumber;
        } else {
          updateData.clientPhone = profile.phoneNumber;
        }

        // BLOCK DATES ON CHALET CALENDAR (Soft Block on Agreement)
        const negSnap = await getDoc(negRef);
        const neg = negSnap.data() as Negotiation;
        
        let checkIn = neg.checkIn;
        let checkOut = neg.checkOut;

        // Prefer suggested dates if they exist, as they represent the accepted change
        if (neg.suggestedDates) {
          const dateMatch = neg.suggestedDates.match(/(\d{4}-\d{2}-\d{2})/g);
          if (dateMatch && dateMatch.length >= 2) {
            checkIn = dateMatch[0];
            checkOut = dateMatch[1];
            updateData.checkIn = checkIn;
            updateData.checkOut = checkOut;
            updateData.dates = neg.suggestedDates;
            updateData.suggestedDates = null;
          }
        } else if ((!checkIn || !checkOut) && neg.dates) {
          // Fallback: Parse from dates string if missing
          const dateMatch = neg.dates.match(/(\d{4}-\d{2}-\d{2})/g);
          if (dateMatch && dateMatch.length >= 2) {
            checkIn = dateMatch[0];
            checkOut = dateMatch[1];
            updateData.checkIn = checkIn;
            updateData.checkOut = checkOut;
          }
        }

        if (neg && checkIn && checkOut && neg.chaletId) {
          const datesToBlock = getDateRange(checkIn, checkOut);
          if (datesToBlock.length > 0) {
            const chaletRef = doc(db, 'chalets', neg.chaletId);
            const chaletSnap = await getDoc(chaletRef);
            if (chaletSnap.exists()) {
              const chaletData = chaletSnap.data();
              const currentBlocked = chaletData.blockedDates || [];
              const newBlocked = [...new Set([...currentBlocked, ...datesToBlock])];
              await updateDoc(chaletRef, { blockedDates: newBlocked });
            }
          }
        }
      }

      await updateDoc(negRef, updateData);
      
      // Trigger Notification
      const negSnap = await getDoc(negRef);
      const neg = negSnap.data() as Negotiation;
      const targetUserId = profile?.role === 'office' ? neg.userId : neg.officeId;
      const isArabic = i18n.language === 'ar';
      
      let title = '';
      let message = '';
      let type: any = 'system';

      if (newStatus === 'agreed') {
        title = isArabic ? 'تم تأكيد الاتفاق!' : 'Agreement Confirmed!';
        message = isArabic ? `وافق الطرف الآخر على العرض لشاليه ${neg.chaletName}` : `The other party accepted the offer for ${neg.chaletName}`;
        type = 'agreement';
      } else if (newStatus === 'rejected') {
        title = isArabic ? 'تم رفض العرض' : 'Offer Rejected';
        message = isArabic ? `تم رفض العرض لشاليه ${neg.chaletName}` : `The offer for ${neg.chaletName} has been rejected.`;
        type = 'system';
      } else if (newStatus === 'counter') {
        title = isArabic ? 'عرض مقابل جديد' : 'New Counter Offer';
        message = isArabic ? `لديك عرض مقابل جديد لشاليه ${neg.chaletName}` : `You have a new counter offer for ${neg.chaletName}`;
        type = 'offer';
      }

      if (title) {
        await createNotification(targetUserId, title, message, type, '/negotiations');
      }

      toast.success(i18n.language === 'ar' ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${negId}`);
      toast.error(i18n.language === 'ar' ? 'فشل في تحديث الحالة' : 'Failed to update status');
    }
  };

  const handleShareMyContact = async (neg: Negotiation) => {
    if (!profile?.phoneNumber) {
      toast.error(i18n.language === 'ar' ? 'يرجى إضافة رقم هاتفك أولاً' : 'Please add your phone number first');
      return;
    }
    
    try {
      const negRef = doc(db, 'negotiations', neg.id);
      const updateData: any = {};
      
      if (profile?.role === 'office' || profile?.role === 'admin') {
        updateData.officePhone = profile.phoneNumber;
      } else {
        updateData.clientPhone = profile.phoneNumber;
      }
      
      await updateDoc(negRef, updateData);
      
      // Notify
      const targetUserId = profile?.role === 'office' ? neg.userId : neg.officeId;
      await createNotification(
        targetUserId,
        i18n.language === 'ar' ? 'تمت مشاركة رقم الهاتف' : 'Phone Number Shared',
        i18n.language === 'ar' 
          ? `قام ${profile?.displayName} بمشاركة رقم هاتفه معك.` 
          : `${profile?.displayName} shared their phone number with you.`,
        'message',
        '/negotiations'
      );

      toast.success(i18n.language === 'ar' ? 'تمت مشاركة رقم التواصل' : 'Contact number shared');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${neg.id}`);
    }
  };

  const handleConfirmPayment = async (neg: Negotiation, type: 'sent' | 'received', specifiedDeposit?: number) => {
    try {
      const negRef = doc(db, 'negotiations', neg.id);
      const updateData: any = {};
      
      if (type === 'sent') {
        updateData.paymentSentByClient = true;
      } else {
        updateData.paymentReceivedByOffice = true;
        // If office confirms, we can also set the confirmedAt timestamp
        if (neg.paymentSentByClient || true) { // Allow office to confirm even if client hasn't clicked yet
          updateData.confirmedAt = new Date().toISOString();
          
          const stayTotal = Math.round(((neg.agreedPrice || neg.currentOffer) * (neg.nights || 1)) * 100) / 100;
          const electricityCost = neg.electricityMode === 'prepaid' ? 0 : (neg.electricityFee || 0);
          const feesTotal = Math.round(((neg.beachPassFee || 0) + (neg.securityDeposit || 0) + (neg.housekeepingFee || 0) + electricityCost) * 100) / 100;
          const total = Math.round((stayTotal + feesTotal) * 100) / 100;
          
          updateData.totalAmount = total;
          
          const deposit = Math.round((specifiedDeposit || neg.depositAmount || (total * 0.25)) * 100) / 100;
          updateData.depositAmount = deposit;
          updateData.remainingBalance = Math.round((total - deposit) * 100) / 100;

          // BLOCK DATES ON CHALET CALENDAR
          let checkIn = neg.checkIn;
          let checkOut = neg.checkOut;

          // Prefer suggested dates if they exist
          if (neg.suggestedDates) {
            const dateMatch = neg.suggestedDates.match(/(\d{4}-\d{2}-\d{2})/g);
            if (dateMatch && dateMatch.length >= 2) {
              checkIn = dateMatch[0];
              checkOut = dateMatch[1];
              updateData.checkIn = checkIn;
              updateData.checkOut = checkOut;
              updateData.dates = neg.suggestedDates;
              updateData.suggestedDates = null;
            }
          } else if ((!checkIn || !checkOut) && neg.dates) {
            // Fallback: Parse from dates string if missing
            const dateMatch = neg.dates.match(/(\d{4}-\d{2}-\d{2})/g);
            if (dateMatch && dateMatch.length >= 2) {
              checkIn = dateMatch[0];
              checkOut = dateMatch[1];
              updateData.checkIn = checkIn;
              updateData.checkOut = checkOut;
            }
          }

          if (checkIn && checkOut && neg.chaletId) {
            const datesToBlock = getDateRange(checkIn, checkOut);
            if (datesToBlock.length > 0) {
              const chaletRef = doc(db, 'chalets', neg.chaletId);
              const chaletSnap = await getDoc(chaletRef);
              if (chaletSnap.exists()) {
                const chaletData = chaletSnap.data();
                const currentBlocked = chaletData.blockedDates || [];
                // Filter out dates that are already blocked to avoid duplicates
                const newBlocked = [...new Set([...currentBlocked, ...datesToBlock])];
                await updateDoc(chaletRef, { blockedDates: newBlocked });
              }
            }
          }
        }
      }
      
      await updateDoc(negRef, updateData);

      // Notify
      const targetUserId = type === 'sent' ? neg.officeId : neg.userId;
      const title = type === 'sent' 
        ? (i18n.language === 'ar' ? 'تم إرسال العربون' : 'Deposit Sent')
        : (i18n.language === 'ar' ? 'تم تأكيد استلام العربون' : 'Deposit Confirmed');
      const message = type === 'sent'
        ? (i18n.language === 'ar' ? `أكد العميل إرسال العربون لشاليه ${neg.chaletName}` : `The client confirmed sending the deposit for ${neg.chaletName}`)
        : (i18n.language === 'ar' ? `أكد المكتب استلام العربون لشاليه ${neg.chaletName}. حجزك مؤكد الآن!` : `The office confirmed receipt of the deposit for ${neg.chaletName}. Your booking is confirmed!`);
      
      await createNotification(targetUserId, title, message, 'payment', '/negotiations');

      toast.success(i18n.language === 'ar' ? 'تم تأكيد الدفع بنجاح' : 'Payment confirmed successfully');
      setConfirmPayment({ isOpen: false, neg: null, type: 'sent' });
      setDepositInput('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${neg.id}`);
    }
  };

  const handleRequestCancellation = async (reason: string) => {
    if (!selectedNeg) return;
    try {
      const negRef = doc(db, 'negotiations', selectedNeg.id);
      await updateDoc(negRef, {
        cancellationStatus: 'requested',
        cancellationRequestedBy: (profile?.role === 'office' || profile?.role === 'admin') ? 'office' : 'client',
        cancellationReason: reason,
        cancellationRequestedAt: new Date().toISOString()
      });
      toast.success(i18n.language === 'ar' ? 'تم إرسال طلب الإلغاء' : 'Cancellation request sent');
      setIsCancellationOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${selectedNeg.id}`);
    }
  };

  const handleAgreeToCancellation = async (negId: string) => {
    try {
      const negRef = doc(db, 'negotiations', negId);
      await updateDoc(negRef, {
        cancellationStatus: 'agreed',
        cancellationAgreedAt: new Date().toISOString()
      });
      toast.success(i18n.language === 'ar' ? 'تمت الموافقة على الإلغاء' : 'Cancellation agreed');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${negId}`);
    }
  };

  const handleConfirmRefund = async (negId: string, role: 'client' | 'office') => {
    try {
      const negRef = doc(db, 'negotiations', negId);
      const negSnap = await getDoc(negRef);
      const negData = negSnap.data() as Negotiation;

      const updateData: any = {};
      if (role === 'client') {
        updateData.refundConfirmedByClient = true;
      } else if (role === 'office') {
        updateData.refundConfirmedByOffice = true;
      }

      // Check if both confirmed
      const bothConfirmed = (role === 'client' ? true : negData.refundConfirmedByClient) && 
                            (role === 'office' ? true : negData.refundConfirmedByOffice);

      if (bothConfirmed) {
        updateData.status = 'cancelled';
        updateData.cancellationStatus = 'cancelled';
        updateData.cancellationFinalizedAt = new Date().toISOString();

        // UNBLOCK DATES ON CHALET CALENDAR
        if (negData.checkIn && negData.checkOut && negData.chaletId) {
          const datesToUnblock = getDateRange(negData.checkIn, negData.checkOut);
          if (datesToUnblock.length > 0) {
            const chaletRef = doc(db, 'chalets', negData.chaletId);
            const chaletSnap = await getDoc(chaletRef);
            if (chaletSnap.exists()) {
              const chaletData = chaletSnap.data();
              const currentBlocked = chaletData.blockedDates || [];
              const newBlocked = currentBlocked.filter((d: string) => !datesToUnblock.includes(d));
              await updateDoc(chaletRef, { blockedDates: newBlocked });
            }
          }
        }
      }

      await updateDoc(negRef, updateData);
      toast.success(i18n.language === 'ar' ? 'تم تأكيد استرداد الحقوق' : 'Rights refund confirmed');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${negId}`);
    }
  };

  const handleIdUpload = async (neg: Negotiation, files: FileList) => {
    if (!user) return;
    setIsUploadingId(neg.id);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const storageRef = ref(storage, `bookings/ids/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      });
      const urls = await Promise.all(uploadPromises);
      
      const negRef = doc(db, 'negotiations', neg.id);
      await updateDoc(negRef, {
        idUrls: [...(neg.idUrls || []), ...urls]
      });
      toast.success(i18n.language === 'ar' ? 'تم رفع صور البطاقات بنجاح' : 'ID photos uploaded successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `negotiations/${neg.id}`);
      toast.error(i18n.language === 'ar' ? 'فشل رفع الصور' : 'Failed to upload IDs');
    } finally {
      setIsUploadingId(null);
    }
  };

  const openVoucher = (neg: Negotiation) => {
    setSelectedNeg(neg);
    setIsVoucherOpen(true);
  };

  const openReview = (neg: Negotiation) => {
    setSelectedNeg(neg);
    setIsReviewOpen(true);
  };

  const openChat = (neg: Negotiation) => {
    setSelectedNeg(neg);
    setIsChatOpen(true);
  };

  const openAgreement = (neg: Negotiation) => {
    setSelectedNeg(neg);
    setIsAgreementOpen(true);
  };

  const openCounter = (neg: Negotiation) => {
    setSelectedNeg(neg);
    setIsCounterOpen(true);
  };

  const getBookingReminder = (neg: Negotiation) => {
    if (neg.status !== 'agreed' || !neg.paymentReceivedByOffice || !neg.checkIn) return null;
    
    const checkInDate = new Date(neg.checkIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkInDate.setHours(0, 0, 0, 0);
    
    const diffTime = checkInDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const isOffice = user?.uid === neg.officeId || profile?.role === 'admin';

    if (diffDays === 2) {
      if (isOffice) return i18n.language === 'ar' ? 'باقي يومين على وصول العميل' : '2 days remaining until client arrival';
      return i18n.language === 'ar' ? 'باقي يومين على حجزك' : '2 days remaining until your booking';
    }
    if (diffDays === 1) {
      if (isOffice) return i18n.language === 'ar' ? 'باقي يوم واحد على وصول العميل' : '1 day remaining until client arrival';
      return i18n.language === 'ar' ? 'باقي يوم واحد على حجزك' : '1 day remaining until your booking';
    }
    if (diffDays === 0) {
      if (isOffice) return i18n.language === 'ar' ? 'وصول العميل اليوم! يرجى التأكد من جاهزية الشاليه' : 'Client arrives today! Please ensure chalet is ready';
      return i18n.language === 'ar' ? 'موعد حجزك اليوم! نتمنى لك إقامة سعيدة' : 'Your booking is today! Have a great stay';
    }
    if (diffDays < 0 && !neg.reviewed) {
      if (isOffice) return i18n.language === 'ar' ? 'العميل في الشاليه حالياً' : 'Client is currently at the chalet';
      return i18n.language === 'ar' ? 'أنت الآن في الشاليه! يرجى تقييم المكان ورفع صور واقعية' : 'You are at the chalet! Please rate the place and upload real photos';
    }
    
    return null;
  };

  const isBookingActive = (neg: Negotiation) => {
    if (neg.status !== 'agreed' || !neg.paymentReceivedByOffice || !neg.checkIn) return false;
    const checkInDate = new Date(neg.checkIn);
    const today = new Date();
    return today >= checkInDate;
  };

  const stats = [
    { label: t('negotiations.active'), value: negotiations.filter(n => n.status !== 'agreed' && n.status !== 'rejected').length, color: 'text-sea' },
    { label: t('negotiations.needs_reply'), value: negotiations.filter(n => n.status === 'counter').length, color: 'text-coral' },
    { label: t('negotiations.agreed'), value: negotiations.filter(n => n.status === 'agreed').length, color: 'text-mint' },
    { label: i18n.language === 'ar' ? 'صفقات تمت' : 'Deals Done', value: negotiations.filter(n => n.status === 'agreed').length, color: 'text-gold' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-r shadow-sh border border-sand-d/20 text-center">
            <div className={`text-2xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-ink-s font-bold">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sea"></div>
          </div>
        ) : negotiations.length > 0 ? (
          negotiations.map(neg => {
            const reminder = getBookingReminder(neg);
            const active = isBookingActive(neg);
            
            return (
              <motion.div 
                key={neg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden"
              >
                {/* Status Stripe */}
                <div className={`h-1 w-full ${
                  neg.status === 'counter' ? 'bg-sea' : 
                  neg.status === 'pending' ? 'bg-gold' : 
                  neg.status === 'agreed' ? 'bg-mint' : 'bg-red'
                }`} />

                {/* Reminder Banner */}
                {reminder && (
                  <div className={`px-6 py-3 flex items-center gap-3 text-xs font-black ${active ? 'bg-sea text-white' : 'bg-gold-l text-gold'}`}>
                    {active ? <Sparkles size={16} className="animate-pulse" /> : <Clock size={16} />}
                    {reminder}
                  </div>
                )}

                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black">{neg.chaletName}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          neg.status === 'counter' ? 'bg-sea-p text-sea' : 
                          neg.status === 'pending' ? 'bg-gold-l text-gold' : 
                          neg.status === 'agreed' ? 'bg-mint-l text-mint' : 
                          neg.status === 'cancelled' ? 'bg-ink-l text-ink-s' : 'bg-red-l text-red'
                        }`}>
                          {t(`negotiations.status.${neg.status}`)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-ink-s mb-6">
                        <Link to={`/u/${user?.uid === neg.officeId ? neg.userId : neg.officeId}`} className="font-bold text-sea hover:underline flex items-center gap-1">
                          <User size={12} />
                          {user?.uid === neg.officeId ? (neg.clientName || (i18n.language === 'ar' ? 'عميل' : 'Client')) : neg.officeName}
                        </Link>
                        <span>•</span>
                        <span className={neg.suggestedDates ? 'line-through opacity-50' : ''}>{neg.dates}</span>
                        {neg.suggestedDates && (
                          <span className="bg-gold-l text-gold px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Calendar size={10} /> {neg.suggestedDates}
                          </span>
                        )}
                        {neg.isSpecialDeal && (
                          <span className="bg-sea-p text-sea px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                            <Sparkles size={10} /> {i18n.language === 'ar' ? 'عرض خاص (سد فجوة)' : 'Special Gap Deal'}
                          </span>
                        )}
                      </div>

                      {/* Primary Chalet Preview */}
                      <div className="mb-6 p-4 bg-sea-ll/5 rounded-rs border border-sea/10 flex items-center justify-between gap-4 group">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded overflow-hidden border-2 border-white shadow-sm shrink-0">
                            <img src={neg.chaletImage || `https://picsum.photos/seed/${neg.chaletId}/200/200`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-ink mb-1">{i18n.language === 'ar' ? 'الوحدة المعروضة' : 'Primary Unit'}</h4>
                            <p className="text-[10px] text-sea font-bold">{neg.chaletName}</p>
                            <div className="flex items-center gap-1 text-[9px] text-ink-s font-bold mt-1">
                              <MapPin size={10} /> {neg.dates}
                            </div>
                          </div>
                        </div>
                        <Link 
                          to={`/chalet/${neg.chaletId}`}
                          className="px-4 py-2 bg-sea text-white rounded-full text-[10px] font-black hover:bg-sea-d transition-all flex items-center gap-2 group-hover:scale-105"
                        >
                          <Home size={12} /> {i18n.language === 'ar' ? 'عرض تفاصيل الوحدة' : 'View Details'}
                        </Link>
                      </div>

                      {/* Suggested Chalet if exists */}
                      {neg.suggestedChaletId && (
                        <div className="mb-6 p-4 bg-gold-l/20 rounded-rs border border-gold/20 flex items-center justify-between gap-4 group">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded overflow-hidden border-2 border-white shadow-sm shrink-0">
                                <img src={neg.suggestedChaletImage || `https://picsum.photos/seed/${neg.suggestedChaletId}/200/200`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-ink mb-1">{i18n.language === 'ar' ? 'شاليه مرشح كبديل' : 'Suggested Alternative'}</h4>
                                <p className="text-[10px] text-sea font-bold">{neg.suggestedChaletName}</p>
                              </div>
                            </div>
                            <Link 
                              to={`/chalet/${neg.suggestedChaletId}`}
                              className="px-4 py-2 bg-gold text-white rounded-full text-[10px] font-black hover:bg-gold-d transition-all flex items-center gap-2 group-hover:scale-105"
                            >
                              <Home size={12} /> {i18n.language === 'ar' ? 'عرض تفاصيل الوحدة' : 'View Details'}
                            </Link>
                          </div>
                        )}

                      {neg.note && (
                        <div className="mb-6 p-3 bg-salt border-l-4 border-gold rounded-rxs text-xs italic text-ink-s">
                          "{neg.note}"
                        </div>
                      )}

                      {/* ID Viewing for Office */}
                      {user?.uid === neg.officeId && (neg as any).idUrls && (neg as any).idUrls.length > 0 && (
                        <div className="mb-6 p-4 bg-sea-p rounded-rs border border-sea-ll/20">
                          <h4 className="text-[10px] font-black text-sea mb-3 flex items-center gap-2 uppercase tracking-wider">
                            <Camera size={14} /> {i18n.language === 'ar' ? 'صور بطاقات العميل' : 'Client ID Photos'}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(neg as any).idUrls.map((url: string, idx: number) => (
                              <a 
                                key={idx} 
                                href={url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-12 h-12 rounded-rxs overflow-hidden border border-sea/20 hover:border-sea transition-all"
                              >
                                <img src={url} alt="ID" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ID Upload for Client if required and not uploaded yet */}
                      {user?.uid === neg.userId && (neg as any).idRequired && (!(neg as any).idUrls || (neg as any).idUrls.length === 0) && neg.status !== 'rejected' && neg.status !== 'cancelled' && (
                        <div className="mb-6 p-4 bg-gold-l/30 rounded-rs border border-gold/20 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Camera size={20} className="text-gold" />
                            <div>
                              <h4 className="text-xs font-black text-gold">{i18n.language === 'ar' ? 'مطلوب صور البطاقات' : 'ID Photos Required'}</h4>
                              <p className="text-[10px] text-ink-s font-bold">{i18n.language === 'ar' ? 'يطلب هذا المكتب صور البطاقات الشخصية لإتمام الحجز.' : 'This office requires ID photos to finalize the booking.'}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*"
                              onChange={(e) => e.target.files && handleIdUpload(neg, e.target.files)}
                              className="hidden"
                              id={`id-upload-${neg.id}`}
                              disabled={isUploadingId === neg.id}
                            />
                            <label 
                              htmlFor={`id-upload-${neg.id}`}
                              className={`px-4 py-2 bg-gold text-white rounded-full text-[10px] font-black cursor-pointer hover:bg-gold-d transition-colors flex items-center gap-2 ${isUploadingId === neg.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isUploadingId === neg.id ? (
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                              ) : <Camera size={12} />}
                              {i18n.language === 'ar' ? 'ارفع الصور الآن' : 'Upload Photos Now'}
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Price Flow */}
                      <div className="flex items-center gap-4 bg-salt p-4 rounded-rs border border-sand-d/20 overflow-x-auto">
                        {neg.requestBudget ? (
                          <div className="text-center shrink-0">
                            <div className="text-[10px] text-ink-s mb-1">{t('negotiations.request_budget')}</div>
                            <div className="font-bold text-coral text-sm">{formatCurrency(neg.requestBudget)}</div>
                          </div>
                        ) : (
                          <div className="text-center shrink-0">
                            <div className="text-[10px] text-ink-s mb-1">{t('negotiations.listed')}</div>
                            <div className="font-bold text-ink-m line-through text-sm">{formatCurrency(neg.listedPrice || 0)}</div>
                          </div>
                        )}
                        
                        <ArrowLeftRight size={16} className="text-sand-d shrink-0" />
                        
                        <div className="text-center shrink-0">
                          <div className="text-[10px] text-ink-s mb-1">{user?.uid === neg.officeId ? (i18n.language === 'ar' ? 'عرضك الأول' : 'Your First Offer') : (i18n.language === 'ar' ? 'عرض المكتب' : 'Office Offer')}</div>
                          <div className="font-bold text-ink-m text-sm">{formatCurrency(neg.myOffer || 0)}</div>
                        </div>

                        {neg.counterOffer && (
                          <>
                            <ArrowLeftRight size={16} className="text-sand-d shrink-0" />
                            <div className="text-center shrink-0">
                              <div className="text-[10px] text-ink-s mb-1">{t('negotiations.office_reply')}</div>
                              <div className="font-bold text-sea text-lg">{formatCurrency(neg.counterOffer)}</div>
                            </div>
                            <div className={`bg-mint-l text-mint text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap ${i18n.language === 'ar' ? 'mr-auto' : 'ml-auto'}`}>
                              {t('negotiations.saving')} {Math.round((1 - (neg.counterOffer / (neg.listedPrice || neg.requestBudget || 1))) * 100)}%
                            </div>
                          </>
                        )}
                        {neg.agreedPrice && (
                          <>
                            <ArrowLeftRight size={16} className="text-sand-d shrink-0" />
                            <div className="text-center shrink-0">
                              <div className="text-[10px] text-ink-s mb-1">{t('negotiations.agreed_price')}</div>
                              <div className="font-bold text-mint text-xl">{formatCurrency(neg.agreedPrice)}</div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Contact Info Section (Only when agreed or cancelling) */}
                      {(neg.status === 'agreed' || neg.status === 'cancelled' || neg.cancellationStatus) && (
                        <div className="mt-6 space-y-4">
                          {/* Cancellation Status UI */}
                          {neg.cancellationStatus && neg.status !== 'cancelled' && (
                            <div className="bg-red-l/20 border border-red/20 rounded-r p-4 mb-4">
                              <div className="flex items-center gap-3 mb-3">
                                <AlertCircle size={20} className="text-red" />
                                <div>
                                  <h4 className="text-sm font-black text-red">
                                    {i18n.language === 'ar' ? 'طلب إلغاء الحجز' : 'Cancellation Request'}
                                  </h4>
                                  <p className="text-[10px] text-ink-s font-bold">
                                    {neg.cancellationRequestedBy === (profile?.role === 'office' ? 'office' : 'client') 
                                      ? (i18n.language === 'ar' ? 'لقد طلبت إلغاء هذا الحجز' : 'You requested to cancel this booking')
                                      : (i18n.language === 'ar' ? 'الطرف الآخر طلب إلغاء هذا الحجز' : 'The other party requested to cancel this booking')}
                                  </p>
                                </div>
                              </div>

                              <div className="bg-white/50 p-3 rounded-rs border border-red/10 mb-4">
                                <div className="text-[9px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'سبب الإلغاء' : 'Reason'}</div>
                                <p className="text-xs italic text-ink-m">"{neg.cancellationReason}"</p>
                              </div>

                              {/* Action: Agree to Cancellation */}
                              {neg.cancellationStatus === 'requested' && neg.cancellationRequestedBy !== (profile?.role === 'office' ? 'office' : 'client') && (
                                <Button 
                                  variant="ink" 
                                  size="sm" 
                                  className="w-full bg-red text-white hover:bg-red-d text-xs mb-3"
                                  onClick={() => handleAgreeToCancellation(neg.id)}
                                >
                                  {i18n.language === 'ar' ? 'الموافقة على الإلغاء' : 'Agree to Cancellation'}
                                </Button>
                              )}

                              {/* Action: Confirm Refund/Settlement */}
                              {neg.cancellationStatus === 'agreed' && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-ink-s bg-white/40 p-2 rounded">
                                    <Info size={14} className="text-red" />
                                    {i18n.language === 'ar' 
                                      ? 'تم الاتفاق على الإلغاء. يرجى تأكيد استلام/رد كافة المستحقات المالية لإغلاق الحجز.' 
                                      : 'Cancellation agreed. Please confirm receipt/refund of all rights to close the booking.'}
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <Button 
                                      variant={((profile?.role === 'office' && neg.refundConfirmedByOffice) || (profile?.role !== 'office' && neg.refundConfirmedByClient)) ? "outline" : "ink"}
                                      size="sm"
                                      className={`text-[10px] ${!((profile?.role === 'office' && neg.refundConfirmedByOffice) || (profile?.role !== 'office' && neg.refundConfirmedByClient)) ? 'bg-red text-white' : ''}`}
                                      disabled={(profile?.role === 'office' && neg.refundConfirmedByOffice) || (profile?.role !== 'office' && neg.refundConfirmedByClient)}
                                      onClick={() => handleConfirmRefund(neg.id, profile?.role === 'office' ? 'office' : 'client')}
                                    >
                                      {((profile?.role === 'office' && neg.refundConfirmedByOffice) || (profile?.role !== 'office' && neg.refundConfirmedByClient))
                                        ? (i18n.language === 'ar' ? 'تم تأكيد حقي ✓' : 'My rights confirmed ✓')
                                        : (i18n.language === 'ar' ? 'أؤكد استلام حقي/رد المبلغ' : 'Confirm my rights/refund')}
                                    </Button>

                                    <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-ink-s">
                                      {neg.cancellationRequestedBy === 'client' ? (i18n.language === 'ar' ? 'المكتب:' : 'Office:') : (i18n.language === 'ar' ? 'العميل:' : 'Client:')}
                                      {((neg.cancellationRequestedBy === 'client' && neg.refundConfirmedByOffice) || (neg.cancellationRequestedBy === 'office' && neg.refundConfirmedByClient))
                                        ? <span className="text-mint">✓ {i18n.language === 'ar' ? 'أكد' : 'Confirmed'}</span>
                                        : <span className="text-gold animate-pulse">{i18n.language === 'ar' ? 'بانتظار التأكيد...' : 'Waiting...'}</span>}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Cancellation Finalized Banner */}
                          {neg.status === 'cancelled' && (
                            <div className="bg-ink-l/20 border border-ink-s/20 rounded-r p-4 mb-4 text-center">
                              <div className="flex justify-center mb-2">
                                <XCircle size={24} className="text-ink-s" />
                              </div>
                              <h4 className="text-sm font-black text-ink-s uppercase tracking-wider">
                                {i18n.language === 'ar' ? 'تم إلغاء الحجز نهائياً' : 'Booking Cancelled'}
                              </h4>
                              <p className="text-[10px] text-ink-s italic mt-1">
                                {i18n.language === 'ar' 
                                  ? `تم الإغلاق في ${new Date(neg.cancellationFinalizedAt || '').toLocaleDateString('ar-EG')}` 
                                  : `Finalized on ${new Date(neg.cancellationFinalizedAt || '').toLocaleDateString()}`}
                              </p>
                            </div>
                          )}

                          {/* Booking Voucher (When fully confirmed) */}
                          {neg.paymentSentByClient && neg.paymentReceivedByOffice ? (
                            <div className="bg-mint-l/30 border-2 border-mint rounded-r p-6 text-center">
                              <div className="flex justify-center mb-4">
                                <div className="bg-mint p-3 rounded-full text-white">
                                  <ShieldCheck size={32} />
                                </div>
                              </div>
                              <h4 className="text-lg font-black text-mint mb-2 uppercase tracking-wider">
                                {t('negotiations.voucher.title')}
                              </h4>
                              <p className="text-xs text-ink-s mb-6 max-w-xs mx-auto">
                                {i18n.language === 'ar' 
                                  ? 'تم تأكيد الحجز والدفع بنجاح. يمكنك الآن عرض وتحميل قسيمة الحجز النهائية.' 
                                  : 'Booking and payment confirmed successfully. You can now view and download your final voucher.'}
                              </p>
                              
                              <div className="flex flex-col sm:flex-row gap-4">
                                <Button 
                                  variant="mint" 
                                  className="flex-1 flex items-center justify-center gap-2 py-4 shadow-lg"
                                  onClick={() => openVoucher(neg)}
                                >
                                  <Receipt size={18} /> {i18n.language === 'ar' ? 'عرض قسيمة الحجز' : 'View Booking Voucher'}
                                </Button>
                                
                                {active && !neg.reviewed && user?.uid === neg.userId && (
                                  <Button 
                                    variant="sea" 
                                    className="flex-1 flex items-center justify-center gap-2 py-4 shadow-lg"
                                    onClick={() => openReview(neg)}
                                  >
                                    <Star size={18} /> {i18n.language === 'ar' ? 'تقييم ورفع صور' : 'Rate & Upload Photos'}
                                  </Button>
                                )}

                                {neg.reviewed && (
                                  <div className="flex-1 bg-white/50 border border-mint/20 rounded-rs p-4 flex items-center justify-center gap-2 text-mint font-black text-xs">
                                    <CheckCircle2 size={16} /> {i18n.language === 'ar' ? 'تم التقييم' : 'Reviewed'}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-mint-l/30 border border-mint/20 rounded-rs">
                              <h4 className="text-xs font-black text-mint mb-3 flex items-center gap-2">
                                <Phone size={14} /> {i18n.language === 'ar' ? 'بيانات التواصل لإتمام الحجز' : 'Contact Details for Booking'}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-3 rounded-rxs border border-sand-d/10">
                                  <div className="text-[10px] text-ink-s mb-1">{t('negotiations.voucher.office_phone')}</div>
                                  <div className="font-bold text-sea flex items-center gap-2">
                                    {neg.officePhone ? (
                                      <>
                                        <span className="font-mono">{neg.officePhone}</span>
                                        <a href={`tel:${neg.officePhone}`} className="p-1 hover:bg-sea-p rounded-full transition-colors">
                                          <Phone size={12} />
                                        </a>
                                      </>
                                    ) : (
                                      <span className="text-xs text-ink-s italic">{i18n.language === 'ar' ? 'بانتظار مشاركة المكتب...' : 'Waiting for office...'}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="bg-white p-3 rounded-rxs border border-sand-d/10">
                                  <div className="text-[10px] text-ink-s mb-1">{t('negotiations.voucher.client_phone')}</div>
                                  <div className="font-bold text-sea flex items-center gap-2">
                                    {neg.clientPhone ? (
                                      <>
                                        <span className="font-mono">{neg.clientPhone}</span>
                                        <a href={`tel:${neg.clientPhone}`} className="p-1 hover:bg-sea-p rounded-full transition-colors">
                                          <Phone size={12} />
                                        </a>
                                      </>
                                    ) : (
                                      <span className="text-xs text-ink-s italic">{i18n.language === 'ar' ? 'بانتظار مشاركة العميل...' : 'Waiting for client...'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Payment Confirmation Buttons */}
                              <div className="mt-6 p-4 bg-white/50 rounded-rs border border-mint/10 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-ink-m">
                                  <CreditCard size={14} className="text-sea" />
                                  {t('negotiations.voucher.payment_status')}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Client Side */}
                                  {user?.uid === neg.userId && (
                                    <Button 
                                      variant={neg.paymentSentByClient ? "outline" : "mint"} 
                                      size="sm" 
                                      className="w-full text-[10px] py-2"
                                      disabled={neg.paymentSentByClient}
                                      onClick={() => setConfirmPayment({ isOpen: true, neg, type: 'sent' })}
                                    >
                                      {neg.paymentSentByClient ? (
                                        <span className="flex items-center gap-1"><CheckCircle2 size={12} /> {t('negotiations.voucher.sent')}</span>
                                      ) : (
                                        t('negotiations.voucher.confirm_sent_btn')
                                      )}
                                    </Button>
                                  )}

                                  {/* Office Side */}
                                  {(user?.uid === neg.officeId || profile?.role === 'admin') && (
                                    <Button 
                                      variant={neg.paymentReceivedByOffice ? "outline" : "mint"} 
                                      size="sm" 
                                      className="w-full text-[10px] py-2"
                                      disabled={neg.paymentReceivedByOffice}
                                      onClick={() => {
                                        const total = (neg.agreedPrice || neg.currentOffer) * (neg.nights || 1);
                                        setDepositInput(Math.round(total * 0.25).toString());
                                        setConfirmPayment({ isOpen: true, neg, type: 'received' });
                                      }}
                                    >
                                      {neg.paymentReceivedByOffice ? (
                                        <span className="flex items-center gap-1"><CheckCircle2 size={12} /> {t('negotiations.voucher.received')}</span>
                                      ) : (
                                        t('negotiations.voucher.confirm_received_btn')
                                      )}
                                    </Button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 bg-gold-l/50 p-2 rounded text-[9px] text-gold font-bold">
                                  <Info size={12} />
                                  {i18n.language === 'ar' 
                                    ? 'بمجرد تأكيد الطرفين، سيظهر فاوتشر الحجز النهائي بكافة التفاصيل.' 
                                    : 'Once both parties confirm, the final booking voucher will appear with all details.'}
                                </div>
                              </div>

                              {/* Share My Contact Button if not shared yet */}
                              {((profile?.role === 'office' && !neg.officePhone) || (profile?.role !== 'office' && !neg.clientPhone)) && (
                                <Button 
                                  variant="mint" 
                                  size="sm" 
                                  className="w-full mt-4 text-[10px] py-2"
                                  onClick={() => handleShareMyContact(neg)}
                                >
                                  {i18n.language === 'ar' ? 'مشاركة رقم هاتفي الآن' : 'Share My Phone Now'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                      <div className={`flex flex-col justify-between ${i18n.language === 'ar' ? 'items-end' : 'items-start'} shrink-0`}>
                        {neg.status === 'agreed' ? (
                          <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                            <div className="bg-mint-l text-mint p-3 rounded-rs border border-mint/20 mb-4 flex items-center gap-2 text-xs">
                              <CheckCircle2 size={16} /> {i18n.language === 'ar' ? 'تم الاتفاق بنجاح' : 'Agreement Confirmed'}
                            </div>
                            <p className="text-[10px] text-ink-s mb-4 max-w-[200px]">
                              {i18n.language === 'ar' 
                                ? 'يرجى التواصل هاتفياً لإتمام عملية الدفع وتأكيد الحجز.' 
                                : 'Please call to complete payment and confirm booking.'}
                            </p>
                            <div className="flex flex-col gap-2">
                              <Button variant="ink" size="sm" onClick={() => openChat(neg)} className="flex items-center gap-2">
                                <MessageSquare size={14} /> {t('negotiations.chat')}
                              </Button>
                              
                              {!neg.cancellationStatus && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red hover:bg-red-l text-[10px] font-bold"
                                  onClick={() => {
                                    setSelectedNeg(neg);
                                    setIsCancellationOpen(true);
                                  }}
                                >
                                  {i18n.language === 'ar' ? 'طلب إلغاء الحجز' : 'Request Cancellation'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : neg.status === 'cancelled' ? (
                          <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                             <Button variant="secondary" size="sm" className="flex items-center gap-2" onClick={() => openChat(neg)}>
                                <MessageSquare size={14} /> {t('negotiations.chat')}
                              </Button>
                          </div>
                        ) : (
                        <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                          <div className="flex items-center gap-2 text-xs text-red font-bold mb-4">
                            <Clock size={14} /> {t('negotiations.expires_in')} ١٤ {t('requests.hours')}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" className="flex items-center gap-2" onClick={() => openChat(neg)}>
                              <MessageSquare size={14} /> {t('negotiations.chat')}
                            </Button>
                            
                            {/* Client Actions */}
                            {user?.uid === neg.userId && (neg.status === 'counter' || neg.status === 'pending') && (
                              <>
                                <Button variant="mint" size="sm" onClick={() => openAgreement(neg)}>{i18n.language === 'ar' ? 'تأكيد الاتفاق' : 'Confirm Agreement'}</Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red border-red hover:bg-red-l"
                                  onClick={() => setConfirmReject({ isOpen: true, negId: neg.id })}
                                >
                                  <XCircle size={14} /> {i18n.language === 'ar' ? 'غير ملائم' : 'Not suitable'}
                                </Button>
                              </>
                            )}
                            
                            {/* Office Actions */}
                            {(user?.uid === neg.officeId || profile?.role === 'admin') && neg.status === 'pending' && (
                              <>
                                <Button 
                                  variant="mint" 
                                  size="sm" 
                                  onClick={() => setConfirmAccept({ isOpen: true, negId: neg.id, price: neg.currentOffer })}
                                >
                                  {i18n.language === 'ar' ? 'قبول العرض' : 'Accept Offer'}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red border-red hover:bg-red-l"
                                  onClick={() => setConfirmReject({ isOpen: true, negId: neg.id })}
                                >
                                  <XCircle size={14} /> {i18n.language === 'ar' ? 'رفض' : 'Reject'}
                                </Button>
                              </>
                            )}

                            {/* Common Counter Button */}
                            <Button variant="outline" size="sm" onClick={() => openCounter(neg)}>{t('negotiations.counter_btn')}</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white rounded-r border border-sand-d/20">
            <p className="text-ink-s font-bold">{i18n.language === 'ar' ? 'لا توجد مفاوضات حالياً' : 'No negotiations at the moment'}</p>
          </div>
        )}
      </div>

      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        title={selectedNeg?.officeName || t('negotiations.chat')} 
        negotiationId={selectedNeg?.id || ''}
      />

      <AgreementModal 
        isOpen={isAgreementOpen} 
        onClose={() => setIsAgreementOpen(false)} 
        amount={(selectedNeg?.counterOffer || selectedNeg?.myOffer || 0)} 
        onConfirm={() => {
          if (selectedNeg) {
            handleStatusUpdate(selectedNeg.id, 'agreed', { 
              agreedPrice: selectedNeg.counterOffer || selectedNeg.myOffer
            });
          }
        }}
      />

      {selectedNeg && (
        <CounterOfferModal 
          isOpen={isCounterOpen} 
          onClose={() => setIsCounterOpen(false)} 
          negotiation={selectedNeg} 
        />
      )}

      <VoucherModal 
        isOpen={isVoucherOpen} 
        onClose={() => setIsVoucherOpen(false)} 
        negotiation={selectedNeg!} 
        clientName={user?.uid === selectedNeg?.userId ? profile?.displayName : 'Client'}
      />

      {selectedNeg && (
        <ReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          negotiationId={selectedNeg.id}
          chaletId={selectedNeg.chaletId}
          chaletName={selectedNeg.chaletName || 'Chalet'}
        />
      )}

      <CancellationModal 
        isOpen={isCancellationOpen}
        onClose={() => setIsCancellationOpen(false)}
        onConfirm={handleRequestCancellation}
        requestedBy={profile?.role === 'office' ? 'office' : 'client'}
      />

      {/* Payment Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmPayment.isOpen}
        onClose={() => setConfirmPayment({ isOpen: false, neg: null, type: 'sent' })}
        onConfirm={() => {
          if (confirmPayment.neg) {
            handleConfirmPayment(
              confirmPayment.neg, 
              confirmPayment.type, 
              confirmPayment.type === 'received' ? parseInt(depositInput) : undefined
            );
          }
        }}
        title={confirmPayment.type === 'sent' 
          ? t('negotiations.voucher.confirm_sent_btn') 
          : t('negotiations.voucher.confirm_received_btn')}
        message={
          <div className="space-y-4">
            <p>
              {confirmPayment.type === 'sent'
                ? (i18n.language === 'ar' ? 'هل أنت متأكد من أنك قمت بتحويل العربون المتفق عليه؟' : 'Are you sure you have sent the agreed deposit?')
                : (i18n.language === 'ar' ? 'يرجى تأكيد استلام العربون وتحديد المبلغ الذي تم استلامه.' : 'Please confirm receipt of the deposit and specify the amount received.')}
            </p>
            {confirmPayment.type === 'received' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-ink-s block">{t('negotiations.voucher.deposit_paid')}</label>
                <input 
                  type="number" 
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  className="w-full p-3 bg-salt border border-sand-d/20 rounded-r font-bold text-sea"
                  placeholder="0"
                />
              </div>
            )}
          </div>
        }
        variant="mint"
      />

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={confirmAccept.isOpen}
        onClose={() => setConfirmAccept({ isOpen: false, negId: '', price: 0 })}
        onConfirm={() => {
          handleStatusUpdate(confirmAccept.negId, 'agreed', { agreedPrice: confirmAccept.price });
          setConfirmAccept({ isOpen: false, negId: '', price: 0 });
        }}
        title={i18n.language === 'ar' ? 'قبول العرض' : 'Accept Offer'}
        message={i18n.language === 'ar' ? 'هل أنت متأكد من قبول هذا العرض؟ سيتم الاتفاق على هذا السعر ومشاركة بيانات التواصل.' : 'Are you sure you want to accept this offer? This will confirm the agreement and share contact details.'}
        variant="sea"
      />

      <ConfirmationModal
        isOpen={confirmReject.isOpen}
        onClose={() => setConfirmReject({ isOpen: false, negId: '' })}
        onConfirm={() => {
          handleStatusUpdate(confirmReject.negId, 'rejected');
          setConfirmReject({ isOpen: false, negId: '' });
        }}
        title={i18n.language === 'ar' ? 'رفض العرض' : 'Reject Offer'}
        message={i18n.language === 'ar' ? 'هل أنت متأكد من رفض هذا العرض؟' : 'Are you sure you want to reject this offer?'}
        variant="red"
      />
    </div>
  );
};

