import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { Shield, Sparkles, CheckCircle, Lock, Percent, Ban, Bell, User, Settings, LogOut, Globe, Menu, X, Search, Compass, MessageSquare, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { db, collection, query, where, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from '../firebase';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, setAuthModalOpen, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(fetched);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
    if (n.link) navigate(n.link);
    setShowNotifications(false);
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: i18n.language === 'ar' ? ar : enUS 
    });
  };

  const toggleLanguage = () => {
    const newLng = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLng);
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-playfair text-2xl font-extrabold text-ink tracking-tight">
            C<span className="text-coral">o</span>astly <span className="font-cairo text-xl">{i18n.language === 'ar' ? '· ساحلي' : ''}</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-ink-s font-cairo">
          <Link to="/explore" className="hover:text-sea transition-colors">{t('nav.explore')}</Link>
          <Link to="/requests" className="hover:text-sea transition-colors">{t('nav.requests')}</Link>
          <Link to="/negotiations" className="hover:text-sea transition-colors">{t('nav.negotiations')}</Link>
          <Link to="/office" className="hover:text-sea transition-colors">{t('nav.office')}</Link>
          {profile?.role === 'admin' && (
            <Link to="/admin" className="hover:text-sea transition-colors">{t('nav.admin')}</Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleLanguage}
            className="p-2 hover:bg-sea-p rounded-full transition-colors flex items-center gap-1 text-ink-s font-bold text-xs"
          >
            <Globe size={18} />
            <span className="uppercase">{i18n.language === 'ar' ? 'EN' : 'AR'}</span>
          </button>

          {user && (
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-sea-p rounded-full transition-colors relative"
              >
                <Bell size={20} className="text-ink-s" />
                {unreadCount > 0 && (
                  <span className={`absolute top-1 ${i18n.language === 'ar' ? 'right-1' : 'left-1'} w-4 h-4 bg-coral text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white`}>
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute ${i18n.language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-80 glass rounded-rs shadow-shl overflow-hidden z-50`}
                  >
                    <div className="p-4 border-b border-white/20 flex justify-between items-center bg-sea-p/50">
                      <h4 className="text-sm font-bold">{i18n.language === 'ar' ? 'الإشعارات' : 'Notifications'}</h4>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-sea font-bold"
                        >
                          {i18n.language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => handleNotificationClick(n)}
                            className={`p-4 border-b border-white/10 hover:bg-white/40 transition-colors cursor-pointer group flex gap-3 ${!n.read ? 'bg-sea-p/30' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              n.type === 'offer' ? 'bg-gold-l text-gold' : 
                              n.type === 'agreement' ? 'bg-mint-l text-mint' : 'bg-sea-p text-sea'
                            }`}>
                              {n.type === 'offer' ? <Percent size={14} /> : n.type === 'agreement' ? <CheckCircle size={14} /> : <Bell size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-bold truncate pr-6">{n.title}</span>
                                <span className="text-[10px] text-ink-s whitespace-nowrap">{getTimeAgo(n.createdAt)}</span>
                              </div>
                              <p className="text-xs text-ink-s leading-relaxed line-clamp-2">{n.message}</p>
                            </div>
                            <button 
                              onClick={(e) => handleDeleteNotification(e, n.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-xs text-ink-s">{i18n.language === 'ar' ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center border-t border-white/20">
                      <button className="text-xs text-sea font-bold">{i18n.language === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'}</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {user ? (
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1 hover:bg-sea-p rounded-full transition-colors"
              >
                <img 
                  src={user.photoURL || 'https://picsum.photos/seed/user/100/100'} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full border border-white/20"
                  referrerPolicy="no-referrer"
                />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute ${i18n.language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-48 glass rounded-rs shadow-shl overflow-hidden z-50`}
                    >
                      <div className="p-4 border-b border-white/20 bg-sea-p/30">
                        <p className="text-xs font-bold truncate">{user.displayName || profile?.displayName}</p>
                        <p className="text-[10px] text-ink-s truncate">{user.email || profile?.email}</p>
                      </div>
                      <div className="p-2">
                        <button 
                          onClick={() => {
                            navigate('/profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-white/40 rounded-rs text-xs transition-colors"
                        >
                          <User size={14} /> {i18n.language === 'ar' ? 'الملف الشخصي' : 'Profile'}
                        </button>
                        <button 
                          onClick={() => {
                            navigate('/');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-white/40 rounded-rs text-xs transition-colors"
                        >
                          <Settings size={14} /> {i18n.language === 'ar' ? 'الإعدادات' : 'Settings'}
                        </button>
                        <button 
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 p-2 hover:bg-red-l text-red rounded-rs text-xs transition-colors"
                        >
                          <LogOut size={14} /> {i18n.language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button variant="ghost" className="text-ink-s hidden sm:flex" onClick={() => setAuthModalOpen(true)}>{t('nav.login')}</Button>
          )}
          
          {!user && (
            <Button variant="coral" size="sm" onClick={() => setAuthModalOpen(true)}>{t('nav.start')}</Button>
          )}

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-sea-p rounded-full transition-colors md:hidden"
          >
            {isMobileMenuOpen ? <X size={24} className="text-ink" /> : <Menu size={24} className="text-ink" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-white/20 overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-4 font-cairo text-ink-s">
              <Link 
                to="/explore" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-sea-p rounded-rs transition-colors flex items-center justify-between"
              >
                <span>{t('nav.explore')}</span>
                <Sparkles size={16} className="text-sea" />
              </Link>
              <Link 
                to="/requests" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-sea-p rounded-rs transition-colors flex items-center justify-between"
              >
                <span>{t('nav.requests')}</span>
                <Bell size={16} className="text-coral" />
              </Link>
              <Link 
                to="/negotiations" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-sea-p rounded-rs transition-colors flex items-center justify-between"
              >
                <span>{t('nav.negotiations')}</span>
                <Percent size={16} className="text-sea" />
              </Link>
              <Link 
                to="/office" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-sea-p rounded-rs transition-colors flex items-center justify-between"
              >
                <span>{t('nav.office')}</span>
                <Shield size={16} className="text-ink-s" />
              </Link>
              {profile?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-sea-p rounded-rs transition-colors flex items-center justify-between"
                >
                  <span>{t('nav.admin')}</span>
                  <Lock size={16} className="text-coral" />
                </Link>
              )}
              {!user && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start" 
                  onClick={() => {
                    setAuthModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {t('nav.login')}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export const Footer = () => {
  const { i18n } = useTranslation();
  return (
    <footer className="bg-ink text-white/60 py-12 px-4 border-t border-ink-m mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <span className="font-playfair text-2xl font-extrabold text-white mb-4 block">
            C<span className="text-coral">o</span>astly <span className="font-cairo text-xl">{i18n.language === 'ar' ? '· ساحلي' : ''}</span>
          </span>
          <p className="max-w-md font-cairo leading-relaxed">
            {i18n.language === 'ar' 
              ? 'المنصة الأولى في مصر لحجز شاليهات الساحل الشمالي بنظام التفاوض. أنت تحدد السعر، والمكاتب تتنافس لخدمتك.'
              : 'The first platform in Egypt for booking North Coast chalets via negotiation. You set the price, and offices compete to serve you.'}
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-tajawal mb-4">{i18n.language === 'ar' ? 'روابط سريعة' : 'Quick Links'}</h4>
          <ul className="space-y-2 font-cairo">
            <li><Link to="/legal" className="hover:text-coral">{i18n.language === 'ar' ? 'عقد المكاتب' : 'Office Contract'}</Link></li>
            <li><Link to="/legal" className="hover:text-coral">{i18n.language === 'ar' ? 'سياسة الإلغاء' : 'Cancellation Policy'}</Link></li>
            <li><Link to="/legal" className="hover:text-coral">{i18n.language === 'ar' ? 'الشروط العامة' : 'General Terms'}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-tajawal mb-4">{i18n.language === 'ar' ? 'تواصل معنا' : 'Contact Us'}</h4>
          <p className="font-cairo">support@coastly.com</p>
          <div className="flex gap-4 mt-4">
            {/* Social icons placeholder */}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-ink-m text-center font-cairo text-sm">
        {i18n.language === 'ar' ? '© ٢٠٢٥ Coastly · ساحلي. جميع الحقوق محفوظة.' : '© 2025 Coastly. All rights reserved.'}
      </div>
    </footer>
  );
};

export const BottomNav = () => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/20 px-2 py-2 safe-area-bottom">
      <div className="flex items-center justify-around">
        <Link to="/explore" className="flex flex-col items-center gap-1 p-2 text-ink-s hover:text-sea transition-colors">
          <Search size={20} />
          <span className="text-[10px] font-bold font-cairo">{t('nav.explore')}</span>
        </Link>
        <Link to="/requests" className="flex flex-col items-center gap-1 p-2 text-ink-s hover:text-sea transition-colors">
          <Bell size={20} />
          <span className="text-[10px] font-bold font-cairo">{t('nav.requests')}</span>
        </Link>
        <Link to="/negotiations" className="flex flex-col items-center gap-1 p-2 text-ink-s hover:text-sea transition-colors">
          <Percent size={20} />
          <span className="text-[10px] font-bold font-cairo">{t('nav.negotiations')}</span>
        </Link>
        <Link to="/office" className="flex flex-col items-center gap-1 p-2 text-ink-s hover:text-sea transition-colors">
          <Shield size={20} />
          <span className="text-[10px] font-bold font-cairo">{t('nav.office')}</span>
        </Link>
        {profile?.role === 'admin' && (
          <Link to="/admin" className="flex flex-col items-center gap-1 p-2 text-ink-s hover:text-sea transition-colors">
            <Lock size={20} />
            <span className="text-[10px] font-bold font-cairo">{t('nav.admin')}</span>
          </Link>
        )}
      </div>
    </div>
  );
};
