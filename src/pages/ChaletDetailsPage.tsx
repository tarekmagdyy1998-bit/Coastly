import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { db, doc, getDoc, handleFirestoreError, OperationType } from '../firebase';
import { Chalet, UserProfile } from '../types';
import { Button } from '../components/Button';
import { MapPin, Users, BedDouble, Shield, Sparkles, ArrowLeft, Star, Heart, Share2, Info, CheckCircle2, ChevronLeft, ChevronRight, Store, Calendar as CalendarIcon, Map as MapIcon } from 'lucide-react';
import { formatCurrency, getDateRange } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { OfferModal } from '../components/OfferModal';
import { CustomCalendar } from '../components/CustomCalendar';
import { toast } from 'sonner';
import { differenceInDays, parseISO, isWithinInterval } from 'date-fns';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export const ChaletDetailsPage = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const [chalet, setChalet] = useState<Chalet | null>(null);
  const [office, setOffice] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedDates, setSelectedDates] = useState<{ checkIn: string | null; checkOut: string | null }>({
    checkIn: null,
    checkOut: null
  });

  const handleDateClick = (date: string) => {
    // Check if date is within availability range
    if (chalet?.availableFrom && chalet?.availableTo) {
      const targetDate = parseISO(date);
      const from = parseISO(chalet.availableFrom);
      const to = parseISO(chalet.availableTo);
      if (!isWithinInterval(targetDate, { start: from, end: to })) {
        toast.error(i18n.language === 'ar' ? 'هذا التاريخ خارج فترة الإتاحة' : 'This date is outside the availability range');
        return;
      }
    }

    if (!selectedDates.checkIn || (selectedDates.checkIn && selectedDates.checkOut)) {
      setSelectedDates({ checkIn: date, checkOut: null });
    } else {
      const start = parseISO(selectedDates.checkIn);
      const end = parseISO(date);
      
      if (isBefore(end, start)) {
        setSelectedDates({ checkIn: date, checkOut: null });
      } else {
        // Check if any date in the range is blocked
        const datesInRange = getDateRange(selectedDates.checkIn, date);
        const hasBlockedDate = datesInRange.some(d => chalet.blockedDates?.includes(d));
        
        if (hasBlockedDate) {
          toast.error(i18n.language === 'ar' ? 'الفترة المختارة تحتوي على أيام محجوزة' : 'The selected range contains blocked dates');
          return;
        }
        
        setSelectedDates({ ...selectedDates, checkOut: date });
      }
    }
  };

  useEffect(() => {
    const fetchChalet = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'chalets', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const chaletData = { id: docSnap.id, ...docSnap.data() } as Chalet;
          setChalet(chaletData);
          
          // Fetch office details
          if (chaletData.officeId) {
            const officeRef = doc(db, 'users', chaletData.officeId);
            const officeSnap = await getDoc(officeRef);
            if (officeSnap.exists()) {
              setOffice(officeSnap.data() as UserProfile);
            }
          }
        } else {
          toast.error(i18n.language === 'ar' ? 'الشاليه غير موجود' : 'Chalet not found');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'chalets');
      } finally {
        setLoading(false);
      }
    };

    fetchChalet();
  }, [id, i18n.language]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sea"></div>
      </div>
    );
  }

  if (!chalet) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black mb-4">{i18n.language === 'ar' ? 'عذراً، لم نتمكن من العثور على هذا الشاليه' : 'Sorry, we couldn\'t find this chalet'}</h2>
        <Link to="/explore">
          <Button variant="sea">{i18n.language === 'ar' ? 'العودة للاستكشاف' : 'Back to Explore'}</Button>
        </Link>
      </div>
    );
  }

  const images = chalet.images && chalet.images.length > 0 ? chalet.images : [`https://picsum.photos/seed/${chalet.id}/1200/800`];

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const isBefore = (date1: Date, date2: Date) => {
    return date1 < date2;
  };

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back & Actions */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/explore" className="flex items-center gap-2 text-ink-s hover:text-sea transition-colors font-bold">
          <ArrowLeft size={18} className={i18n.language === 'ar' ? 'rotate-180' : ''} /> {i18n.language === 'ar' ? 'العودة للنتائج' : 'Back to results'}
        </Link>
        <div className="flex gap-4">
          <Button variant="outline" size="sm" className="rounded-full shadow-sm"><Share2 size={16} /></Button>
          <Button variant="outline" size="sm" className="rounded-full shadow-sm"><Heart size={16} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Images & Calendar */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="relative h-[400px] md:h-[500px] rounded-r overflow-hidden shadow-shm bg-salt group">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImageIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={images[activeImageIndex]} 
                  alt={chalet.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>
              
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none rotate-12">
                <span className="font-playfair text-6xl font-black text-white uppercase tracking-widest">COASTLY</span>
              </div>
              
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sh text-sm font-black z-10">
                <Star size={16} className="fill-gold text-gold" /> {chalet.rating || 4.5}
              </div>

              {images.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronLeft size={24} className="text-ink" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronRight size={24} className="text-ink" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {images.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all ${activeImageIndex === i ? 'w-6 bg-sea shadow-sm' : 'w-1.5 bg-white/60 hover:bg-white/90'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 scrollbar-hide">
                {images.map((img, i) => (
                  <button 
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative shrink-0 w-24 h-20 rounded-rs overflow-hidden border-2 transition-all ${activeImageIndex === i ? 'border-sea scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Availability Calendar */}
          <div className={`space-y-6 p-6 bg-salt/50 rounded-r border border-sand-d/10 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
            <h3 className="text-xl font-black flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarIcon size={20} className="text-sea" /> 
                {i18n.language === 'ar' ? 'التواريخ المتاحة' : 'Availability'}
              </span>
              {(selectedDates.checkIn || selectedDates.checkOut) && (
                <button 
                  onClick={() => setSelectedDates({ checkIn: null, checkOut: null })}
                  className="text-[10px] font-black text-coral border-b border-coral hover:text-coral-d hover:border-coral-d transition-colors"
                >
                  {i18n.language === 'ar' ? 'مسح التواريخ' : 'Clear Dates'}
                </button>
              )}
            </h3>
            <CustomCalendar 
              blockedDates={chalet.blockedDates}
              availableFrom={chalet.availableFrom}
              availableTo={chalet.availableTo}
              selectedDates={selectedDates}
              onDateClick={handleDateClick}
            />
            {selectedDates.checkIn && (
              <div className="grid grid-cols-2 gap-px bg-sand-d/20 p-px rounded-r overflow-hidden shadow-sh transition-all animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-white p-4">
                  <div className="text-[10px] font-black text-ink-s uppercase tracking-wider mb-1">
                    {i18n.language === 'ar' ? 'وصول' : 'Check-in'}
                  </div>
                  <div className="font-tajawal font-black text-sea text-lg">
                    {selectedDates.checkIn}
                  </div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-[10px] font-black text-ink-s uppercase tracking-wider mb-1">
                    {i18n.language === 'ar' ? 'مغادرة' : 'Check-out'}
                  </div>
                  <div className="font-tajawal font-black text-sea text-lg">
                    {selectedDates.checkOut || '—'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-8">
          <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-2 text-ink-s text-sm mb-2 font-bold uppercase tracking-widest">
              <MapPin size={16} className="text-sea" /> {chalet.location}
            </div>
            <h1 className="text-3xl md:text-5xl font-tajawal font-black text-ink mb-6 leading-tight">{chalet.name}</h1>
            
            <div className={`space-y-6 mb-8 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className="text-xl font-black flex items-center gap-2">
                <Info size={20} className="text-ink-s" /> {i18n.language === 'ar' ? 'عن الشاليه' : 'About this Chalet'}
              </h3>
              <p className="text-ink-m leading-relaxed font-bold text-sm bg-salt/30 p-4 rounded-r border-l-4 border-sea">
                {chalet.description || (i18n.language === 'ar' ? 'لا يوجد وصف متاح حالياً لهذا الشاليه.' : 'No description available for this chalet.')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 mb-8">
              <span className="bg-sea-p text-sea px-4 py-2 rounded-rs text-xs font-black flex items-center gap-2 border border-sea-ll/20 shadow-sm">
                <BedDouble size={14} /> {chalet.rooms} {t('common.rooms')}
              </span>
              {chalet.type && (
                <span className="bg-salt text-ink-s px-4 py-2 rounded-rs text-xs font-black uppercase border border-sand-d/20 shadow-sm">
                  {i18n.language === 'ar' ? (chalet.type === 'chalet' ? 'شاليه' : chalet.type === 'villa' ? 'فيلا' : 'وحدة') : chalet.type}
                </span>
              )}
              {chalet.badge && (
                <span className="bg-coral text-white px-4 py-2 rounded-rs text-xs font-black uppercase shadow-sh">
                  {i18n.language === 'ar' ? (chalet.badge === 'deal' ? 'عرض خاص' : 'مميز') : chalet.badge}
                </span>
              )}
            </div>

            {/* Rules and Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-r p-6 border border-sand-d/20 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-sea flex items-center gap-2">
                  <Shield size={16} /> {t('home.trust.housing_rules')}
                </h4>
                <ul className="space-y-3">
                  {chalet.allowedGroups?.map(g => (
                    <li key={g} className="flex items-center gap-2 text-xs font-bold text-ink-m">
                      <CheckCircle2 size={14} className="text-mint" /> {t(`home.trust.rules.${g}`)}
                    </li>
                  ))}
                  {chalet.noMixedGroups && (
                    <li className="flex items-center gap-2 text-xs font-bold text-ink-m">
                      <CheckCircle2 size={14} className="text-mint" /> {t('home.trust.rules.no_mixed')}
                    </li>
                  )}
                  {chalet.idRequired && (
                    <li className="flex items-center gap-2 text-xs font-bold text-ink-m">
                      <CheckCircle2 size={14} className="text-mint" /> {t('home.trust.rules.id')}
                    </li>
                  )}
                </ul>
              </div>

              <div className="bg-white rounded-r p-6 border border-sand-d/20 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-coral flex items-center gap-2">
                  <Sparkles size={16} /> {i18n.language === 'ar' ? 'الرسوم وتفاصيل الدخول' : 'Fees & Access'}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-ink-s">{t('home.trust.beach_pass')}</span>
                    <span className="text-ink">{chalet.beachPassFee ? formatCurrency(chalet.beachPassFee) : (i18n.language === 'ar' ? 'مجاني' : 'Free')}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-ink-s">{t('home.trust.security_deposit')}</span>
                    <span className="text-ink">{chalet.securityDeposit ? formatCurrency(chalet.securityDeposit) : (i18n.language === 'ar' ? 'لا يوجد' : 'None')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Map */}
            {chalet.lat && chalet.lng && (
              <div className={`space-y-6 mb-8 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                <h3 className="text-xl font-black flex items-center gap-2">
                  <MapIcon size={20} className="text-sea" /> {i18n.language === 'ar' ? 'الموقع على الخريطة' : 'Location on Map'}
                </h3>
                <div className="h-[300px] w-full rounded-r overflow-hidden border-2 border-sea-ll/20 shadow-sh relative z-0">
                  <MapContainer 
                    center={[chalet.lat, chalet.lng]} 
                    zoom={15} 
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[chalet.lat, chalet.lng]}>
                      <Popup>
                        <div className="text-xs font-bold">{chalet.name}</div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-ink-s px-4 py-2 bg-salt rounded-full border border-sand-d/20 w-fit">
                  <MapPin size={14} className="text-sea" /> {chalet.location}
                </div>
              </div>
            )}

            <div className={`space-y-6 mb-8 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className="text-xl font-black flex items-center gap-2">
                <Store size={20} className="text-sea" /> {i18n.language === 'ar' ? 'المكتب المعلن' : 'Listing Office'}
              </h3>
              <Link 
                to={`/office/${chalet.officeId}`}
                className="flex items-center gap-4 p-4 bg-white rounded-r border border-sand-d/20 shadow-sm hover:border-sea transition-all group"
              >
                <div className="w-12 h-12 bg-sea/10 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  🏢
                </div>
                <div>
                  <div className="font-black text-ink group-hover:text-sea transition-colors">
                    {office?.displayName || chalet.office || (i18n.language === 'ar' ? 'مكتب الساحل العقاري' : 'Coastly Real Estate Office')}
                  </div>
                  <div className="text-[10px] text-ink-s font-bold flex items-center gap-1">
                    <Star size={10} className="fill-gold text-gold" /> ٤.٩ • {i18n.language === 'ar' ? 'مكتب موثق' : 'Verified Office'}
                  </div>
                </div>
                <div className={`${i18n.language === 'ar' ? 'mr-auto' : 'ml-auto'}`}>
                  <ChevronRight size={20} className={`text-ink-s group-hover:text-sea ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
                </div>
              </Link>
            </div>

            {/* Offer Section at the bottom of Info */}
            <div className="bg-white rounded-r p-6 shadow-shl border border-sand-d/20 relative overflow-hidden group border-t-4 border-t-coral">
              <div className="absolute top-0 right-0 w-24 h-24 bg-coral/5 rounded-full -mr-12 -mt-12"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-black text-ink-s uppercase tracking-widest">{t('common.price_per_night')}</div>
                <div className="text-coral-d font-black text-xs bg-coral-l/30 px-2 py-1 rounded-full">{i18n.language === 'ar' ? 'سعر خاص' : 'Special Deal'}</div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-5xl font-tajawal font-black text-ink">{formatCurrency(chalet.price)}</div>
                <div className="text-ink-s font-bold">/{t('common.night')}</div>
              </div>

              {selectedDates.checkIn && selectedDates.checkOut && (
                <div className="mt-4 p-3 bg-sea/5 rounded-rs border border-sea/10 flex items-center justify-between text-xs font-bold">
                  <div className="text-ink-s uppercase">{i18n.language === 'ar' ? 'الإجمالي' : 'Total'} ({differenceInDays(parseISO(selectedDates.checkOut), parseISO(selectedDates.checkIn))} {i18n.language === 'ar' ? 'ليالي' : 'nights'})</div>
                  <div className="text-sea text-lg">{formatCurrency(chalet.price * differenceInDays(parseISO(selectedDates.checkOut), parseISO(selectedDates.checkIn)))}</div>
                </div>
              )}

              <Button 
                variant="coral" 
                className="w-full mt-6 py-5 text-xl font-black shadow-shm hover:scale-[1.02] active:scale-95 transition-all text-white"
                onClick={() => setIsOfferModalOpen(true)}
              >
                {t('common.offer')} 💬
              </Button>
            </div>
          </div>
        </div>
      </div>

      <OfferModal 
        isOpen={isOfferModalOpen} 
        onClose={() => setIsOfferModalOpen(false)} 
        chalet={chalet} 
        initialDates={selectedDates}
      />
    </div>
  );
};
