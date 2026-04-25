import { useState, useEffect, FormEvent } from 'react';
import { Button } from '../components/Button';
import { MapPin, Calendar, Users, BedDouble, Wallet, MessageSquare, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, collection, addDoc, query, where, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { Request } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { SelectChaletModal } from '../components/SelectChaletModal';

export const RequestsPage = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const isArabic = i18n.language === 'ar';
  const [mode, setMode] = useState<'all' | 'mine'>('all');
  const [isPosting, setIsPosting] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const navigate = useNavigate();

  const handleMakeOffer = (req: Request) => {
    if (!user) {
      toast.error(i18n.language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return;
    }
    if (profile?.role !== 'office' && profile?.role !== 'owner' && profile?.role !== 'admin') {
      toast.error(i18n.language === 'ar' ? 'يجب أن تكون مكتباً لتقديم عرض' : 'You must be an office to make an offer');
      return;
    }
    setSelectedRequest(req);
    setIsSelectModalOpen(true);
  };

  // Form states
  const [location, setLocation] = useState('Marina');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(4);
  const [rooms, setRooms] = useState(2);
  const [budget, setBudget] = useState(3000);
  const [note, setNote] = useState('');

  useEffect(() => {
    setLoading(true);
    let q;
    if (mode === 'mine' && user) {
      q = query(
        collection(db, 'requests'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'requests'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Request[];
      setRequests(fetchedRequests);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'requests');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mode, user]);

  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(i18n.language === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
      return;
    }

    setIsPosting(true);
    try {
      // Basic validation
      if (!checkIn || !checkOut) {
        toast.error(i18n.language === 'ar' ? 'يرجى اختيار التواريخ' : 'Please select dates');
        setIsPosting(false);
        return;
      }

      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        toast.error(i18n.language === 'ar' ? 'تاريخ الوصول لا يمكن أن يكون في الماضي' : 'Check-in date cannot be in the past');
        setIsPosting(false);
        return;
      }

      if (end <= start) {
        toast.error(i18n.language === 'ar' ? 'تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول' : 'Check-out date must be after check-in date');
        setIsPosting(false);
        return;
      }

      const newRequest = {
        userId: user.uid,
        location,
        checkIn,
        checkOut,
        budget,
        guests,
        rooms,
        note,
        status: 'active',
        urgent: false,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'requests'), newRequest);
      toast.success(i18n.language === 'ar' ? 'تم نشر طلبك بنجاح!' : 'Request posted successfully!');
      setNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'requests');
      toast.error(i18n.language === 'ar' ? 'فشل في نشر الطلب' : 'Failed to post request');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Post Form (Sticky) */}
        <aside className="w-full md:w-80 shrink-0">
          <div className="sticky top-24 bg-white rounded-r p-6 shadow-sh border border-sand-d/20">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2">
              <MessageSquare className="text-coral" /> {t('requests.post_title')}
            </h2>
            
            <form className="space-y-4" onSubmit={handlePost}>
              <div className="space-y-1">
                <label className="text-xs font-bold text-ink-s">{t('requests.area')}</label>
                <select 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-sea"
                >
                  <option value="Marina">{i18n.language === 'ar' ? 'مارينا' : 'Marina'}</option>
                  <option value="Hacienda">{i18n.language === 'ar' ? 'هاسيندا' : 'Hacienda'}</option>
                  <option value="Sidi Abdel Rahman">{i18n.language === 'ar' ? 'سيدي عبد الرحمن' : 'Sidi Abdel Rahman'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-s">{t('requests.from_date')}</label>
                  <input 
                    type="date" 
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-xs outline-none focus:border-sea" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-s">{t('requests.to_date')}</label>
                  <input 
                    type="date" 
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-xs outline-none focus:border-sea" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-s">{t('requests.persons')}</label>
                  <input 
                    type="number" 
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value))}
                    placeholder="4" 
                    className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-sea" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink-s">{t('requests.rooms')}</label>
                  <input 
                    type="number" 
                    value={rooms}
                    onChange={(e) => setRooms(parseInt(e.target.value))}
                    placeholder="2" 
                    className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-sea" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink-s">{t('requests.max_budget')}</label>
                <input 
                  type="number" 
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value))}
                  placeholder="3000" 
                  className="w-full bg-coral-p border border-coral/20 rounded-rs p-3 text-sm font-bold text-coral outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-ink-s">{t('requests.additional_notes')}</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 text-sm outline-none focus:border-sea h-24 resize-none" 
                  placeholder={t('requests.notes_placeholder')}
                ></textarea>
              </div>

              <div className="p-3 bg-gold-l rounded-rs border border-gold/10 text-[10px] text-gold font-bold leading-relaxed">
                {t('requests.privacy_notice')}
              </div>

              <Button variant="coral" className="w-full py-4 text-lg" loading={isPosting} disabled={!user}>
                {isPosting ? t('requests.analyzing') : t('requests.post_btn')}
              </Button>
              {!user && (
                <p className="text-[10px] text-red text-center font-bold mt-2">
                  {i18n.language === 'ar' ? 'سجل دخولك لنشر طلب' : 'Login to post a request'}
                </p>
              )}
            </form>
          </div>
        </aside>

        {/* Requests Feed */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <div className="flex bg-salt p-1 rounded-full border border-sand-d/20">
              <button 
                onClick={() => setMode('all')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'all' ? 'bg-white text-sea shadow-sm' : 'text-ink-s'}`}
              >
                {t('requests.client_requests')}
              </button>
              <button 
                onClick={() => setMode('mine')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'mine' ? 'bg-white text-sea shadow-sm' : 'text-ink-s'}`}
              >
                {t('requests.my_requests')}
              </button>
            </div>
            <div className="text-ink-s text-xs">{t('explore.showing')} <span className="font-bold text-ink">{requests.length}</span> {t('requests.active_requests')}</div>
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-white/50 animate-pulse rounded-r border border-sand-d/20"></div>
              ))
            ) : (
              requests.map(req => (
                <motion.div 
                  key={req.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-r p-6 shadow-sh border border-sand-d/20 relative overflow-hidden ${i18n.language === 'ar' ? 'border-r-4' : 'border-l-4'} ${
                    req.userId === user?.uid ? (i18n.language === 'ar' ? 'border-r-coral' : 'border-l-coral') : 
                    req.urgent ? (i18n.language === 'ar' ? 'border-r-red' : 'border-l-red') : 
                    req.status === 'closed' ? (i18n.language === 'ar' ? 'border-r-gold' : 'border-l-gold') : (i18n.language === 'ar' ? 'border-r-sea-ll' : 'border-l-sea-ll')
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <Link to={`/u/${req.userId}`} className="text-xs font-mono text-sea hover:underline font-bold">
                          {isArabic ? 'العميل' : 'Client'} #{req.id.slice(0, 8)}
                        </Link>
                        <span className="text-[10px] text-ink-s flex items-center gap-1">
                          <Clock size={10} /> 
                          {new Date(req.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                        </span>
                        
                        {req.urgent && (
                          <span className="bg-red-l text-red text-[10px] px-2 py-0.5 rounded-full font-bold">{t('requests.urgent')}</span>
                        )}
                        {req.userId === user?.uid && (
                          <span className="bg-coral-p text-coral text-[10px] px-2 py-0.5 rounded-full font-bold">{t('requests.my_request_label')}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} className="text-sea" />
                          <span className="font-bold">{req.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar size={14} className="text-sea" />
                          <span className="text-xs">{req.checkIn} ← {req.checkOut}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users size={14} className="text-sea" />
                          <span className="text-xs">{req.guests} {t('common.guests')} / {req.rooms || 2} {t('common.rooms')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Wallet size={14} className="text-coral" />
                          <span className="font-bold text-coral">{req.budget} {t('common.currency')}/{t('common.night')}</span>
                        </div>
                      </div>

                      {req.note && <p className="text-sm text-ink-m italic mb-4">"{req.note}"</p>}

                      <div className="flex flex-wrap gap-2">
                        {(req.features || []).map(f => (
                          <span key={f} className="bg-salt text-ink-s text-[10px] px-2 py-0.5 rounded-rxs border border-sand-d/30">{f}</span>
                        ))}
                      </div>
                    </div>

                    <div className={`flex flex-col justify-between ${i18n.language === 'ar' ? 'items-end' : 'items-start'} shrink-0`}>
                      <div className="bg-lav-l text-lav text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 mb-4">
                        <Sparkles size={12} /> {t('requests.ai_match')}: {req.aiMatch || 90}%
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => navigate(`/ai-matching?requestId=${req.id}`)}>{t('requests.details')}</Button>
                        <Button 
                          variant="ink" 
                          size="sm" 
                          disabled={req.userId === user?.uid}
                          onClick={() => handleMakeOffer(req)}
                        >
                          {t('requests.make_offer')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            {!loading && requests.length === 0 && (
              <div className="text-center py-20 bg-white rounded-r border border-sand-d/20">
                <p className="text-ink-s font-bold">{i18n.language === 'ar' ? 'لا توجد طلبات حالياً' : 'No requests at the moment'}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedRequest && (
        <SelectChaletModal 
          isOpen={isSelectModalOpen} 
          onClose={() => setIsSelectModalOpen(false)} 
          request={selectedRequest} 
        />
      )}
    </div>
  );
};

export default RequestsPage;
