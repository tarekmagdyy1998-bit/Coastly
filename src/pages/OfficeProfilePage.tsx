import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Chalet, UserProfile } from '../types';
import { ChaletCard } from '../components/ChaletCard';
import { useTranslation } from 'react-i18next';
import { MapPin, Shield, Star, Phone, MessageSquare, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { toast } from 'sonner';

export const OfficeProfilePage = () => {
  const { officeId } = useParams<{ officeId: string }>();
  const { t, i18n } = useTranslation();
  const [office, setOffice] = useState<UserProfile | null>(null);
  const [chalets, setChalets] = useState<Chalet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!officeId) return;

    // Fetch Office Profile
    const fetchOffice = async () => {
      try {
        const docRef = doc(db, 'users', officeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOffice(docSnap.data() as UserProfile);
        }
      } catch (error) {
        // This is expected if the visitor is not an admin or the owner
        console.warn('Profile access restricted, will fallback to chalet data');
      }
    };

    fetchOffice();

    // Fetch Office Chalets
    const q = query(
      collection(db, 'chalets'),
      where('officeId', '==', officeId),
      where('status', '==', 'available')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChalets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as object)
      })) as Chalet[];
      setChalets(fetchedChalets);
      
      // Fallback office name if profile fetch failed
      if (!office && fetchedChalets.length > 0) {
        setOffice({
          uid: officeId,
          displayName: fetchedChalets[0].office || 'Office',
          email: '',
          role: 'office',
          photoURL: '',
          phoneNumber: '',
          createdAt: ''
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chalets');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [officeId]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success(t('office.link_copied'));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-sea border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-ink-s">{t('common.loading')}</p>
      </div>
    );
  }

  if (!office) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black mb-4">{i18n.language === 'ar' ? 'المكتب غير موجود' : 'Office Not Found'}</h2>
        <Link to="/explore">
          <Button variant="sea">{i18n.language === 'ar' ? 'العودة للاستكشاف' : 'Back to Explore'}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-salt/30">
      {/* Office Header */}
      <div className="bg-white border-b border-sand-d/20 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-32 h-32 bg-sea/10 rounded-full flex items-center justify-center text-5xl shadow-shm border-4 border-white">
              🏢
            </div>
            
            <div className="flex-1 text-center md:text-right">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <h1 className="text-3xl font-black text-ink">{office.displayName}</h1>
                <div className="flex items-center gap-2">
                  <span className="bg-mint-l text-mint px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Shield size={14} /> {t('office.verified')}
                  </span>
                  <div className="flex items-center gap-1 text-gold font-bold text-sm">
                    <Star size={16} fill="currentColor" /> ٤.٩
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-ink-s mb-6">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-sea" />
                  {i18n.language === 'ar' ? 'مارينا، الساحل الشمالي' : 'Marina, North Coast'}
                </div>
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-gold" />
                  {chalets.length} {t('office.units_registered')}
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Button variant="sea" className="flex items-center gap-2">
                  <MessageSquare size={18} /> {i18n.language === 'ar' ? 'تواصل مع المكتب' : 'Contact Office'}
                </Button>
                <Button variant="outline" onClick={handleShare} className="flex items-center gap-2">
                  <Share2 size={18} /> {t('office.share_link')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Office Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black">{t('office.all_listings')}</h2>
          <div className="text-ink-s text-sm">
            {t('explore.showing')} <span className="font-bold text-ink">{chalets.length}</span> {t('explore.available')}
          </div>
        </div>

        {chalets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {chalets.map((chalet, i) => (
              <motion.div
                key={chalet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <ChaletCard chalet={chalet} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-r p-20 text-center border border-sand-d/20 shadow-sh">
            <div className="text-5xl mb-4">🏖️</div>
            <h3 className="text-xl font-bold mb-2">{i18n.language === 'ar' ? 'لا توجد وحدات متاحة حالياً' : 'No units available at the moment'}</h3>
            <p className="text-ink-s">{i18n.language === 'ar' ? 'يرجى العودة لاحقاً لرؤية التحديثات' : 'Please check back later for updates'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
