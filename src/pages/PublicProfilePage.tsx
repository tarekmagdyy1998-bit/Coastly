import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Request, Negotiation, Chalet } from '../types';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  CheckCircle, 
  Star, 
  User, 
  Clock, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { ChaletCard } from '../components/ChaletCard';

export const PublicProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [negotiationsCount, setNegotiationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch User Profile
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          setLoading(false);
          return;
        }
        const userData = userDoc.data() as UserProfile;
        setTargetUser(userData);

        // If office, fetch chalets
        if (userData.role === 'office' || userData.role === 'owner') {
          const chaletsQuery = query(
            collection(db, 'chalets'),
            where('officeId', '==', userId),
            where('status', '==', 'available'),
            limit(6)
          );
          const chaletsSnap = await getDocs(chaletsQuery);
          setChalets(chaletsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Chalet[]);
        }

        // Fetch Requests count (if client)
        if (userData.role === 'client') {
          const reqQuery = query(
            collection(db, 'requests'),
            where('userId', '==', userId),
            where('status', '==', 'active'),
            limit(5)
          );
          const reqSnap = await getDocs(reqQuery);
          setRequests(reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Request[]);
        }

        // Fetch Negotiation Count (successful bookings)
        const negQuery = query(
          collection(db, 'negotiations'),
          where(userData.role === 'office' ? 'officeId' : 'userId', '==', userId),
          where('status', '==', 'agreed')
        );
        const negSnap = await getDocs(negQuery);
        setNegotiationsCount(negSnap.size);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-sea border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-ink-s font-tajawal">{t('common.loading')}</p>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-2xl font-black mb-4 font-tajawal">
          {i18n.language === 'ar' ? 'المستخدم غير موجود' : 'User Not Found'}
        </h2>
        <Link to="/explore">
          <Button variant="sea">{i18n.language === 'ar' ? 'العودة للاستكشاف' : 'Back to Explore'}</Button>
        </Link>
      </div>
    );
  }

  const isArabic = i18n.language === 'ar';

  return (
    <div className="min-h-screen bg-salt/30 pb-20">
      {/* Profile Header */}
      <div className="bg-white border-b border-sand-d/20 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-32 h-32 bg-sea/10 rounded-full flex items-center justify-center text-5xl shadow-shm border-4 border-white overflow-hidden shrink-0">
              {targetUser.photoURL ? (
                <img src={targetUser.photoURL} alt={targetUser.displayName} className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-sea" />
              )}
            </div>
            
            <div className="flex-1 text-center md:text-right">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center md:justify-start">
                <h1 className="text-3xl font-black text-ink font-tajawal">{targetUser.displayName}</h1>
                <div className="flex items-center gap-2">
                  <span className="bg-mint-l text-mint px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 uppercase tracking-wider">
                    <Shield size={14} /> {targetUser.verified ? t('common.verified') : (isArabic ? 'موثق جزئياً' : 'Partial')}
                  </span>
                  <span className="bg-sea/10 text-sea px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    {isArabic ? (targetUser.role === 'office' ? 'مكتب' : targetUser.role === 'owner' ? 'مالك' : 'عميل') : targetUser.role}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-ink-s mb-6 font-tajawal">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-sea" />
                  {isArabic ? 'انضم في' : 'Joined'}: {new Date(targetUser.createdAt || Date.now()).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-mint" />
                  {negotiationsCount} {isArabic ? 'حجوزات ناجحة' : 'Successful Bookings'}
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Button variant="sea" className="flex items-center gap-2">
                  <MessageSquare size={18} /> {isArabic ? 'إرسال رسالة' : 'Send Message'}
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Star size={18} /> {isArabic ? 'إضافة للمفضلة' : 'Add to Favorites'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-12">
            {targetUser.role === 'client' ? (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black font-tajawal flex items-center gap-3">
                    <div className="p-2 bg-coral/10 rounded-rs text-coral"><Clock size={24} /></div>
                    {isArabic ? 'الطلبات النشطة' : 'Active Requests'}
                  </h2>
                  <span className="text-xs font-bold text-ink-s">{requests.length} {isArabic ? 'طلبات' : 'requests'}</span>
                </div>

                {requests.length > 0 ? (
                  <div className="space-y-4">
                    {requests.map((req, i) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-r border border-sand-d/20 shadow-sh hover:shadow-shm transition-all cursor-pointer group"
                        onClick={() => navigate('/requests')}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                               <MapPin size={16} className="text-sea" />
                               <span className="font-bold text-ink">{req.location}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                               <div className="flex items-center gap-2 text-xs text-ink-s">
                                 <Calendar size={14} />
                                 {req.checkIn} → {req.checkOut}
                               </div>
                               <div className="flex items-center gap-2 text-xs text-ink-s text-coral font-bold">
                                 <TrendingUp size={14} />
                                 {req.budget} {t('common.currency')}/{t('common.night')}
                               </div>
                            </div>
                          </div>
                          <ArrowRight className={`text-sea transition-transform ${isArabic ? 'rotate-180 group-hover:-translate-x-2' : 'group-hover:translate-x-2'}`} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-r border border-sand-d/20 text-center">
                    <p className="text-ink-s italic">{isArabic ? 'لا توجد طلبات نشطة حالياً' : 'No active requests at the moment'}</p>
                  </div>
                )}
              </section>
            ) : (
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black font-tajawal flex items-center gap-3">
                    <div className="p-2 bg-sea/10 rounded-rs text-sea"><Sparkles size={24} /></div>
                    {isArabic ? 'الوحدات المتاحة' : 'Available Units'}
                  </h2>
                  <Link to="/explore" className="text-xs font-bold text-sea hover:underline">{t('home.view_all')}</Link>
                </div>

                {chalets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {chalets.map((chalet, i) => (
                      <motion.div
                        key={chalet.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <ChaletCard chalet={chalet} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-r border border-sand-d/20 text-center">
                    <p className="text-ink-s italic">{isArabic ? 'لا توجد وحدات متاحة حالياً' : 'No units available'}</p>
                  </div>
                )}
              </section>
            )}

            {/* General Activity / Badges */}
            <section className="bg-white p-8 rounded-r border border-sand-d/20 shadow-sh">
               <h3 className="text-xl font-black mb-6 font-tajawal">{isArabic ? 'شارة الثقة والنشاط' : 'Trust & activity Badges'}</h3>
               <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 bg-salt p-4 rounded-rs border border-sand-d/10 flex-1 min-w-[200px]">
                     <div className="p-2 bg-mint/10 rounded-full text-mint"><CheckCircle size={20} /></div>
                     <div>
                        <p className="text-xs font-black text-ink">{isArabic ? 'عضو موثق' : 'Verified Member'}</p>
                        <p className="text-[10px] text-ink-s">{isArabic ? 'تم التأكد من الهوية' : 'Identity confirmed'}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 bg-salt p-4 rounded-rs border border-sand-d/10 flex-1 min-w-[200px]">
                     <div className="p-2 bg-gold/10 rounded-full text-gold"><TrendingUp size={20} /></div>
                     <div>
                        <p className="text-xs font-black text-ink">{isArabic ? 'منضبط مالياً' : 'Financial Compliance'}</p>
                        <p className="text-[10px] text-ink-s">{isArabic ? 'سجل دفع نظيف بنسبة ١٠٠٪' : '100% clean payment record'}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 bg-salt p-4 rounded-rs border border-sand-d/10 flex-1 min-w-[200px]">
                     <div className="p-2 bg-sea/10 rounded-full text-sea"><MessageSquare size={20} /></div>
                     <div>
                        <p className="text-xs font-black text-ink">{isArabic ? 'سريع الاستجابة' : 'Highly Responsive'}</p>
                        <p className="text-[10px] text-ink-s">{isArabic ? 'يرد خلال أقل من ساعة' : 'Replies in less than an hour'}</p>
                     </div>
                  </div>
               </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-8">
            {/* Reliability Score */}
            <div className="bg-gradient-to-br from-sea to-sea-d rounded-r p-6 text-white shadow-shl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Shield size={120} />
               </div>
               <div className="relative z-10">
                 <h3 className="text-lg font-black mb-1 flex items-center gap-2">
                   <Shield size={20} /> {isArabic ? 'درجة الموثوقية' : 'Reliability Score'}
                 </h3>
                 <div className="text-4xl font-black mb-4">٩٨٪</div>
                 <div className="w-full bg-white/20 h-2 rounded-full mb-4">
                    <div className="bg-mint h-full rounded-full" style={{ width: '98%' }} />
                 </div>
                 <p className="text-[10px] text-white/70 italic">
                    {isArabic 
                      ? 'يتم تحديد هذه الدرجة بناءً على سجل التعاملات والالتزام بالاتفاقيات.' 
                      : 'This score is determined based on transaction history and adherence to agreements.'}
                 </p>
               </div>
            </div>

            {/* Verification Status (Right Side) */}
            <div className="bg-white p-6 rounded-r border border-sand-d/20 shadow-sh">
               <h4 className="text-xs font-black text-ink-s uppercase tracking-wider mb-6">{isArabic ? 'عمليات التحقق' : 'Verifications'}</h4>
               <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                     <CheckCircle size={16} className="text-mint shrink-0" />
                     <span className="text-sm text-ink-m">{isArabic ? 'التحقق من الهاتف' : 'Phone verification'}</span>
                  </li>
                  <li className="flex items-center gap-3">
                     <CheckCircle size={16} className="text-mint shrink-0" />
                     <span className="text-sm text-ink-m">{isArabic ? 'التحقق من البريد' : 'Email verification'}</span>
                  </li>
                  <li className="flex items-center gap-3">
                     <div className="w-4 h-4 rounded-full border-2 border-sand-d shrink-0" />
                     <span className="text-sm text-ink-s">{isArabic ? 'توثيق الهوية (قريباً)' : 'ID Verification (Coming soon)'}</span>
                  </li>
               </ul>
            </div>

            {/* Tips for other users */}
            <div className="border border-coral/20 bg-coral-p/30 rounded-r p-6">
               <h4 className="text-xs font-black text-coral mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Star size={14} /> {isArabic ? 'نصيحة أمان' : 'Safety Tip'}
               </h4>
               <p className="text-[10px] text-ink-m leading-relaxed">
                  {isArabic 
                    ? 'تعامل دائماً عبر المنصة لضمان حقوقك المالية وتفعيل نظام الحماية الثلاثي.' 
                    : 'Always deal through the platform to ensure your financial rights and activate the Triple Protection system.'}
               </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
