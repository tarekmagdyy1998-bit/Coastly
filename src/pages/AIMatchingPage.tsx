import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Sparkles, CheckCircle2, Clock, Zap, Target, BrainCircuit, Bell, MapPin, Wallet, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { db, doc, getDoc, collection, query, where, getDocs, limit, handleFirestoreError, OperationType } from '../firebase';
import { Request, Chalet } from '../types';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

export const AIMatchingPage = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestId = searchParams.get('requestId');
  
  const [step, setStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [request, setRequest] = useState<Request | null>(null);
  const [matches, setMatches] = useState<(Chalet & { score: number, reason: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequestAndMatches = async () => {
      if (!requestId) {
        setLoading(false);
        return;
      }

      try {
        const reqDoc = await getDoc(doc(db, 'requests', requestId));
        if (reqDoc.exists()) {
          const reqData = { id: reqDoc.id, ...reqDoc.data() } as Request;
          setRequest(reqData);
          
          // Start simulation when data is found
          startSimulation();

          // Fetch potential matches
          const chaletsQuery = query(
            collection(db, 'chalets'),
            where('location', '==', reqData.location),
            where('status', '==', 'available'),
            limit(10)
          );
          
          const chaletsSnap = await getDocs(chaletsQuery);
          const potentialMatches = chaletsSnap.docs.map(doc => {
            const chalet = { id: doc.id, ...doc.data() } as Chalet;
            
            // Simple scoring logic
            let score = 70; // Base score
            let reason = i18n.language === 'ar' ? 'تطابق في المنطقة' : 'Region match';
            
            if (chalet.price <= reqData.budget) {
              score += 20;
              reason = i18n.language === 'ar' ? 'تطابق تام في السعر والمنطقة' : 'Perfect price and region match';
            } else if (chalet.price <= reqData.budget * 1.2) {
              score += 10;
              reason = i18n.language === 'ar' ? 'السعر قريب جداً من الميزانية' : 'Price very close to budget';
            }

            if (chalet.rooms === reqData.rooms) {
              score += 10;
            }

            return { ...chalet, score: Math.min(score, 98), reason };
          }).sort((a, b) => b.score - a.score);

          setMatches(potentialMatches);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `requests/${requestId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRequestAndMatches();
  }, [requestId]);

  const steps = [
    t('ai.steps.incoming'),
    t('ai.steps.analysis'),
    t('ai.steps.comparison'),
    t('ai.steps.ranking'),
    t('ai.steps.notification')
  ];

  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setStep(s => (s < 4 ? s + 1 : 4));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSimulating]);

  const startSimulation = () => {
    setStep(0);
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 5000);
  };

  if (!requestId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 text-center">
        <BrainCircuit size={64} className="mx-auto text-lav/20 mb-6" />
        <h2 className="text-2xl font-black text-ink mb-4">{i18n.language === 'ar' ? 'يرجى اختيار طلب للمطابقة' : 'Please select a request to match'}</h2>
        <Button onClick={() => navigate('/requests')}>{i18n.language === 'ar' ? 'الذهاب للطلبات' : 'Go to Requests'}</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* AI Hero Card */}
      <div className="bg-lav-l border border-lav/20 rounded-r p-8 mb-12 relative overflow-hidden">
        <div className={`absolute top-0 ${i18n.language === 'ar' ? 'right-0 -mr-32' : 'left-0 -ml-32'} w-64 h-64 bg-lav/5 rounded-full -mt-32 blur-3xl`}></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
            <span className="bg-lav text-white text-[10px] px-3 py-1 rounded-full font-bold mb-4 inline-block flex items-center gap-1 w-fit">
              <Sparkles size={12} /> {t('ai.engine')}
            </span>
            <h1 className="text-3xl font-black text-lav mb-4">{t('ai.title')}</h1>
            <p className="text-ink-s max-w-xl leading-relaxed">
              {t('ai.desc')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-rs shadow-sm border border-lav/10 text-center">
              <div className="text-2xl font-black text-lav">٠.٨ {t('ai.sec')}</div>
              <div className="text-[10px] text-ink-s">{t('ai.match_time')}</div>
            </div>
            <div className="bg-white p-4 rounded-rs shadow-sm border border-lav/10 text-center">
              <div className="text-2xl font-black text-lav">٩٤٪</div>
              <div className="text-[10px] text-ink-s">{t('ai.accuracy')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Flow Steps */}
      <div className="mb-16 overflow-x-auto pb-4">
        <div className="flex justify-between items-center min-w-[600px] max-w-4xl mx-auto relative px-8">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-lav/10 -translate-y-1/2 -z-10"></div>
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-3 bg-salt px-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                step > i ? 'bg-mint text-white' : 
                step === i ? 'bg-lav text-white ring-4 ring-lav/20 animate-pulse' : 
                'bg-white text-ink-s border border-sand-d/30'
              }`}>
                {step > i ? <CheckCircle2 size={20} /> : i + 1}
              </div>
              <span className={`text-xs font-bold whitespace-nowrap ${step === i ? 'text-lav' : 'text-ink-s'}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Request Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-r p-6 shadow-sh border border-sand-d/20 h-full">
            <h3 className="font-black mb-6 flex items-center gap-2">
              <Zap size={18} className="text-gold" /> {t('ai.current_request')}
            </h3>
            
            {request ? (
              <div className="space-y-6">
                <div className="p-4 bg-salt rounded-rs border border-sand-d/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-ink-s">REQ-{request.id.slice(0, 6)}</span>
                    <span className="text-[10px] text-mint font-bold">{t('ai.active_now')}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-s">{t('ai.region')}:</span>
                      <span className="font-bold">{request.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-s">{t('ai.budget')}:</span>
                      <span className="font-bold text-coral">{formatCurrency(request.budget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-s">{t('ai.date')}:</span>
                      <span className="font-bold text-[10px]">{request.checkIn} - {request.checkOut}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-8 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="text-lav">
                      <BrainCircuit size={48} className="mx-auto animate-bounce" />
                    </div>
                    <div className="font-bold text-ink-m">
                      {step === 0 && t('ai.waiting_analysis')}
                      {step === 1 && t('ai.analyzing_req')}
                      {step === 2 && t('ai.searching_db')}
                      {step === 3 && t('ai.ranking_results')}
                      {step === 4 && t('ai.notifications_sent')}
                    </div>
                    <div className="flex gap-1 justify-center">
                      <div className="w-1.5 h-1.5 bg-lav rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-lav rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-lav rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

                <Button 
                  variant="lav" 
                  className="w-full bg-lav text-white hover:bg-lav/90"
                  onClick={startSimulation}
                  isLoading={isSimulating}
                >
                  ⚡ {t('ai.simulate_btn')}
                </Button>
              </div>
            ) : (
              <div className="text-center py-20 animate-pulse">
                <BrainCircuit size={48} className="mx-auto text-lav/20 mb-4" />
                <p className="text-xs text-ink-s">{i18n.language === 'ar' ? 'جاري جلب بيانات الطلب...' : 'Fetching request data...'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Match Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black flex items-center gap-2">
              <Target size={18} className="text-red" /> {t('ai.match_results')}
            </h3>
            <div className="text-xs text-ink-s">{t('ai.found')} <span className="font-bold text-ink">{matches.length}</span> {t('ai.matching_units')}</div>
          </div>

          {matches.length > 0 ? (
            matches.map((match, i) => (
              <motion.div 
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-r p-6 shadow-sh border border-sand-d/20 flex flex-col md:flex-row justify-between items-center gap-6"
              >
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    {i === 0 && <span className="bg-gold text-white text-[10px] px-2 py-0.5 rounded-full font-bold">🏆 {t('ai.best_match')}</span>}
                    <h4 className="font-bold">{match.name}</h4>
                    <span className="text-xs text-ink-s">• {match.reason}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span className="text-ink-s">{t('ai.match_score')}</span>
                      <span className="text-lav">{match.score}%</span>
                    </div>
                    <div className="w-full h-2 bg-salt rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${match.score}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-lav"
                      ></motion.div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <div className="text-[10px] text-ink-s mb-1">{t('ai.suggested_price')}</div>
                    <div className="font-black text-coral">{formatCurrency(match.price)}</div>
                  </div>
                  <Button variant="secondary" size="sm" className="flex items-center gap-2" onClick={() => navigate(`/chalet/${match.id}`)}>
                    {i18n.language === 'ar' ? 'عرض الوحدة' : 'View Unit'}
                  </Button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-r border border-sand-d/20">
              <p className="text-ink-s font-bold">{i18n.language === 'ar' ? 'لا توجد نتائج مطابقة حالياً' : 'No matching results found'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
