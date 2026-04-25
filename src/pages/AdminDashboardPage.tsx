import React, { useState, useEffect } from 'react';
import { Shield, Users, Home, AlertTriangle, CheckCircle, Search, Filter, ArrowUpRight, Ban, Database, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { formatCurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { seedFirestore, clearFirestore } from '../seedData';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

export const AdminDashboardPage = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'negotiations' | 'subscribers' | 'verifications' | 'disputes'>('overview');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingNegs, setLoadingNegs] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loadingVers, setLoadingVers] = useState(false);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [confirmBan, setConfirmBan] = useState<{ isOpen: boolean, userId: string }>({ isOpen: false, userId: '' });

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'negotiations') {
      fetchNegotiations();
    } else if (activeTab === 'subscribers') {
      fetchSubscribers();
    } else if (activeTab === 'verifications') {
      fetchVerifications();
    } else if (activeTab === 'disputes') {
      fetchDisputes();
    }
  }, [activeTab]);

  const fetchVerifications = async () => {
    setLoadingVers(true);
    try {
      const q = query(collection(db, 'verifications'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVerifications(fetched);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'verifications');
      // toast.error('Failed to fetch verifications');
    } finally {
      setLoadingVers(false);
    }
  };

  const fetchDisputes = async () => {
    setLoadingDisputes(true);
    try {
      const q = query(collection(db, 'disputes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDisputes(fetched);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'disputes');
      // toast.error('Failed to fetch disputes');
    } finally {
      setLoadingDisputes(false);
    }
  };

  const fetchSubscribers = async () => {
    setLoadingSubs(true);
    try {
      const q = query(collection(db, 'subscribers'), orderBy('subscribedAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedSubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSubscribers(fetchedSubs);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'subscribers');
      toast.error('Failed to fetch subscribers');
    } finally {
      setLoadingSubs(false);
    }
  };

  const fetchNegotiations = async () => {
    setLoadingNegs(true);
    try {
      const q = query(collection(db, 'negotiations'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedNegs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNegotiations(fetchedNegs);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'negotiations');
      toast.error('Failed to fetch negotiations');
    } finally {
      setLoadingNegs(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as UserProfile[];
      setUsers(fetchedUsers);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      toast.error('Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedFirestore();
      toast.success('Data seeded successfully!');
      if (activeTab === 'users') fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'multiple');
      toast.error('Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    setConfirmClear(false);
    setClearing(true);
    try {
      await clearFirestore();
      toast.success('Database cleared successfully!');
      setUsers([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'multiple');
      toast.error('Failed to clear database');
    } finally {
      setClearing(false);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        verified: true
      });
      toast.success('User verified successfully');
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      toast.error('Failed to verify user');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      toast.success(i18n.language === 'ar' ? 'تم تحديث الرتبة بنجاح' : 'Role updated successfully');
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      toast.error('Failed to update role');
    }
  };

  const handleBanUser = async () => {
    const userId = confirmBan.userId;
    setConfirmBan({ isOpen: false, userId: '' });
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { banned: true });
      toast.success(i18n.language === 'ar' ? 'تم حظر المستخدم بنجاح' : 'User banned successfully');
      fetchUsers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      toast.error('Failed to ban user');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-black mb-2">{t('admin.title')}</h1>
          <p className="text-ink-s text-sm">{t('admin.desc')}</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 text-red border-red hover:bg-red-l"
            onClick={() => setConfirmClear(true)}
            disabled={clearing}
          >
            <Ban size={16} /> {clearing ? 'Clearing...' : 'Clear Database'}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleSeed}
            disabled={seeding}
          >
            <Database size={16} /> {seeding ? 'Seeding...' : 'Seed Data'}
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Search size={16} /> {t('admin.advanced_search')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-salt p-1 rounded-full border border-sand-d/20 mb-8 max-w-4xl mx-auto overflow-x-auto">
        {(['overview', 'users', 'negotiations', 'subscribers', 'verifications', 'disputes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-sea text-white shadow-sm' : 'text-ink-s hover:text-sea'}`}
          >
            {tab === 'overview' ? (i18n.language === 'ar' ? 'نظرة عامة' : 'Overview') :
             tab === 'users' ? (i18n.language === 'ar' ? 'المستخدمين' : 'Users') :
             tab === 'negotiations' ? (i18n.language === 'ar' ? 'المفاوضات' : 'Negotiations') :
             tab === 'subscribers' ? (i18n.language === 'ar' ? 'المشتركين' : 'Subscribers') :
             tab === 'verifications' ? (i18n.language === 'ar' ? 'التوثيق' : 'Verifications') :
             (i18n.language === 'ar' ? 'النزاعات' : 'Disputes')}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: t('admin.stats.total_bookings'), value: '١,٢٤٠', change: '+١٥٪', icon: Home, color: 'text-sea' },
              { label: t('admin.stats.new_users'), value: '٤٥٠', change: '+٨٪', icon: Users, color: 'text-lav' },
              { label: t('admin.stats.open_disputes'), value: '٣', change: '-٢', icon: AlertTriangle, color: 'text-red' },
              { label: t('admin.stats.platform_revenue'), value: `٠ ${t('common.currency')}`, change: '٠٪', icon: Shield, color: 'text-mint' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-r shadow-sh border border-sand-d/20">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-rs bg-salt ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <span className="text-[10px] font-bold text-mint bg-mint-l px-2 py-0.5 rounded-full">{stat.change}</span>
                </div>
                <div className="text-2xl font-black text-ink mb-1">{stat.value}</div>
                <div className="text-xs text-ink-s font-bold">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Verification Queue */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden">
                <div className="p-4 border-b border-sand-d/10 flex justify-between items-center">
                  <h3 className="font-black text-sm">{i18n.language === 'ar' ? 'طلبات انضمام المكاتب' : 'New Office Requests'}</h3>
                  <span className="bg-gold-l text-gold text-[10px] px-2 py-0.5 rounded-full font-bold">٥ {i18n.language === 'ar' ? 'طلبات بانتظار المراجعة' : 'Pending Requests'}</span>
                </div>
                <div className="divide-y divide-sand-d/10">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-salt/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-sea-p rounded-full flex items-center justify-center text-sea font-bold">م</div>
                        <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                          <h4 className="font-bold text-sm">{i18n.language === 'ar' ? 'مكتب الساحل' : 'Coast Office'} {i}</h4>
                          <p className="text-[10px] text-ink-s">{i18n.language === 'ar' ? 'بانتظار المراجعة اليدوية والتواصل' : 'Waiting for manual review and contact'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="text-mint border-mint hover:bg-mint-l">{i18n.language === 'ar' ? 'توثيق الآن' : 'Verify Now'}</Button>
                        <Button variant="outline" size="sm" className="text-red border-red hover:bg-red-l">{t('admin.reject')}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispute Management */}
              <div className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden">
                <div className="p-4 border-b border-sand-d/10 bg-red-l/30">
                  <h3 className="font-black text-sm text-red flex items-center gap-2">
                    <AlertTriangle size={18} /> {t('admin.active_disputes')}
                  </h3>
                </div>
                <div className="divide-y divide-sand-d/10">
                  <div className="p-4 flex items-center justify-between">
                    <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                      <h4 className="font-bold text-sm">{i18n.language === 'ar' ? 'نزاع على شاليه هاسيندا #١٠٤' : 'Dispute on Hacienda Chalet #104'}</h4>
                      <p className="text-[10px] text-ink-s">{t('admin.dispute_reason')} • {t('admin.amount')}: ١٢,٠٠٠ {t('common.currency')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ink" size="sm">{t('admin.arbitrate')}</Button>
                      <Button variant="outline" size="sm">{t('admin.contact_parties')}</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Logs & Quick Actions */}
            <aside className="space-y-6">
              <div className="bg-white rounded-r p-6 shadow-sh border border-sand-d/20">
                <h3 className="font-black mb-4 text-sm">{t('admin.quick_actions')}</h3>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start gap-2 text-xs">
                    <Ban size={14} /> {t('admin.ban_user')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2 text-xs">
                    <CheckCircle size={14} /> {t('admin.manual_verify')}
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-2 text-xs">
                    <ArrowUpRight size={14} /> {t('admin.export_data')}
                  </Button>
                </div>
              </div>

              <div className="bg-ink text-white rounded-r p-6 shadow-sh">
                <h3 className="font-black mb-4 text-sm">{t('admin.system_status')}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">{t('admin.api_server')}</span>
                    <span className="text-mint font-bold">{t('admin.connected')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">{t('admin.database')}</span>
                    <span className="text-mint font-bold">{t('admin.connected')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">{t('admin.ai_service')}</span>
                    <span className="text-mint font-bold">{t('admin.connected')}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      {activeTab === 'negotiations' && (
        <div className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden">
          <div className="p-4 border-b border-sand-d/10 flex justify-between items-center bg-salt/50">
            <h3 className="font-black text-sm">{i18n.language === 'ar' ? 'سجل المفاوضات والعمليات' : 'Negotiations & Audit Trail'}</h3>
            <span className="bg-sea-p text-sea text-[10px] px-2 py-0.5 rounded-full font-bold">{negotiations.length} {i18n.language === 'ar' ? 'عملية' : 'Operations'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-[10px] font-bold text-ink-s uppercase tracking-wider bg-salt/30 border-b border-sand-d/10">
                <tr>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'الشاليه' : 'Chalet'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'العميل' : 'Client'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'المكتب' : 'Office'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'صور الهوية' : 'ID Photos'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-d/10">
                {loadingNegs ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-sea border-t-transparent rounded-full mx-auto"></div>
                    </td>
                  </tr>
                ) : negotiations.length > 0 ? (
                  negotiations.map((n) => (
                    <tr key={n.id} className="hover:bg-salt/30 transition-colors">
                      <td className="px-6 py-4 font-bold">{n.chaletName}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{n.userName || 'Client'}</span>
                          <span className="text-[10px] text-sea font-mono">{n.clientPhone || 'No Phone'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{n.officeName}</span>
                          <span className="text-[10px] text-sea font-mono">{n.officePhone || 'No Phone'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          n.status === 'agreed' ? 'bg-mint-l text-mint' : 
                          n.status === 'cancelled' ? 'bg-ink-l text-ink-s' : 'bg-gold-l text-gold'
                        }`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {n.totalAmount ? formatCurrency(n.totalAmount) : (n.agreedPrice ? formatCurrency(n.agreedPrice) : '-')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {n.idUrls && n.idUrls.length > 0 ? (
                            n.idUrls.map((url: string, idx: number) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded overflow-hidden border border-sand-d/20">
                                <img src={url} alt="ID" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </a>
                            ))
                          ) : (
                            <span className="text-[10px] text-ink-s italic">No IDs</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-ink-s">
                      {i18n.language === 'ar' ? 'لا توجد مفاوضات' : 'No negotiations found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'subscribers' && (
        <div className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden">
          <div className="p-4 border-b border-sand-d/10 flex justify-between items-center bg-salt/50">
            <h3 className="font-black text-sm">{i18n.language === 'ar' ? 'مشتركي تنبيهات واتساب' : 'WhatsApp Alert Subscribers'}</h3>
            <span className="bg-sea-p text-sea text-[10px] px-2 py-0.5 rounded-full font-bold">{subscribers.length} {i18n.language === 'ar' ? 'مشترك' : 'Subscribers'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-[10px] font-bold text-ink-s uppercase tracking-wider bg-salt/30 border-b border-sand-d/10">
                <tr>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'تاريخ الاشتراك' : 'Subscribed At'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-d/10">
                {loadingSubs ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-sea border-t-transparent rounded-full mx-auto"></div>
                    </td>
                  </tr>
                ) : subscribers.length > 0 ? (
                  subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-salt/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-sea font-bold">{s.phoneNumber}</td>
                      <td className="px-6 py-4 text-[10px] text-ink-s">
                        {new Date(s.subscribedAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.active ? 'bg-mint-l text-mint' : 'bg-red-l text-red'}`}>
                          {s.active ? (i18n.language === 'ar' ? 'نشط' : 'Active') : (i18n.language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center text-ink-s">
                      {i18n.language === 'ar' ? 'لا يوجد مشتركون' : 'No subscribers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="bg-white rounded-r shadow-sh border border-sand-d/20 overflow-hidden">
          <div className="p-4 border-b border-sand-d/10 flex justify-between items-center bg-salt/50">
            <h3 className="font-black text-sm">{i18n.language === 'ar' ? 'إدارة المستخدمين' : 'Users Management'}</h3>
            <span className="bg-sea-p text-sea text-[10px] px-2 py-0.5 rounded-full font-bold">{users.length} {i18n.language === 'ar' ? 'مستخدم' : 'Users'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-[10px] font-bold text-ink-s uppercase tracking-wider bg-salt/30 border-b border-sand-d/10">
                <tr>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'المستخدم' : 'User'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'النوع' : 'Role'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'تاريخ التسجيل' : 'Joined'}</th>
                  <th className="px-6 py-4">{i18n.language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-d/10">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-sea border-t-transparent rounded-full mx-auto"></div>
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.uid} className="hover:bg-salt/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-sand-d/20 rounded-full flex items-center justify-center text-xs font-bold relative">
                            {u.displayName?.charAt(0) || 'U'}
                            {u.verified && (
                              <div className="absolute -top-1 -right-1 bg-mint text-white rounded-full p-0.5 border border-white">
                                <CheckCircle size={8} />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold flex items-center gap-1">
                              {u.displayName}
                              {u.banned && <span className="text-[8px] bg-red text-white px-1 rounded uppercase">Banned</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          u.role === 'admin' ? 'bg-red-l text-red' :
                          u.role === 'office' ? 'bg-sea-p text-sea' :
                          u.role === 'owner' ? 'bg-lav-l text-lav' : 'bg-gold-l text-gold'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-sea font-bold">
                        {u.phoneNumber || (i18n.language === 'ar' ? 'غير مسجل' : 'Not set')}
                      </td>
                      <td className="px-6 py-4 text-xs text-ink-s">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 text-[10px] text-ink-s">
                        {new Date(u.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <select 
                            className="bg-salt border border-sand-d/20 rounded-rs px-2 py-1 text-[10px] focus:outline-none focus:border-sea cursor-pointer"
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.uid, e.target.value)}
                          >
                            <option value="client">Client</option>
                            <option value="office">Office</option>
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                          </select>
                          {!u.verified && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-mint hover:bg-mint-l p-1"
                              onClick={() => handleVerifyUser(u.uid)}
                              title={i18n.language === 'ar' ? 'توثيق' : 'Verify'}
                            >
                              <CheckCircle size={14} />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`${u.banned ? 'text-ink-s' : 'text-red'} hover:bg-red-l p-1`}
                            onClick={() => setConfirmBan({ isOpen: true, userId: u.uid })}
                            disabled={u.banned}
                            title={i18n.language === 'ar' ? 'حظر' : 'Ban'}
                          >
                            <Ban size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-ink-s">
                      {i18n.language === 'ar' ? 'لا يوجد مستخدمين' : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'verifications' && (
        <div className="bg-white rounded-r shadow-sh border border-sand-d/20 p-12 text-center">
          <div className="w-20 h-20 bg-mint-l rounded-full flex items-center justify-center mx-auto mb-6 text-mint">
            <CheckCircle size={40} />
          </div>
          <h3 className="font-black text-xl mb-3">{i18n.language === 'ar' ? 'نظام التوثيق اليدوي' : 'Manual Verification System'}</h3>
          <p className="text-ink-s text-sm max-w-lg mx-auto leading-relaxed">
            {i18n.language === 'ar' 
              ? 'تم إلغاء نظام السجل التجاري الإجباري لتسهيل انضمام المكاتب. يمكنك الآن مراجعة بيانات المكاتب والتواصل معهم، ثم توثيقهم يدوياً من خلال تبويب "إدارة المستخدمين" بالضغط على أيقونة الصح بجانب كل مستخدم.' 
              : 'The mandatory commercial register system has been disabled to facilitate office onboarding. You can now review office details, contact them, and verify them manually through the "Users Management" tab by clicking the checkmark icon next to each user.'}
          </p>
          <Button 
            variant="sea" 
            className="mt-8"
            onClick={() => setActiveTab('users')}
          >
            {i18n.language === 'ar' ? 'انتقل لإدارة المستخدمين' : 'Go to Users Management'}
          </Button>
        </div>
      )}

      {activeTab === 'disputes' && (
        <div className="bg-white rounded-r shadow-sh border border-sand-d/20 p-12 text-center">
          <div className="w-20 h-20 bg-red-l rounded-full flex items-center justify-center mx-auto mb-6 text-red">
            <AlertCircle size={40} />
          </div>
          <h3 className="font-black text-xl mb-3">{i18n.language === 'ar' ? 'إدارة النزاعات' : 'Disputes Management'}</h3>
          <p className="text-ink-s text-sm max-w-lg mx-auto leading-relaxed">
            {i18n.language === 'ar' 
              ? 'لا توجد نزاعات نشطة حالياً. نظراً لأن الدفع يتم الآن خارج المنصة، تقتصر النزاعات على البلاغات عن المكاتب أو العملاء غير الملتزمين.' 
              : 'No active disputes at the moment. Since payments are now handled outside the platform, disputes are limited to reports about non-compliant offices or clients.'}
          </p>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClear}
        title={i18n.language === 'ar' ? 'مسح قاعدة البيانات' : 'Clear Database'}
        message={i18n.language === 'ar' ? 'هل أنت متأكد من مسح قاعدة البيانات بالكامل؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to clear the entire database? This action cannot be undone.'}
        variant="red"
        loading={clearing}
      />

      <ConfirmationModal
        isOpen={confirmBan.isOpen}
        onClose={() => setConfirmBan({ isOpen: false, userId: '' })}
        onConfirm={handleBanUser}
        title={i18n.language === 'ar' ? 'حظر مستخدم' : 'Ban User'}
        message={i18n.language === 'ar' ? 'هل أنت متأكد من حظر هذا المستخدم؟ لن يتمكن من تسجيل الدخول مرة أخرى.' : 'Are you sure you want to ban this user? They will not be able to log in again.'}
        variant="red"
      />
    </div>
  );
};
