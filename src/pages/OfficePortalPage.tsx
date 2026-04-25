import { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Home, Share2, Plus, CheckCircle2, AlertTriangle, Shield, TrendingUp, Eye, Copy, Calendar, MessageSquare, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Chalet, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { AddChaletModal } from '../components/AddChaletModal';
import { CalendarManageModal } from '../components/CalendarManageModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

export const OfficePortalPage = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, updateProfile } = useAuth();
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [editingChalet, setEditingChalet] = useState<Chalet | null>(null);
  const [managingChalet, setManagingChalet] = useState<Chalet | null>(null);
  const [showProfitBreakdown, setShowProfitBreakdown] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (profile?.role !== 'office' && profile?.role !== 'admin')) {
      setChalets([]);
      setLoading(false);
      return;
    }

    const q = profile?.role === 'admin' 
      ? query(collection(db, 'chalets'))
      : query(collection(db, 'chalets'), where('officeId', '==', user.uid));

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
  }, [user, profile]);

  const handleShare = () => {
    if (!user) return;
    const url = `${window.location.origin}/office/${user.uid}`;
    navigator.clipboard.writeText(url);
    toast.success(t('office.link_copied'));
  };

  const handleEdit = (chalet: Chalet) => {
    setEditingChalet(chalet);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (chaletId: string) => {
    try {
      await deleteDoc(doc(db, 'chalets', chaletId));
      toast.success(i18n.language === 'ar' ? 'تم حذف الشاليه بنجاح' : 'Chalet deleted successfully');
    } catch (error) {
      console.error('Error deleting chalet:', error);
      toast.error(i18n.language === 'ar' ? 'حدث خطأ أثناء حذف الشاليه' : 'Error deleting chalet');
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingChalet(null);
  };

  const [checkoutSoonCount, setCheckoutSoonCount] = useState(0);

  useEffect(() => {
    if (!user || (profile?.role !== 'office' && profile?.role !== 'admin')) return;

    const q = profile?.role === 'admin'
      ? query(collection(db, 'negotiations'), where('status', '==', 'agreed'))
      : query(collection(db, 'negotiations'), where('officeId', '==', user.uid), where('status', '==', 'agreed'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const count = snapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.checkOut) return false;
        const checkOut = new Date(data.checkOut);
        checkOut.setHours(0, 0, 0, 0);
        const diffTime = checkOut.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
      }).length;
      
      setCheckoutSoonCount(count);
    });

    return () => unsubscribe();
  }, [user, profile]);

  if (profile?.role !== 'office' && profile?.role !== 'admin' && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black mb-4">{t('office.not_authorized')}</h2>
        <p className="text-ink-s mb-8">{t('office.not_authorized_desc')}</p>
        <Button 
          variant="sea" 
          onClick={() => updateProfile({ role: 'office' })}
          className="mx-auto"
        >
          {i18n.language === 'ar' ? 'التحويل لرتبة مكتب (للتجربة)' : 'Switch to Office Role (For Testing)'}
        </Button>
      </div>
    );
  }

  const totalRevenue = 145000;
  const platformFees = 0;
  const netProfit = totalRevenue;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Office Hero Bar */}
      <div className="bg-gradient-to-r from-sea to-sea-l rounded-r p-8 text-white mb-6 shadow-shm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">🏢</div>
          <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-black">{profile?.name || (i18n.language === 'ar' ? 'مكتب الساحل العقاري' : 'Coastly Real Estate Office')}</h1>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">✓ {t('office.verified')}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-white/80">
              <span>📍 {i18n.language === 'ar' ? 'مارينا، الساحل الشمالي' : 'Marina, North Coast'}</span>
              <span>•</span>
              <span>{chalets.length} {t('office.units_registered')}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-gold-l">⭐ ٤.٩ (١٢٠ {t('office.reviews')})</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to={`/office/${user?.uid}`}>
            <Button variant="outline" className="border-white text-white hover:bg-white/10 flex items-center gap-2">
               <Eye size={16} /> {t('office.view_profile')}
            </Button>
          </Link>
          <Button variant="outline" onClick={handleShare} className="border-white text-white hover:bg-white/10 flex items-center gap-2">
            <Copy size={16} /> {t('office.copy_link')}
          </Button>
          <Link to="/office/bookings">
            <Button 
              variant="ink" 
              className="bg-mint text-white hover:bg-mint-d flex items-center gap-2"
            >
              <Calendar size={16} /> {i18n.language === 'ar' ? 'تنظيم الحجوزات' : 'Bookings Organization'}
            </Button>
          </Link>
          <Button 
            variant="ink" 
            className="bg-white text-sea hover:bg-salt flex items-center gap-2"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={16} /> {t('office.add_chalet')}
          </Button>
        </div>
      </div>

      {checkoutSoonCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-coral-l/30 border border-coral/20 p-4 rounded-r mb-12 flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-coral text-white rounded-full flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
              <h3 className="font-black text-coral">
                {i18n.language === 'ar' ? 'تنبيه تسليم شاليهات' : 'Chalet Checkout Alert'}
              </h3>
              <p className="text-xs text-ink-s font-bold">
                {i18n.language === 'ar' 
                  ? `لديك ${checkoutSoonCount} حجز ينتهي غداً. يرجى التنسيق لاستلام الشاليهات.` 
                  : `You have ${checkoutSoonCount} bookings ending tomorrow. Please coordinate to receive the chalets.`}
              </p>
            </div>
          </div>
          <Link to="/office/bookings?filter=checkout-soon">
            <Button variant="ink" className="bg-coral text-white hover:bg-coral-d">
              {i18n.language === 'ar' ? 'عرض الحجوزات' : 'View Bookings'}
            </Button>
          </Link>
        </motion.div>
      )}

      <AddChaletModal 
        isOpen={isAddModalOpen} 
        onClose={handleCloseModal} 
        initialData={editingChalet}
      />

      {isCalendarModalOpen && managingChalet && (
        <CalendarManageModal 
          isOpen={isCalendarModalOpen}
          onClose={() => {
            setIsCalendarModalOpen(false);
            setManagingChalet(null);
          }}
          chalet={managingChalet}
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title={i18n.language === 'ar' ? 'حذف الشاليه' : 'Delete Chalet'}
        message={i18n.language === 'ar' ? 'هل أنت متأكد من حذف هذا الشاليه؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this chalet? This action cannot be undone.'}
        confirmText={i18n.language === 'ar' ? 'حذف' : 'Delete'}
      />

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="md:col-span-2 md:row-span-2 bg-white p-8 rounded-r shadow-sh border border-sand-d/20 flex flex-col justify-between relative overflow-hidden group">
          <div className={`absolute top-0 ${i18n.language === 'ar' ? 'right-0 -mr-16' : 'left-0 -ml-16'} w-32 h-32 bg-sea/5 rounded-full -mt-16 transition-transform group-hover:scale-110`}></div>
          <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
            <div className="flex justify-between items-start mb-2">
              <div className="text-ink-s text-xs font-bold uppercase tracking-wider">{t('office.total_earnings')}</div>
              <button 
                onClick={() => setShowProfitBreakdown(!showProfitBreakdown)}
                className="text-sea text-[10px] font-bold hover:underline"
              >
                {t('office.profit_breakdown')}
              </button>
            </div>
            <div className="text-4xl font-black text-sea mb-4">{formatCurrency(netProfit)}</div>
            
            <AnimatePresence>
              {showProfitBreakdown && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 mb-4 bg-salt/50 p-3 rounded-rs border border-sand-d/10"
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-s">{t('office.total_revenue')}</span>
                    <span className="font-bold">{formatCurrency(totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-s">{t('office.platform_fees')} (٠٪)</span>
                    <span className="font-bold text-mint">{formatCurrency(platformFees)}</span>
                  </div>
                  <div className="pt-2 border-t border-sand-d/20 flex justify-between text-xs font-black">
                    <span>{t('office.net_profit')}</span>
                    <span className="text-sea">{formatCurrency(netProfit)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 text-mint text-xs font-bold">
              <TrendingUp size={14} /> +١٢٪ {t('office.vs_last_month')}
            </div>
          </div>
          <div className="mt-8">
            <Button variant="sea" className="w-full">{t('office.download_report')}</Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-r shadow-sh border border-sand-d/20 flex flex-col justify-center text-center">
          <div className="text-2xl font-black text-ink mb-1">{chalets.length}</div>
          <div className="text-[10px] text-ink-s font-bold">{t('office.units_registered')}</div>
        </div>

        <div className="bg-white p-6 rounded-r shadow-sh border border-sand-d/20 flex flex-col justify-center text-center">
          <div className="text-2xl font-black text-coral mb-1">٨٥٪</div>
          <div className="text-[10px] text-ink-s font-bold">{t('office.occupancy_rate')}</div>
        </div>

        <div className="bg-white p-6 rounded-r shadow-sh border border-sand-d/20 flex flex-col justify-center text-center">
          <div className="text-2xl font-black text-mint mb-1">٧</div>
          <div className="text-[10px] text-ink-s font-bold">{t('office.active_offers')}</div>
        </div>

        <div className="bg-white p-6 rounded-r shadow-sh border border-sand-d/20 flex flex-col justify-center text-center">
          <div className="text-2xl font-black text-gold mb-1">٤.٩</div>
          <div className="text-[10px] text-ink-s font-bold">{t('office.office_rating')}</div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          {/* Recent Activity / Work Organization */}
          <div className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden">
            <div className="bg-salt p-4 border-b border-sand-d/20 flex justify-between items-center">
              <h3 className="font-black flex items-center gap-2 text-sm">
                <Calendar size={18} className="text-sea" /> {t('office.recent_activity')}
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {[
                { type: 'checkin', chalet: 'Marina 7 - Unit A', time: 'Today, 2:00 PM', user: 'Ahmed M.' },
                { type: 'message', chalet: 'Hacienda Bay Villa', time: '2 hours ago', user: 'Sara K.' },
                { type: 'offer', chalet: 'Marassi North', time: '5 hours ago', user: 'Omar T.' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-rs hover:bg-salt/50 transition-colors border border-transparent hover:border-sand-d/10">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'checkin' ? 'bg-mint-l text-mint' : 
                      activity.type === 'message' ? 'bg-sea-p text-sea' : 'bg-coral-l text-coral'
                    }`}>
                      {activity.type === 'checkin' ? <ArrowUpRight size={18} /> : 
                       activity.type === 'message' ? <MessageSquare size={18} /> : <TrendingUp size={18} />}
                    </div>
                    <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                      <div className="text-sm font-bold">{activity.chalet}</div>
                      <div className="text-[10px] text-ink-s">{activity.user} • {activity.time}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-[10px]">{i18n.language === 'ar' ? 'عرض' : 'View'}</Button>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Section */}
          <div className="glass p-6 rounded-r border-mint/20 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-mint-l rounded-full flex items-center justify-center text-mint">
                <Shield size={24} />
              </div>
              <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                <h3 className="font-black text-sm">{t('office.verification_title')}</h3>
                <p className="text-xs text-ink-s">{t('office.verification_desc')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-mint text-mint hover:bg-mint-l">{t('office.start_verification')}</Button>
          </div>
          
          <div className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden">
            <div className="bg-sea-p p-4 border-b border-sea-ll/20 flex justify-between items-center">
              <h3 className="font-black flex items-center gap-2">
                <Home size={18} className="text-sea" /> {i18n.language === 'ar' ? 'وحداتك المسجلة' : 'Your Registered Units'} ({chalets.length})
              </h3>
            </div>
            <div className="divide-y divide-sand-d/10">
              {loading ? (
                <div className="p-8 text-center text-ink-s">{t('common.loading')}</div>
              ) : chalets.length > 0 ? (
                chalets.map(chalet => (
                  <div key={chalet.id} className="p-4 flex flex-col md:flex-row justify-between gap-4 hover:bg-salt/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{chalet.type === 'فيلا' ? '🏡' : '🏖️'}</span>
                      <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                        <h4 className="font-bold text-sm">{chalet.name}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] text-ink-s bg-salt px-2 py-0.5 rounded-rxs border border-sand-d/20">{chalet.rooms} {t('common.rooms')}</span>
                          <span className="text-[10px] text-ink-s bg-salt px-2 py-0.5 rounded-rxs border border-sand-d/20">{chalet.location}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-[10px] text-ink-s mb-1">{t('office.status')}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${chalet.status === 'available' ? 'bg-mint-l text-mint' : 'bg-red-l text-red'}`}>
                          {chalet.status === 'available' ? t('office.available') : t('office.unavailable')}
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-ink-s mb-1">{t('office.compliance')}</div>
                        <span className="text-mint flex items-center gap-1 text-[10px] font-bold">
                          <CheckCircle2 size={12} /> {t('office.committed')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleEdit(chalet)}>{t('office.edit')}</Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setManagingChalet(chalet);
                            setIsCalendarModalOpen(true);
                          }}
                        >
                          {t('office.calendar')}
                        </Button>
                        <Button variant="outline" size="sm" className="text-coral border-coral hover:bg-coral-l" onClick={() => setDeleteConfirmId(chalet.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-ink-s">{i18n.language === 'ar' ? 'لا توجد وحدات مسجلة' : 'No units registered yet'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 space-y-8">
          {/* Compliance Ring */}
          <div className="bg-white rounded-r p-6 shadow-sh border border-sand-d/20 text-center">
            <h3 className="font-black mb-6">{t('office.compliance_system')}</h3>
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-8 border-salt"></div>
              <div className="absolute inset-0 rounded-full border-8 border-mint border-t-transparent -rotate-45"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-ink">٩٢٪</span>
                <span className="text-[10px] text-mint font-bold">{t('office.excellent')} ⭐</span>
              </div>
            </div>
            <div className={`space-y-3 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              {[
                { label: t('office.metrics.photos'), status: 'pass' },
                { label: t('office.metrics.cleanliness'), status: 'pass' },
                { label: t('office.metrics.response'), status: 'warn' },
                { label: t('office.metrics.availability'), status: 'pass' },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-ink-s">{m.label}</span>
                  {m.status === 'pass' ? (
                    <span className="text-mint font-bold flex items-center gap-1"><CheckCircle2 size={12} /> {t('office.excellent')}</span>
                  ) : (
                    <span className="text-gold font-bold flex items-center gap-1"><AlertTriangle size={12} /> {t('office.needs_improvement')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Escrow Table */}
          <div className="bg-white rounded-r p-6 shadow-sh border border-sand-d/20">
            <h3 className="font-black mb-4 flex items-center justify-between">
              {t('office.escrow_table')}
              <Button variant="ghost" size="sm" className="text-[10px]">{t('office.withdraw')}</Button>
            </h3>
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className={`text-xs border-b border-sand-d/10 pb-3 last:border-0 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{i18n.language === 'ar' ? 'شاليه مارينا' : 'Marina Chalet'} {i}</span>
                    <span className="text-mint font-bold">{formatCurrency(12000)}</span>
                  </div>
                  <div className="flex justify-between text-ink-s text-[10px]">
                    <span>{t('office.commission')}: ٠ {t('common.currency')}</span>
                    <span className="text-gold font-bold">{t('office.pending')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
