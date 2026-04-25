import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ChaletCard } from '../components/ChaletCard';
import { Shield, Sparkles, CheckCircle, Lock, Percent, Ban, Search, Target, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { db, collection, query, where, limit, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { Chalet } from '../types';

export const HomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchPrice, setSearchPrice] = useState('');
  const [location, setLocation] = useState('Marina');
  const [featuredChalets, setFeaturedChalets] = useState<Chalet[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchPrice) params.set('maxPrice', searchPrice);
    if (location !== 'all') params.set('location', location);
    navigate(`/explore?${params.toString()}`);
  };

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'chalets'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allChalets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Chalet[];
      
      const availableChalets = allChalets.filter(c => c.status === 'available' || !c.status).slice(0, 6);
      setFeaturedChalets(availableChalets);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chalets');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 pb-32 px-4 overflow-hidden">
        {/* Background with Animated Gradient & Parallax Image */}
        <div className="absolute inset-0 z-0 bg-ink">
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80"
            alt="Serene Ocean"
            className="w-full h-full object-cover opacity-30"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/60 to-salt"></div>
          
          {/* Decorative Floating Blobs */}
          <motion.div 
            animate={{ 
              x: [0, 100, 0], 
              y: [0, -50, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/4 -left-20 w-96 h-96 bg-sea/10 rounded-full blur-[120px]"
          />
          <motion.div 
            animate={{ 
              x: [0, -100, 0], 
              y: [0, 50, 0],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-1/4 -right-20 w-96 h-96 bg-coral/10 rounded-full blur-[120px]"
          />
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10 w-full">
          <div className="flex flex-col items-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-mint"></span>
              </span>
              <span className="text-[10px] font-black tracking-[0.2em] text-white/60 uppercase">
                {i18n.language === 'ar' ? 'أكثر من ٢٤٠٠ شاليه متاح الآن' : '2,400+ Chalets Available Now'}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="flex flex-col items-center gap-2 md:gap-4 mb-8">
                <span className="text-6xl md:text-[140px] text-white font-tajawal font-black tracking-tighter leading-[0.85] drop-shadow-2xl">
                  {i18n.language === 'ar' ? 'احجز دلوقتي' : 'Book Now'}
                </span>
                <span className="text-2xl md:text-6xl text-coral font-playfair font-black italic tracking-tight drop-shadow-lg">
                  {i18n.language === 'ar' ? 'بالسعر اللي يناسبك أنت' : 'At the price that suits you'}
                </span>
              </h1>
              
              <p className="text-white/60 text-sm md:text-lg max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                {i18n.language === 'ar' 
                  ? 'أول منصة في الساحل بتخليك تتفاوض مباشرة مع مكاتب العقارات وتحدد السعر اللي يريحك.. بكل أمان ومصداقية.'
                  : 'The first platform in Sahel that lets you negotiate directly with real estate offices and set your own price.. securely and transparently.'}
              </p>
            </motion.div>
          </div>

          {/* Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className={`glass rounded-[32px] p-1 md:p-2 shadow-shl border-2 border-white/20 overflow-hidden ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}
          >
            <div className="bg-white/90 backdrop-blur-2xl rounded-[28px] p-6 md:p-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-ink-s font-black uppercase tracking-widest">{t('home.search_location')}</label>
                  <div className="relative">
                    <Search className={`absolute ${i18n.language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-sea`} size={16} />
                    <select 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className={`w-full bg-salt border border-sand-d/30 rounded-rs p-3 ${i18n.language === 'ar' ? 'pr-10' : 'pl-10'} outline-none focus:ring-2 focus:ring-sea/20 transition-all text-sm font-bold appearance-none`}
                    >
                      <option value="all">{i18n.language === 'ar' ? 'كل الساحل' : 'All Sahel'}</option>
                      <option value="Marina">{i18n.language === 'ar' ? 'مارينا' : 'Marina'}</option>
                      <option value="Hacienda">{i18n.language === 'ar' ? 'هاسيندا' : 'Hacienda'}</option>
                      <option value="Sidi Abdel Rahman">{i18n.language === 'ar' ? 'سيدي عبد الرحمن' : 'Sidi Abdel Rahman'}</option>
                      <option value="Ras El Hekma">{i18n.language === 'ar' ? 'رأس الحكمة' : 'Ras El Hekma'}</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-ink-s font-black uppercase tracking-widest">{i18n.language === 'ar' ? 'من تاريخ' : 'From Date'}</label>
                  <input type="date" className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 outline-none focus:ring-2 focus:ring-sea/20 transition-all text-sm font-bold" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-ink-s font-black uppercase tracking-widest">{i18n.language === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
                  <input type="date" className="w-full bg-salt border border-sand-d/30 rounded-rs p-3 outline-none focus:ring-2 focus:ring-sea/20 transition-all text-sm font-bold" />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch}
                    variant="coral" 
                    className="w-full h-[52px] rounded-rs flex items-center justify-center gap-2 shadow-coral/20 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Search size={20} /> <span className="font-black">{t('home.search_button')}</span>
                  </Button>
                </div>
              </div>
              
              <div className={`border-t border-sand-d/20 pt-8 flex flex-col md:flex-row items-center justify-between gap-8`}>
                <div className="flex items-center gap-4 flex-1 w-full group">
                  <div className="w-14 h-14 bg-coral/10 rounded-2xl flex items-center justify-center text-3xl shadow-inner group-hover:rotate-12 transition-transform">💰</div>
                  <div className="flex-1 relative">
                    <input 
                      type="number" 
                      placeholder={i18n.language === 'ar' ? 'عرضك المقترح...' : 'Your proposed offer...'}
                      value={searchPrice}
                      onChange={(e) => setSearchPrice(e.target.value)}
                      className="w-full bg-salt border-2 border-transparent focus:border-coral/20 rounded-rs p-5 text-4xl font-black text-coral outline-none placeholder:text-coral/20 transition-all"
                    />
                    <div className={`absolute ${i18n.language === 'ar' ? 'left-8' : 'right-8'} top-1/2 -translate-y-1/2 text-coral font-black text-xl opacity-40`}>{t('common.currency')}</div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center md:items-end gap-2">
                  <div className="flex items-center gap-3 text-ink font-playfair font-black text-xl italic">
                    <Target className="text-coral animate-pulse" size={24} /> {i18n.language === 'ar' ? 'أنت تحدد السعر' : 'You set the price'}
                  </div>
                  <p className="text-[10px] text-ink-s font-bold uppercase tracking-widest opacity-60">
                    {i18n.language === 'ar' ? 'نظام تفاوض مباشر وحصري' : 'Direct & Exclusive Negotiation'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Social Proof Ticker */}
          <div className="mt-12 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-salt to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-salt to-transparent z-10"></div>
            <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 bg-white/40 backdrop-blur-md border border-sand-d/20 px-4 py-2 rounded-full text-xs font-bold text-ink-s">
                  <span className="w-2 h-2 bg-mint rounded-full"></span>
                  {i18n.language === 'ar' 
                    ? `أحمد وفر 25% في مارينا منذ ${i * 10} دقائق` 
                    : `Ahmed saved 25% in Marina ${i * 10}m ago`}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Booking Steps Section */}
      <section className="py-24 px-4 bg-white border-b border-sand-d/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">{t('home.booking_steps_title')}</h2>
            <p className="text-ink-s max-w-2xl mx-auto">{t('home.trust.deposit_notice')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: '1', title: t('home.booking_steps.step1'), desc: t('home.booking_steps.step1_desc'), color: 'bg-sea' },
              { icon: '2', title: t('home.booking_steps.step2'), desc: t('home.booking_steps.step2_desc'), color: 'bg-lav' },
              { icon: '3', title: t('home.booking_steps.step3'), desc: t('home.booking_steps.step3_desc'), color: 'bg-coral' },
              { icon: '4', title: t('home.booking_steps.step4'), desc: t('home.booking_steps.step4_desc'), color: 'bg-mint' },
            ].map((step, i) => (
              <div key={i} className="relative p-8 rounded-r bg-salt border border-sand-d/20 hover:shadow-sh transition-all group">
                <div className={`w-10 h-10 ${step.color} text-white rounded-full flex items-center justify-center font-black mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                  {step.icon}
                </div>
                <h4 className="text-xl font-black mb-3">{step.title}</h4>
                <p className="text-sm text-ink-s leading-relaxed">{step.desc}</p>
                {i < 3 && (
                  <div className={`hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-10 text-sand-d/30 ${i18n.language === 'ar' ? 'rotate-180' : ''}`}>
                    <Target size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety Alert */}
      <section className="px-4 py-12">
        <div className="max-w-7xl mx-auto bg-gold-l border-2 border-gold/20 rounded-[24px] p-8 flex flex-col md:flex-row items-center gap-8 shadow-sh">
          <div className="bg-gold text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0 shadow-lg">🛡️</div>
          <div className="flex-1 text-center md:text-right">
            <h3 className="text-2xl font-black text-ink mb-2">{t('home.trust.is_trusted')}</h3>
            <p className="text-ink-m font-bold mb-4">{t('home.trust.check_ratings')}</p>
            <div className="flex flex-wrap justify-center md:justify-end gap-4">
              <span className="bg-white/60 px-4 py-2 rounded-full text-xs font-black text-ink-s border border-gold/10 flex items-center gap-2">
                <CheckCircle size={14} className="text-mint" /> {t('home.trust.checkin_reminder')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-ink-m py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-around gap-8 text-center">
          <div>
            <div className="text-white text-2xl font-black">2,400+</div>
            <div className="text-white/50 text-xs">{t('home.stats_chalets')}</div>
          </div>
          <div>
            <div className="text-white text-2xl font-black">340+</div>
            <div className="text-white/50 text-xs">{t('home.stats_offices')}</div>
          </div>
          <div>
            <div className="text-white text-2xl font-black">94%</div>
            <div className="text-white/50 text-xs">{t('home.stats_ai_accuracy')}</div>
          </div>
          <div>
            <div className="text-white text-2xl font-black">0%</div>
            <div className="text-white/50 text-xs">{t('home.stats_commission')}</div>
          </div>
          <div>
            <div className="text-white text-2xl font-black">0.8s</div>
            <div className="text-white/50 text-xs">{t('home.stats_match_time')}</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-salt">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl text-center font-black mb-16">{t('home.how_it_works')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
            {[
              { icon: '🎯', title: t('home.step1_title'), desc: t('home.step1_desc'), color: 'bg-coral' },
              { icon: '✦', title: t('home.step2_title'), desc: t('home.step2_desc'), color: 'bg-lav' },
              { icon: '💬', title: t('home.step3_title'), desc: t('home.step3_desc'), color: 'bg-sea' },
              { icon: '🔒', title: i18n.language === 'ar' ? 'نظام الضمان' : 'Escrow', desc: i18n.language === 'ar' ? 'ادفع بأمان، فلوسك محجوزة لحد ما تستلم' : 'Pay securely, your money is held until you check in', color: 'bg-mint' },
              { icon: '🏖️', title: i18n.language === 'ar' ? 'استمتع' : 'Enjoy', desc: i18n.language === 'ar' ? 'إجازة سعيدة في الساحل بأفضل سعر' : 'Happy vacation in the Coast at the best price', color: 'bg-gold' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <div className={`w-16 h-16 ${step.color} text-white rounded-full flex items-center justify-center text-2xl mb-4 shadow-sh group-hover:scale-110 transition-transform`}>
                  {step.icon}
                </div>
                <h4 className="font-bold mb-2">{step.title}</h4>
                <p className="text-sm text-ink-s leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-black">{t('home.featured_title')}</h2>
            <Button onClick={() => navigate('/explore')} variant="ghost">{t('home.view_all')}</Button>
          </div>
          
          {loading ? (
            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar">
              {[1, 2, 3].map(i => (
                <div key={i} className="min-w-[300px] h-80 bg-white/50 animate-pulse rounded-r border border-sand-d/20"></div>
              ))}
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-8 no-scrollbar">
              {featuredChalets.map(chalet => (
                <div key={chalet.id} className="min-w-[300px]">
                  <ChaletCard chalet={chalet} />
                </div>
              ))}
              {featuredChalets.length === 0 && (
                <div className="w-full text-center py-10 text-ink-s font-bold">
                  {i18n.language === 'ar' ? 'لا توجد شاليهات مميزة حالياً' : 'No featured chalets at the moment'}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* AI Banner */}
      <section className="px-4 mb-24">
        <div className="max-w-7xl mx-auto bg-gradient-to-r from-lav to-lav/80 rounded-[24px] p-12 text-white relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className={`${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold mb-4 inline-block">✦ {i18n.language === 'ar' ? 'محرك المطابقة الذكي' : 'AI Matching Engine'}</span>
              <h2 className="text-4xl font-black mb-4">{t('home.ai_banner_title')}</h2>
              <p className="text-white/80 max-w-xl">{t('home.ai_banner_desc')}</p>
            </div>
            <Button 
              onClick={() => navigate('/requests')}
              variant="ink" 
              size="lg" 
              className="bg-white text-lav hover:bg-salt"
            >
              {t('home.ai_banner_button')}
            </Button>
          </div>
        </div>
      </section>

      {/* Protection Banner */}
      <section className="px-4 mb-24">
        <div className="max-w-7xl mx-auto bg-mint-l border border-mint/20 rounded-[24px] p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="bg-mint text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0">🛡️</div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-mint mb-2">{t('home.protection_title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm font-bold text-red">
                <div className="w-3 h-3 bg-red rounded-full"></div> {t('home.protection_refund')}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-gold">
                <div className="w-3 h-3 bg-gold rounded-full"></div> {t('home.protection_comp')}
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-mint">
                <div className="w-3 h-3 bg-mint rounded-full"></div> {t('home.protection_alt')}
              </div>
            </div>
          </div>
          <Button variant="outline" className="border-mint text-mint hover:bg-mint-l">{t('home.protection_more')}</Button>
        </div>
      </section>
    </div>
  );
};
