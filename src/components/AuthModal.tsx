import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { 
  Mail, 
  Lock, 
  User, 
  Building2, 
  UserCheck, 
  Chrome, 
  Phone, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '../firebase';

export const AuthModal = () => {
  const { i18n } = useTranslation();
  const { 
    isAuthModalOpen, 
    setAuthModalOpen, 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail,
    profile,
    updateProfile
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'setup'>('login');
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [role, setRole] = useState<'client' | 'office' | 'owner'>('client');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if profile needs setup
  useEffect(() => {
    if (isAuthModalOpen && profile) {
      if (profile.profileSetupComplete) {
        setAuthModalOpen(false);
      } else {
        setMode('setup');
        if (profile.phoneNumber && !phoneNumber) {
          setPhoneNumber(profile.phoneNumber);
        }
        if (profile.displayName && !displayName) {
          setDisplayName(profile.displayName);
        }
      }
    }
  }, [profile, isAuthModalOpen]);

  useEffect(() => {
    if (!isAuthModalOpen) {
      // Reset state when closed
      setMode('login');
      setMethod(null);
      setError('');
      setConfirmationResult(null);
    }
  }, [isAuthModalOpen]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(i18n.language === 'ar' ? 'فشل تسجيل الدخول بجوجل' : 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(i18n.language === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!phoneNumber) {
          setError(i18n.language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required');
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password, role, phoneNumber);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      let msg = err.message || 'Authentication failed';
      
      if (err.code === 'auth/email-already-in-use') {
        msg = i18n.language === 'ar' ? 'هذا البريد الإلكتروني مستخدم بالفعل.' : 'Email already in use.';
      } else if (err.code === 'auth/weak-password') {
        msg = i18n.language === 'ar' ? 'كلمة المرور ضعيفة جداً.' : 'Weak password.';
      } else if (err.code === 'auth/invalid-email') {
        msg = i18n.language === 'ar' ? 'البريد الإلكتروني غير صحيح.' : 'Invalid email.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = i18n.language === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid credentials.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = i18n.language === 'ar' ? 'تسجيل الدخول بالبريد غير مفعل في إعدادات المنصة (Firebase Console).' : 'Email/Password auth is not enabled in Firebase Console.';
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError(i18n.language === 'ar' ? 'الاسم الكامل مطلوب' : 'Full name is required');
      return;
    }
    if (!phoneNumber) {
      setError(i18n.language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        displayName,
        phoneNumber,
        role,
        profileSetupComplete: true
      });
      setAuthModalOpen(false);
      toast.success(i18n.language === 'ar' ? 'تم إكمال الملف الشخصي' : 'Profile completed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const setupRecaptcha = () => {
    try {
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('Recaptcha resolved');
          },
          'expired-callback': () => {
            console.log('Recaptcha expired');
            (window as any).recaptchaVerifier = null;
          }
        });
      }
      return (window as any).recaptchaVerifier;
    } catch (err) {
      console.error('Recaptcha Setup Error:', err);
      return null;
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const appVerifier = setupRecaptcha();
      if (!appVerifier) {
        throw new Error('Failed to initialize Recaptcha');
      }
      
      // Clean phone number: remove spaces and leading zeros
      let cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      
      // Ensure it's in E.164 format: +[countryCode][number]
      const formattedPhone = cleanPhone.startsWith('+') 
        ? cleanPhone 
        : `${countryCode}${cleanPhone}`;

      console.log('Sending OTP to:', formattedPhone);
      
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      toast.success(i18n.language === 'ar' ? 'تم إرسال رمز التحقق' : 'OTP sent successfully');
    } catch (err: any) {
      console.error('OTP Error:', err);
      let msg = i18n.language === 'ar' ? 'فشل إرسال الرمز. تأكد من صحة الرقم.' : 'Failed to send OTP. Check number.';
      
      if (err.code === 'auth/unauthorized-domain') {
        msg = i18n.language === 'ar' ? 'هذا الموقع غير مصرح له باستخدام خدمة الرسائل. يرجى إضافة النطاق في Firebase Console.' : 'This domain is not authorized for phone auth. Add it in Firebase Console.';
      } else if (err.code === 'auth/invalid-phone-number') {
        msg = i18n.language === 'ar' ? 'رقم الهاتف غير صحيح.' : 'Invalid phone number.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = i18n.language === 'ar' ? 'تم إرسال طلبات كثيرة جداً. يرجى المحاولة لاحقاً.' : 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = i18n.language === 'ar' ? 'تسجيل الدخول برقم الهاتف غير مفعل في إعدادات المنصة (Firebase Console).' : 'Phone Auth is not enabled in Firebase Console.';
      }
      
      setError(msg);
      toast.error(msg);
      // Reset recaptcha on error
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (confirmationResult) {
        const result = await confirmationResult.confirm(otp);
        // If it's a new user via phone, they might need role selection
        // But for now, we'll just close and let them update later if needed
        // or we could redirect to setup if role is missing
        setAuthModalOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'setup') return i18n.language === 'ar' ? 'إكمال الملف الشخصي' : 'Complete Profile';
    if (mode === 'login') return i18n.language === 'ar' ? 'تسجيل الدخول' : 'Login';
    return i18n.language === 'ar' ? 'إنشاء حساب جديد' : 'Create New Account';
  };

  return (
    <Modal 
      isOpen={isAuthModalOpen} 
      onClose={() => setAuthModalOpen(false)} 
      title={getTitle()}
      headerColor="bg-sea"
      dismissible={mode !== 'setup'} // Don't allow closing if setup is required
    >
      <div className="space-y-6">
        {/* Mode Toggle */}
        {mode !== 'setup' && (
          <div className="flex bg-salt p-1 rounded-full border border-sand-d/20">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${mode === 'login' ? 'bg-sea text-white shadow-sm' : 'text-ink-s hover:text-sea'}`}
            >
              {i18n.language === 'ar' ? 'تسجيل دخول' : 'Login'}
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${mode === 'signup' ? 'bg-sea text-white shadow-sm' : 'text-ink-s hover:text-sea'}`}
            >
              {i18n.language === 'ar' ? 'حساب جديد' : 'Sign Up'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-l text-red p-3 rounded-rs text-xs flex items-center gap-2 border border-red/10">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'setup' ? (
            <motion.form
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleProfileSetup}
              className="space-y-4"
            >
              <p className="text-xs text-ink-s text-center mb-4">
                {i18n.language === 'ar' 
                  ? 'من فضلك أكمل بياناتك للمتابعة. رقم الهاتف ضروري للتواصل الآمن.' 
                  : 'Please complete your details to continue. Phone number is required for secure communication.'}
              </p>

              <div className="space-y-3 mb-6">
                <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider block text-center">
                  {i18n.language === 'ar' ? 'أنا سجلت كـ' : 'I am registering as'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setRole('client')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-rs border-2 transition-all ${role === 'client' ? 'border-coral bg-coral-l/10 text-coral' : 'border-sand-d/20 text-ink-s hover:border-coral/50'}`}
                  >
                    <User size={20} />
                    <span className="text-[10px] font-bold">{i18n.language === 'ar' ? 'عميل' : 'Client'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRole('office')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-rs border-2 transition-all ${role === 'office' ? 'border-sea bg-sea-l/10 text-sea' : 'border-sand-d/20 text-ink-s hover:border-sea/50'}`}
                  >
                    <Building2 size={20} />
                    <span className="text-[10px] font-bold">{i18n.language === 'ar' ? 'مكتب' : 'Office'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRole('owner')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-rs border-2 transition-all ${role === 'owner' ? 'border-lav bg-lav-l/10 text-lav' : 'border-sand-d/20 text-ink-s hover:border-lav/50'}`}
                  >
                    <UserCheck size={20} />
                    <span className="text-[10px] font-bold">{i18n.language === 'ar' ? 'مالك' : 'Owner'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">{i18n.language === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                  <input 
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                    placeholder={i18n.language === 'ar' ? 'أدخل اسمك الثلاثي' : 'Enter your full name'}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                <div className="flex gap-2">
                  <select 
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    className="bg-salt border border-sand-d/20 rounded-rs px-2 text-xs focus:outline-none focus:border-sea"
                  >
                    <option value="+20">🇪🇬 +20</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+965">🇰🇼 +965</option>
                    <option value="+974">🇶🇦 +974</option>
                    <option value="+962">🇯🇴 +962</option>
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                    <input 
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                      placeholder="10xxxxxxxx"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" variant="sea" className="w-full py-3" loading={loading}>
                {i18n.language === 'ar' ? 'حفظ البيانات' : 'Save Details'}
              </Button>
            </motion.form>
          ) : !method ? (
            <motion.div 
              key="methods"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {mode === 'signup' && (
                <div className="space-y-3 mb-6">
                  <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider block text-center">
                    {i18n.language === 'ar' ? 'سجل كـ' : 'Register as'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setRole('client')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-rs border-2 transition-all ${role === 'client' ? 'border-coral bg-coral-l/10 text-coral' : 'border-sand-d/20 text-ink-s hover:border-coral/50'}`}
                    >
                      <User size={20} />
                      <span className="text-[10px] font-bold">{i18n.language === 'ar' ? 'عميل' : 'Client'}</span>
                    </button>
                    <button 
                      onClick={() => setRole('office')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-rs border-2 transition-all ${role === 'office' ? 'border-sea bg-sea-l/10 text-sea' : 'border-sand-d/20 text-ink-s hover:border-sea/50'}`}
                    >
                      <Building2 size={20} />
                      <span className="text-[10px] font-bold">{i18n.language === 'ar' ? 'مكتب' : 'Office'}</span>
                    </button>
                    <button 
                      onClick={() => setRole('owner')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-rs border-2 transition-all ${role === 'owner' ? 'border-lav bg-lav-l/10 text-lav' : 'border-sand-d/20 text-ink-s hover:border-lav/50'}`}
                    >
                      <UserCheck size={20} />
                      <span className="text-[10px] font-bold">{i18n.language === 'ar' ? 'مالك' : 'Owner'}</span>
                    </button>
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full py-3 flex items-center justify-center gap-3"
                onClick={handleGoogleLogin}
                loading={loading}
              >
                <Chrome size={18} />
                {i18n.language === 'ar' ? 'متابعة باستخدام جوجل' : 'Continue with Google'}
              </Button>

              <Button 
                variant="outline" 
                className="w-full py-3 flex items-center justify-center gap-3"
                onClick={() => setMethod('email')}
              >
                <Mail size={18} />
                {i18n.language === 'ar' ? 'متابعة بالبريد الإلكتروني' : 'Continue with Email'}
              </Button>

              <Button 
                variant="outline" 
                className="w-full py-3 flex items-center justify-center gap-3"
                onClick={() => setMethod('phone')}
              >
                <Phone size={18} />
                {i18n.language === 'ar' ? 'متابعة برقم الهاتف' : 'Continue with Phone'}
              </Button>

              <div className="pt-4 text-center">
                <button 
                  onClick={() => setAuthModalOpen(false)}
                  className="text-xs text-ink-s hover:text-sea transition-colors underline underline-offset-4"
                >
                  {i18n.language === 'ar' ? 'تصفح كزائر' : 'Continue as Guest'}
                </button>
              </div>
            </motion.div>
          ) : method === 'email' ? (
            <motion.form 
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailAuth}
              className="space-y-4"
            >
              <button 
                type="button" 
                onClick={() => setMethod(null)}
                className="text-xs text-sea font-bold flex items-center gap-1 mb-2"
              >
                <ArrowRight size={14} className={i18n.language === 'ar' ? '' : 'rotate-180'} />
                {i18n.language === 'ar' ? 'العودة للخيارات' : 'Back to options'}
              </button>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">{i18n.language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                  <div className="flex gap-2">
                    <select 
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="bg-salt border border-sand-d/20 rounded-rs px-2 text-xs focus:outline-none focus:border-sea"
                    >
                      <option value="+20">🇪🇬 +20</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+965">🇰🇼 +965</option>
                      <option value="+974">🇶🇦 +974</option>
                      <option value="+962">🇯🇴 +962</option>
                    </select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                      <input 
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                        placeholder="10xxxxxxxx"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">{i18n.language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                variant="sea" 
                className="w-full py-3"
                loading={loading}
              >
                {mode === 'login' ? (i18n.language === 'ar' ? 'دخول' : 'Login') : (i18n.language === 'ar' ? 'إنشاء حساب' : 'Sign Up')}
              </Button>
            </motion.form>
          ) : (
            <motion.div 
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <button 
                type="button" 
                onClick={() => { setMethod(null); setConfirmationResult(null); }}
                className="text-xs text-sea font-bold flex items-center gap-1 mb-2"
              >
                <ArrowRight size={14} className={i18n.language === 'ar' ? '' : 'rotate-180'} />
                {i18n.language === 'ar' ? 'العودة للخيارات' : 'Back to options'}
              </button>

              {!confirmationResult ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">{i18n.language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <div className="flex gap-2">
                      <select 
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="bg-salt border border-sand-d/20 rounded-rs px-2 text-xs focus:outline-none focus:border-sea"
                      >
                        <option value="+20">🇪🇬 +20</option>
                        <option value="+966">🇸🇦 +966</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="+965">🇰🇼 +965</option>
                        <option value="+974">🇶🇦 +974</option>
                        <option value="+962">🇯🇴 +962</option>
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                        <input 
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={e => setPhoneNumber(e.target.value)}
                          className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                          placeholder="10xxxxxxxx"
                        />
                      </div>
                    </div>
                  </div>
                  <div id="recaptcha-container"></div>
                  <Button type="submit" variant="sea" className="w-full py-3" loading={loading}>
                    {i18n.language === 'ar' ? 'إرسال رمز التحقق' : 'Send OTP'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-ink-s uppercase tracking-wider">{i18n.language === 'ar' ? 'رمز التحقق' : 'Verification Code'}</label>
                    <input 
                      type="text"
                      required
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full bg-salt border border-sand-d/20 rounded-rs py-3 text-center text-xl font-black tracking-[1em] focus:outline-none focus:border-sea"
                      placeholder="••••••"
                      maxLength={6}
                    />
                  </div>
                  <Button type="submit" variant="sea" className="w-full py-3" loading={loading}>
                    {i18n.language === 'ar' ? 'تأكيد الرمز' : 'Verify OTP'}
                  </Button>
                  <button 
                    type="button" 
                    onClick={() => setConfirmationResult(null)}
                    className="w-full text-center text-xs text-ink-s hover:text-sea transition-colors"
                  >
                    {i18n.language === 'ar' ? 'تغيير رقم الهاتف' : 'Change phone number'}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

