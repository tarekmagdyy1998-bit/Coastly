import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  onAuthStateChanged, 
  signInWithPopup, 
  googleProvider,
  User,
  handleFirestoreError,
  OperationType
} from '../firebase';

import { UserProfile, UserType } from '../types';
import { toast } from 'sonner';
import i18n from '../i18n/config';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, role: UserType, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'tarekmagdyy1998@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const isSystemAdmin = firebaseUser.email === ADMIN_EMAIL;
          
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            
            // Check if user is banned
            if (data.banned) {
              await auth.signOut();
              setUser(null);
              setProfile(null);
              toast.error(i18n.language === 'ar' ? 'تم حظر حسابك. يرجى التواصل مع الإدارة.' : 'Your account has been banned. Please contact support.');
              return;
            }

            // Force admin role if email matches
            if (isSystemAdmin && data.role !== 'admin') {
              const updated = { ...data, role: 'admin' as UserType };
              await setDoc(doc(db, 'users', firebaseUser.uid), updated, { merge: true });
              setProfile(updated);
            } else {
              setProfile(data);
            }
          } else {
            // Create default profile (role and phone will be updated by modal if needed)
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: isSystemAdmin ? 'admin' : undefined as any, // Let modal handle role selection
              photoURL: firebaseUser.photoURL || '',
              phoneNumber: firebaseUser.phoneNumber || '',
              createdAt: new Date().toISOString(),
              profileSetupComplete: isSystemAdmin // Admins don't need setup
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          const isSystemAdmin = firebaseUser.email === ADMIN_EMAIL;
          if (isSystemAdmin) {
            // If admin, provide a fallback profile so they can access the dashboard
            console.warn('Admin profile fetch failed, using fallback profile');
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Admin',
              role: 'admin',
              photoURL: firebaseUser.photoURL || '',
              phoneNumber: '',
              createdAt: new Date().toISOString(),
              profileSetupComplete: true
            });
          } else if (error instanceof Error && error.message.includes('permission')) {
            console.warn('Profile fetch permission denied, might be a new user or rule propagation delay.');
          } else {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Modal will stay open if profile is incomplete (handled in AuthModal)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('cancelled-popup-request') || error.message.includes('popup-blocked')) {
          console.warn('Login popup issue:', error.message);
        } else {
          console.error('Login failed:', error);
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const { signInWithEmailAndPassword } = await import('../firebase');
      await signInWithEmailAndPassword(auth, email, pass);
      setAuthModalOpen(false);
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, role: UserType, phone: string) => {
    try {
      const { createUserWithEmailAndPassword } = await import('../firebase');
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      
      const newProfile: UserProfile = {
        uid: result.user.uid,
        email: email,
        displayName: email.split('@')[0],
        role: role,
        photoURL: '',
        phoneNumber: phone,
        createdAt: new Date().toISOString(),
        profileSetupComplete: true
      };
      // Use merge: true to avoid overwriting if onAuthStateChanged already created a partial profile
      await setDoc(doc(db, 'users', result.user.uid), newProfile, { merge: true });
      setProfile(newProfile);
      setAuthModalOpen(false);
    } catch (error) {
      console.error('Email registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const baseData = profile || {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        createdAt: new Date().toISOString(),
      };
      const updatedProfile = { ...baseData, ...data } as UserProfile;
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setProfile(updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAuthModalOpen, 
      setAuthModalOpen,
      loginWithGoogle, 
      loginWithEmail,
      registerWithEmail,
      logout, 
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
