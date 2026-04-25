import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Negotiation } from '../types';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, User, Home, AlertCircle, CheckCircle2, ChevronRight, Search, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';

export const OfficeBookingsPage = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const initialFilter = searchParams.get('filter') as any || 'all';
  const [filter, setFilter] = useState<'all' | 'current' | 'upcoming' | 'checkout-soon'>(initialFilter);

  useEffect(() => {
    if (searchParams.get('filter')) {
      setFilter(searchParams.get('filter') as any);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user || (profile?.role !== 'office' && profile?.role !== 'admin' && profile?.role !== 'owner')) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const q = profile?.role === 'admin' 
      ? query(collection(db, 'negotiations'), where('status', '==', 'agreed'))
      : query(collection(db, 'negotiations'), where('officeId', '==', user.uid), where('status', '==', 'agreed'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Negotiation[];
      
      // Sort by check-in date
      fetchedBookings.sort((a, b) => {
        const dateA = a.checkIn ? new Date(a.checkIn).getTime() : 0;
        const dateB = b.checkIn ? new Date(b.checkIn).getTime() : 0;
        return dateA - dateB;
      });

      setBookings(fetchedBookings);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'negotiations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const getBookingStatus = (booking: Negotiation) => {
    if (!booking.checkIn || !booking.checkOut) return 'unknown';
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkIn = new Date(booking.checkIn);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(0, 0, 0, 0);

    if (now >= checkIn && now < checkOut) return 'current';
    if (now < checkIn) return 'upcoming';
    if (now >= checkOut) return 'completed';
    return 'unknown';
  };

  const isCheckoutSoon = (booking: Negotiation) => {
    if (!booking.checkOut) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(0, 0, 0, 0);
    
    const diffTime = checkOut.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1; // Alert 1 day before checkout
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      (b.chaletName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.clientName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const status = getBookingStatus(b);
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'current' && status === 'current') ||
      (filter === 'upcoming' && status === 'upcoming') ||
      (filter === 'checkout-soon' && isCheckoutSoon(b));

    return matchesSearch && matchesFilter && b.status !== 'cancelled';
  });

  const currentBookings = filteredBookings.filter(b => getBookingStatus(b) === 'current');
  const upcomingBookings = filteredBookings.filter(b => getBookingStatus(b) === 'upcoming');
  const completedBookings = filteredBookings.filter(b => getBookingStatus(b) === 'completed');

  if (profile?.role !== 'office' && profile?.role !== 'admin' && profile?.role !== 'owner' && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black mb-4">{t('office.not_authorized')}</h2>
        <p className="text-ink-s">{t('office.not_authorized_desc')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-ink mb-2">
            {i18n.language === 'ar' ? 'تنظيم الحجوزات' : 'Bookings Organization'}
          </h1>
          <p className="text-ink-s text-sm">
            {i18n.language === 'ar' ? 'إدارة الحجوزات الحالية والقادمة ومتابعة مواعيد التسليم' : 'Manage current and upcoming bookings and track checkout dates'}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
            <input 
              type="text" 
              placeholder={i18n.language === 'ar' ? 'بحث عن عميل أو شاليه...' : 'Search client or chalet...'}
              className="w-full pl-10 pr-4 py-2 bg-white border border-sand-d/20 rounded-rs text-sm focus:outline-none focus:border-sea"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white border border-sand-d/20 rounded-rs text-sm focus:outline-none focus:border-sea"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">{i18n.language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="current">{i18n.language === 'ar' ? 'الحالية' : 'Current'}</option>
            <option value="upcoming">{i18n.language === 'ar' ? 'القادمة' : 'Upcoming'}</option>
            <option value="checkout-soon">{i18n.language === 'ar' ? 'تسليم غداً' : 'Checkout Tomorrow'}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-sea border-t-transparent rounded-full animate-spin"></div>
          <p className="text-ink-s font-bold">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Checkout Alerts */}
          {bookings.some(isCheckoutSoon) && (
            <div className="space-y-4">
              <h2 className="text-xs font-black text-coral uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} /> {i18n.language === 'ar' ? 'تنبيهات التسليم (غداً)' : 'Checkout Alerts (Tomorrow)'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings.filter(isCheckoutSoon).map(b => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={b.id} 
                    className="bg-coral-l/30 border border-coral/20 p-4 rounded-r flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-coral text-white rounded-full flex items-center justify-center">
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-ink">{b.chaletName}</div>
                        <div className="text-[10px] text-coral font-bold uppercase">{i18n.language === 'ar' ? 'تسليم غداً' : 'Checkout Tomorrow'}</div>
                      </div>
                    </div>
                    <Button variant="ink" size="sm" className="bg-coral text-white hover:bg-coral-d text-[10px]">
                      {i18n.language === 'ar' ? 'تجهيز الاستلام' : 'Prepare Checkout'}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Current Bookings */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <div className="w-2 h-2 bg-mint rounded-full animate-pulse"></div>
                {i18n.language === 'ar' ? 'الحجوزات الحالية' : 'Current Bookings'}
                <span className="text-xs text-ink-s font-normal ml-2">({currentBookings.length})</span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentBookings.length > 0 ? currentBookings.map(b => (
                <BookingCard key={b.id} booking={b} status="current" />
              )) : (
                <div className="col-span-full py-12 text-center bg-salt/50 rounded-r border border-dashed border-sand-d/30">
                  <p className="text-ink-s text-sm italic">{i18n.language === 'ar' ? 'لا توجد حجوزات حالية' : 'No current bookings'}</p>
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Bookings */}
          <section className="space-y-6">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <Calendar size={20} className="text-sea" />
              {i18n.language === 'ar' ? 'الحجوزات القادمة' : 'Upcoming Bookings'}
              <span className="text-xs text-ink-s font-normal ml-2">({upcomingBookings.length})</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingBookings.length > 0 ? upcomingBookings.map(b => (
                <BookingCard key={b.id} booking={b} status="upcoming" />
              )) : (
                <div className="col-span-full py-12 text-center bg-salt/50 rounded-r border border-dashed border-sand-d/30">
                  <p className="text-ink-s text-sm italic">{i18n.language === 'ar' ? 'لا توجد حجوزات قادمة' : 'No upcoming bookings'}</p>
                </div>
              )}
            </div>
          </section>

          {/* Completed Bookings */}
          {completedBookings.length > 0 && (
            <section className="space-y-6 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
              <h2 className="text-lg font-black text-ink flex items-center gap-2">
                <CheckCircle2 size={20} className="text-ink-s" />
                {i18n.language === 'ar' ? 'الحجوزات المنتهية' : 'Completed Bookings'}
                <span className="text-xs text-ink-s font-normal ml-2">({completedBookings.length})</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedBookings.map(b => (
                  <BookingCard key={b.id} booking={b} status="completed" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const BookingCard = ({ booking, status }: { booking: Negotiation, status: 'current' | 'upcoming' | 'completed', key?: string }) => {
  const { i18n } = useTranslation();
  
  const isCheckoutSoon = (booking: Negotiation) => {
    if (!booking.checkOut) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkOut = new Date(booking.checkOut);
    checkOut.setHours(0, 0, 0, 0);
    const diffTime = checkOut.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`bg-white rounded-r shadow-sh border ${isCheckoutSoon(booking) ? 'border-coral/30 ring-1 ring-coral/10' : 'border-sand-d/20'} overflow-hidden flex flex-col`}
    >
      <div className={`p-4 border-b ${
        status === 'current' ? 'bg-mint-l/30 border-mint/10' : 
        status === 'upcoming' ? 'bg-sea-p/30 border-sea/10' : 'bg-salt border-sand-d/10'
      } flex justify-between items-center`}>
        <div className="flex items-center gap-2">
          <Home size={14} className={status === 'current' ? 'text-mint' : status === 'upcoming' ? 'text-sea' : 'text-ink-s'} />
          <span className="text-xs font-black text-ink truncate max-w-[150px]">{booking.chaletName}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            status === 'current' ? 'bg-mint text-white' : 
            status === 'upcoming' ? 'bg-sea text-white' : 'bg-ink-s text-white'
          }`}>
            {status === 'current' ? (i18n.language === 'ar' ? 'حالي' : 'Current') : 
             status === 'upcoming' ? (i18n.language === 'ar' ? 'قادم' : 'Upcoming') : (i18n.language === 'ar' ? 'منتهي' : 'Completed')}
          </span>
          {booking.cancellationStatus && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold bg-red text-white flex items-center gap-1 animate-pulse">
              <AlertTriangle size={8} />
              {i18n.language === 'ar' ? 'طلب إلغاء' : 'Cancellation'}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-salt rounded-full flex items-center justify-center text-ink-s">
            <User size={20} />
          </div>
          <div>
            <div className="text-sm font-black text-ink">{booking.clientName}</div>
            <div className="text-[10px] text-ink-s font-bold">{booking.clientPhone || (i18n.language === 'ar' ? 'رقم الهاتف غير متوفر' : 'Phone not available')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 border-y border-sand-d/10">
          <div>
            <div className="text-[9px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'وصول' : 'Check-in'}</div>
            <div className="text-xs font-black text-ink flex items-center gap-1">
              <Calendar size={12} className="text-sea" />
              {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }) : '-'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'مغادرة' : 'Check-out'}</div>
            <div className="text-xs font-black text-ink flex items-center gap-1">
              <Clock size={12} className="text-coral" />
              {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }) : '-'}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <div className="text-[9px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</div>
            <div className="text-sm font-black text-sea">{formatCurrency(booking.agreedPrice || booking.currentOffer)}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'الحالة المالية' : 'Financial Status'}</div>
            <div className={`text-[10px] font-bold ${booking.paymentReceivedByOffice ? 'text-mint' : 'text-gold'}`}>
              {booking.paymentReceivedByOffice ? (i18n.language === 'ar' ? 'تم دفع العربون' : 'Deposit Paid') : (i18n.language === 'ar' ? 'انتظار العربون' : 'Pending Deposit')}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-salt/50 border-t border-sand-d/10 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8">
          {i18n.language === 'ar' ? 'تفاصيل' : 'Details'}
        </Button>
        <Button variant="sea" size="sm" className="flex-1 text-[10px] h-8">
          {i18n.language === 'ar' ? 'تواصل' : 'Contact'}
        </Button>
      </div>
    </motion.div>
  );
};
