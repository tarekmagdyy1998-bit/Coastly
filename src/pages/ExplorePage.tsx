import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChaletCard } from '../components/ChaletCard';
import { SahelMap } from '../components/SahelMap';
import { Button } from '../components/Button';
import { formatCurrency } from '../lib/utils';
import { Filter, SlidersHorizontal, ShieldCheck, Map as MapIcon, Grid, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { db, collection, query, where, orderBy, limit, onSnapshot, handleFirestoreError, OperationType, addDoc } from '../firebase';
import { toast } from 'sonner';
import { Chalet } from '../types';

export const ExplorePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // States derived from URL params or defaults
  const [maxPrice, setMaxPrice] = useState(100000);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('price_asc');

  // Sync state with URL params on change
  useEffect(() => {
    const price = searchParams.get('maxPrice');
    const loc = searchParams.get('location');
    const type = searchParams.get('type');
    const sort = searchParams.get('sortBy');

    if (price) setMaxPrice(parseInt(price));
    if (loc) setSelectedLocation(loc);
    if (type) setSelectedType(type);
    if (sort) setSortBy(sort);
  }, [searchParams]);

  // Update URL function
  const updateURL = (newParams: Record<string, string>) => {
    const current = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...current, ...newParams });
  };
  
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async () => {
    if (!whatsappPhone || whatsappPhone.length < 10) {
      toast.error(i18n.language === 'ar' ? 'يرجى إدخال رقم هاتف صحيح' : 'Please enter a valid phone number');
      return;
    }

    setSubscribing(true);
    try {
      await addDoc(collection(db, 'subscribers'), {
        phoneNumber: whatsappPhone,
        subscribedAt: new Date().toISOString(),
        active: true
      });
      toast.success(i18n.language === 'ar' ? 'تم الاشتراك بنجاح!' : 'Subscribed successfully!');
      setWhatsappPhone('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subscribers');
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    
    // Simplest possible query to avoid index requirements
    const q = query(
      collection(db, 'chalets'),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.warn('No chalets found in collection');
      }
      
      let fetchedChalets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Chalet[];

      // Memory Filtering
      fetchedChalets = fetchedChalets.filter(chalet => {
        // Status check (case insensitive or default to available if missing)
        const isAvailable = chalet.status === 'available' || !chalet.status;
        if (!isAvailable) return false;

        // Location check
        if (selectedLocation !== 'all') {
          const chaletLoc = (chalet.location || '').trim().toLowerCase();
          const targetLoc = selectedLocation.trim().toLowerCase();
          if (chaletLoc !== targetLoc) return false;
        }

        // Type check
        if (selectedType !== 'all' && chalet.type !== selectedType) return false;

        // Price check (hardened against NaNs or missing prices)
        const chaletPrice = Number(chalet.price) || 0;
        if (maxPrice > 0 && maxPrice < 100000 && chaletPrice > maxPrice) return false;

        return true;
      });

      // Memory Sorting
      fetchedChalets.sort((a, b) => {
        if (sortBy === 'price_asc') {
          return (Number(a.price) || 0) - (Number(b.price) || 0);
        } else if (sortBy === 'price_desc') {
          return (Number(b.price) || 0) - (Number(a.price) || 0);
        } else {
          // Newest first (createdAt)
          const parseDate = (val: any) => {
            if (!val) return 0;
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            if (val instanceof Date) return val.getTime();
            return new Date(val).getTime() || 0;
          };
          return parseDate(b.createdAt) - parseDate(a.createdAt);
        }
      });

      setChalets(fetchedChalets);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error:', error);
      setLoading(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'chalets');
      } catch (e) {
        // Error already logged
      }
    });

    return () => unsubscribe();
  }, [maxPrice, selectedLocation, selectedType, sortBy, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-tajawal font-black text-ink mb-4">
          {i18n.language === 'ar' ? 'استكشف الساحل' : 'Explore the Coast'}
        </h1>
        <p className="text-ink-s font-playfair italic text-lg">
          {i18n.language === 'ar' ? 'أفضل الشاليهات بأسعارك الخاصة' : 'The best chalets at your own prices'}
        </p>
      </div>

      {/* Security Strip */}
      <div className="glass border border-mint/20 rounded-r p-4 mb-12 flex items-center justify-between gap-3 text-mint font-bold text-sm shadow-sh">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} />
          {t('common.escrow_protected')}
        </div>
        <div className="flex bg-white/50 p-1 rounded-full border border-mint/10">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-mint text-white shadow-sm' : 'text-mint/60 hover:text-mint'}`}
          >
            <Grid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-full transition-all ${viewMode === 'map' ? 'bg-mint text-white shadow-sm' : 'text-mint/60 hover:text-mint'}`}
          >
            <MapIcon size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-72 shrink-0 space-y-8">
          <div className="glass border border-white/40 rounded-r p-6 shadow-sh space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Filter size={20} className="text-sea" /> {t('explore.filters')}
              </h2>
              <button 
                onClick={() => {
                  setMaxPrice(25000);
                  setSelectedLocation('all');
                }}
                className="text-sea text-xs font-bold hover:underline"
              >
                {t('explore.clear_all')}
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-ink-s">{t('explore.unit_type')}</h4>
              <div className="flex flex-wrap gap-2">
                {['all', 'chalet', 'villa', 'apartment', 'cabin'].map(typeKey => (
                  <button 
                    key={typeKey} 
                    onClick={() => {
                      setSelectedType(typeKey);
                      updateURL({ type: typeKey });
                    }}
                    className={`px-4 py-2 rounded-rs text-xs font-bold transition-all ${selectedType === typeKey ? 'bg-sea text-white shadow-sh' : 'bg-white/50 text-ink-s border border-white/20 hover:border-sea'}`}
                  >
                    {t(`explore.types.${typeKey}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-ink-s">{t('explore.location')}</h4>
              <select 
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  updateURL({ location: e.target.value });
                }}
                className="w-full bg-white/50 border border-white/20 rounded-rs p-3 text-sm font-bold outline-none focus:bg-white focus:border-sea transition-all"
              >
                <option value="all">{t('explore.types.all')}</option>
                <option value="Marina">{i18n.language === 'ar' ? 'مارينا' : 'Marina'}</option>
                <option value="Hacienda">{i18n.language === 'ar' ? 'هاسيندا' : 'Hacienda'}</option>
                <option value="Sidi Abdel Rahman">{i18n.language === 'ar' ? 'سيدي عبد الرحمن' : 'Sidi Abdel Rahman'}</option>
                <option value="Ras El Hekma">{i18n.language === 'ar' ? 'رأس الحكمة' : 'Ras El Hekma'}</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs uppercase tracking-widest text-ink-s">{t('explore.max_price')}</h4>
                <span className="text-coral font-black text-sm">{maxPrice} {t('common.currency')}</span>
              </div>
              <input 
                type="range" 
                min="500" 
                max="100000" 
                step="500"
                value={maxPrice}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setMaxPrice(val);
                  updateURL({ maxPrice: val.toString() });
                }}
                className="w-full accent-coral h-1 bg-sand-d rounded-full appearance-none cursor-pointer" 
              />
              <div className="flex justify-between text-[10px] text-ink-s font-bold">
                <span>500 {t('common.currency')}</span>
                <span>100,000 {t('common.currency')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-ink-s">{t('explore.features')}</h4>
              <div className="grid grid-cols-2 gap-3">
                {['🏊 Pool', '🌊 بحر', '🏕️ شاطئ', '🅿️ جراج', '❄️ A/C', '🌿 حديقة'].map(f => (
                  <label key={f} className="flex items-center gap-2 text-xs cursor-pointer group font-bold">
                    <input type="checkbox" className="accent-sea w-4 h-4 rounded-rxs" />
                    <span className="group-hover:text-sea transition-colors">{f}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <Button variant="sea" className="w-full py-4 shadow-sh font-black">{t('explore.apply_filters')}</Button>
            </div>

            {/* WhatsApp Subscription */}
            <div className="pt-8 border-t border-sand-d/20">
              <div className="bg-mint/10 border border-mint/20 rounded-r p-5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3 text-mint">
                  <div className="w-8 h-8 bg-mint text-white rounded-full flex items-center justify-center shadow-sm">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <h4 className="font-black text-sm uppercase tracking-wider">
                    {i18n.language === 'ar' ? 'تنبيهات واتساب' : 'WhatsApp Alerts'}
                  </h4>
                </div>
                <p className="text-[10px] text-ink-s font-bold leading-relaxed">
                  {i18n.language === 'ar' 
                    ? 'اشترك ليوصلك كل شاليه جديد أو عرض خاص فوراً على واتساب!' 
                    : 'Subscribe to get new chalets and special offers instantly on WhatsApp!'}
                </p>
                <div className="space-y-2">
                  <input 
                    type="tel" 
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder={i18n.language === 'ar' ? 'رقم الموبايل (مثال: 010...)' : 'Phone Number (e.g. 010...)'}
                    className="w-full bg-white border border-mint/20 rounded-rs p-3 text-xs font-bold outline-none focus:border-mint transition-all"
                  />
                  <Button 
                    variant="mint" 
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="w-full py-3 text-xs font-black shadow-sm"
                  >
                    {subscribing ? (i18n.language === 'ar' ? 'جاري الاشتراك...' : 'Subscribing...') : (i18n.language === 'ar' ? 'اشترك الآن' : 'Subscribe Now')}
                  </Button>
                </div>
                <p className="text-[9px] text-mint/60 text-center font-bold">
                  {i18n.language === 'ar' ? 'خدمة مجانية 100% وآمنة' : '100% Free & Secure Service'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Listings Grid / Map */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Map Preview Section */}
                <div className="relative h-48 md:h-64 rounded-r overflow-hidden border-2 border-sea/10 shadow-sh group cursor-pointer" onClick={() => setViewMode('map')}>
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-ink/60 to-transparent pointer-events-none group-hover:from-ink/40 transition-all"></div>
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                    <SahelMap chalets={chalets} />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between">
                    <div className="text-white">
                      <h3 className="font-black text-lg md:text-xl drop-shadow-md">
                        {i18n.language === 'ar' ? 'استكشف الخريطة' : 'Explore the Map'}
                      </h3>
                      <p className="text-xs text-white/80 drop-shadow-md">
                        {i18n.language === 'ar' ? 'شاهد مواقع الشاليهات بدقة على الساحل' : 'See chalet locations accurately on the coast'}
                      </p>
                    </div>
                    <Button variant="coral" size="sm" className="shadow-lg group-hover:scale-105 transition-transform">
                      <MapIcon size={16} /> {i18n.language === 'ar' ? 'فتح الخريطة' : 'Open Map'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-ink-s text-sm">{t('explore.showing')} <span className="font-bold text-ink">{chalets.length}</span> {t('explore.available')}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-s">{t('explore.sort_by')}</span>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white border border-sand-d/30 rounded-rs p-2 text-xs outline-none focus:border-sea"
                    >
                      <option value="price_asc">{t('explore.sort_options.cheapest')}</option>
                      <option value="price_desc">{i18n.language === 'ar' ? 'الأغلى أولاً' : 'Most Expensive'}</option>
                      <option value="newest">{i18n.language === 'ar' ? 'الأحدث' : 'Newest'}</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-80 bg-white/50 animate-pulse rounded-r border border-sand-d/20"></div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {chalets.map(chalet => (
                      <ChaletCard key={chalet.id} chalet={chalet} />
                    ))}
                  </div>
                )}

                {!loading && chalets.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-r border border-sand-d/20 px-6">
                    <div className="w-20 h-20 bg-salt rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search size={32} className="text-sand-d" />
                    </div>
                    <h3 className="text-xl font-black mb-2">
                      {i18n.language === 'ar' ? 'لم نجد نتائج تطابق بحثك' : 'No results matching your search'}
                    </h3>
                    <p className="text-ink-s text-sm mb-8 max-w-sm mx-auto font-bold leading-relaxed">
                      {i18n.language === 'ar' 
                        ? 'جرب تقليل الفلاتر أو تغيير المنطقة، ممكن تلاقي اللي بتدور عليه بسعر مختلف شوية.' 
                        : 'Try reducing filters or changing the location, you might find what you want at a slightly different price.'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Button 
                        variant="ink" 
                        onClick={() => {
                          setMaxPrice(100000);
                          setSelectedLocation('all');
                          setSelectedType('all');
                          updateURL({ maxPrice: '100000', location: 'all', type: 'all' });
                        }}
                      >
                        {i18n.language === 'ar' ? 'إزالة كل الفلاتر وقائمة الكل' : 'Clear All Filters & Show All'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate('/requests')}
                      >
                        {i18n.language === 'ar' ? 'اطلب شاليه بمواصفات خاصة' : 'Request Custom Chalet'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-12 flex justify-center">
                  <Button variant="outline" className="px-12">{t('explore.load_more')}</Button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="map"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-[700px] relative rounded-r overflow-hidden border-2 border-sea/20 shadow-shl"
              >
                <SahelMap chalets={chalets} onRefresh={handleRefresh} />

                <div className={`absolute top-6 ${i18n.language === 'ar' ? 'left-6' : 'right-6'} z-[1000]`}>
                  <Button 
                    variant="ink" 
                    size="sm" 
                    onClick={() => setViewMode('grid')}
                    className="flex items-center gap-2 shadow-shm"
                  >
                    <Grid size={16} /> {i18n.language === 'ar' ? 'العودة للقائمة' : 'Back to List'}
                  </Button>
                </div>

                <div className={`absolute bottom-6 ${i18n.language === 'ar' ? 'right-6' : 'left-6'} glass p-6 rounded-r max-w-xs z-[1000] border border-white/40 shadow-shl`}>
                  <h4 className="font-black text-sm mb-2 text-sea uppercase tracking-wider">{t('explore.map_title')}</h4>
                  <p className="text-xs text-ink-s leading-relaxed font-bold">{t('explore.map_desc')}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
