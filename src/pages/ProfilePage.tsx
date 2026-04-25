import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Calendar, 
  Settings, 
  LogOut, 
  CheckCircle,
  Clock,
  MessageSquare,
  History,
  TrendingUp,
  MapPin,
  Camera
} from 'lucide-react';
import { Button } from '../components/Button';
import { toast } from 'sonner';

export const ProfilePage = () => {
  const { profile, logout, updateProfile } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');

  if (!profile) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        displayName,
        phoneNumber
      });
      setIsEditing(false);
      toast.success(i18n.language === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated successfully');
    } catch (err) {
      toast.error(i18n.language === 'ar' ? 'فشل التحديث' : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: i18n.language === 'ar' ? 'المفاوضات' : 'Negotiations', 
      value: '١٢', 
      icon: <MessageSquare size={18} className="text-sea" />,
      gradient: 'from-sea/10 to-transparent'
    },
    { 
      label: i18n.language === 'ar' ? 'الطلبات' : 'Requests', 
      value: '٤', 
      icon: <Clock size={18} className="text-coral" />,
      gradient: 'from-coral/10 to-transparent'
    },
    { 
      label: i18n.language === 'ar' ? 'الادخار' : 'Savings', 
      value: '١,٥٠٠ ج', 
      icon: <TrendingUp size={18} className="text-mint" />,
      gradient: 'from-mint/10 to-transparent'
    }
  ];

  return (
    <div className="min-h-screen bg-salt/30 pb-32">
      {/* Header Profile */}
      <div className="bg-white border-b border-sand-d/20 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              <div className="w-32 h-32 bg-sea-l/20 rounded-full flex items-center justify-center text-5xl shadow-shm border-4 border-white overflow-hidden">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={64} className="text-sea" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-sea text-white rounded-full shadow-sh hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>

            <div className="flex-1 text-center md:text-right">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2 justify-center md:justify-start">
                <h1 className="text-3xl font-black text-ink">{profile.displayName}</h1>
                {profile.verified && (
                  <span className="bg-mint-l text-mint px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                    <CheckCircle size={14} /> {t('common.verified')}
                  </span>
                )}
                <span className="bg-sea/10 text-sea px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {i18n.language === 'ar' ? (
                    profile.role === 'office' ? 'مكتب' : profile.role === 'owner' ? 'مالك' : 'عميل'
                  ) : profile.role}
                </span>
              </div>
              <p className="text-ink-s flex items-center gap-2 justify-center md:justify-start mb-6">
                <Mail size={16} className="text-sand-d" /> {profile.email}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Button 
                  variant={isEditing ? 'outline' : 'sea'} 
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-2"
                >
                  <Settings size={18} /> 
                  {isEditing 
                    ? (i18n.language === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit') 
                    : (i18n.language === 'ar' ? 'تعديل الملف' : 'Edit Profile')}
                </Button>
                <Button variant="outline" className="text-red border-red/20 hover:bg-red-l" onClick={logout}>
                  <LogOut size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`bg-white p-6 rounded-r border border-sand-d/20 shadow-sh relative overflow-hidden`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient}`} />
                  <div className="relative z-10">
                    <div className="p-2 bg-white rounded-rs w-fit shadow-sm mb-4">
                      {stat.icon}
                    </div>
                    <p className="text-ink-s text-xs font-bold mb-1 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-black text-ink">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Account Settings / Details */}
            <div className="bg-white rounded-r border border-sand-d/20 shadow-sh p-6">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <div className="p-2 bg-sea-l/20 rounded-rs text-sea">
                  <Shield size={20} />
                </div>
                {i18n.language === 'ar' ? 'بيانات الحساب' : 'Account Details'}
              </h2>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-ink-s uppercase tracking-wider">
                      {i18n.language === 'ar' ? 'الاسم المعروض' : 'Display Name'}
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-d" />
                      <input 
                        type="text"
                        disabled={!isEditing}
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full bg-salt/50 border border-sand-d/20 rounded-rs py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-sea disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-ink-s uppercase tracking-wider">
                      {i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    </label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-d" />
                      <input 
                        type="tel"
                        disabled={!isEditing}
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full bg-salt/50 border border-sand-d/20 rounded-rs py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-sea disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-sand-d/10">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button type="submit" variant="sea" loading={loading}>
                      {i18n.language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </form>
            </div>

            {/* Recent Activity Mini-List */}
            <div className="bg-white rounded-r border border-sand-d/20 shadow-sh p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <div className="p-2 bg-sea-l/20 rounded-rs text-sea">
                    <History size={20} />
                  </div>
                  {i18n.language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
                </h2>
                <Button variant="outline" className="text-[10px] h-8 font-black uppercase tracking-wider">
                   {i18n.language === 'ar' ? 'عرض الكل' : 'View All'}
                </Button>
              </div>

              <div className="space-y-4">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-salt/30 rounded-rs transition-colors border border-transparent hover:border-sand-d/10 group">
                    <div className="w-12 h-12 bg-sea-l/20 rounded-rs flex-shrink-0 flex items-center justify-center text-sea">
                      <CheckCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-ink mb-0.5">
                        {i18n.language === 'ar' ? 'تم قبول عرضك في هاسيندا وايت' : 'Offer accepted at Hacienda White'}
                      </p>
                      <p className="text-[10px] text-ink-s">منذ ٣ ساعات • رقم الطلب: #XR542</p>
                    </div>
                    <Button variant="outline" className="opacity-0 group-hover:opacity-100 h-8 text-[10px]">
                      {i18n.language === 'ar' ? 'التفاصيل' : 'Details'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Member Info */}
            <div className="bg-gradient-to-br from-sea to-sea-d rounded-r p-6 text-white shadow-shl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Shield size={120} />
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                  <Shield size={20} /> {i18n.language === 'ar' ? 'عضوية ساحلي المميزة' : 'Coastly Premium Member'}
                </h3>
                <p className="text-xs text-white/80 mb-6 leading-relaxed">
                  {i18n.language === 'ar' 
                    ? 'أنت الآن جزء من نظام الضمان الثلاثي. استمتع بحجوزات آمنة ورد كامل للمبلغ في حال وجود مخالفات.' 
                    : 'You are part of the Triple Protection system. Enjoy secure bookings and full refunds in case of issues.'}
                </p>
                <div className="flex items-center gap-2 text-xs font-bold pt-4 border-t border-white/20">
                  <Calendar size={14} />
                  {i18n.language === 'ar' ? 'انضممت منذ: مايو ٢٠٢٤' : 'Joined: May 2024'}
                </div>
              </div>
            </div>

            {/* Verification Items */}
            <div className="bg-white rounded-r border border-sand-d/20 shadow-sh p-6">
              <h3 className="text-sm font-black mb-4 uppercase tracking-wider text-ink-s">
                {i18n.language === 'ar' ? 'حالة التوثيق' : 'Verification Status'}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-mint-l/10 border border-mint/20 rounded-rs">
                   <div className="flex items-center gap-2">
                     <CheckCircle size={14} className="text-mint" />
                     <span className="text-xs font-bold text-mint">{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email verified'}</span>
                   </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-mint-l/10 border border-mint/20 rounded-rs">
                   <div className="flex items-center gap-2">
                     <CheckCircle size={14} className="text-mint" />
                     <span className="text-xs font-bold text-mint">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone verified'}</span>
                   </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-coral-l/10 border border-coral/20 rounded-rs">
                   <div className="flex items-center gap-2 text-ink-s">
                     <MapPin size={14} />
                     <span className="text-xs font-bold">{i18n.language === 'ar' ? 'العنوان غير مسجل' : 'Address not registered'}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
