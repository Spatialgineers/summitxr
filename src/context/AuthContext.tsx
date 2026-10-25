import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, firebaseConfig, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types/engine';

export const AUTHORIZED_SUPER_ADMIN_EMAIL = 'info@spatialgineers.com';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAnonymous: boolean;
  authError: string | null;
  oAuthClientId: string;
  playerProfile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleCredential: (idToken: string) => Promise<void>;
  signInAnonymouslyUser: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  clearAuthError: () => void;
  savePlayerProfile: (profile: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [playerProfile, setPlayerProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('sgx_player_profile');
      if (saved) return JSON.parse(saved);
      const savedAvatar = localStorage.getItem('sgx_attendee_avatar_png');
      if (savedAvatar) {
        return {
          id: 'local_player',
          nickname: 'Spatialgineer',
          avatar: savedAvatar,
          avatarSeed: 'sgx_initial',
          tenantId: 'tenant_sgx_stage',
          eventId: 'event_live_cyoa',
          totalScore: 100,
          accuracyRate: 100,
          currentStreak: 1,
          highestStreak: 1,
          multiplier: 1,
          totalInteractions: 1,
          activeSeconds: 60,
          unlockedPrizeIds: [],
          choiceHistory: []
        };
      }
    } catch {}
    return null;
  });

  const oAuthClientId = firebaseConfig.oAuthClientId || '820027070342-jdqa3bfnp43110cll3ro31t3qtqedfdr.apps.googleusercontent.com';

  // Helper to upsert player profile on Firestore
  const upsertPlayerProfile = async (currentUser: User) => {
    try {
      const playerDocRef = doc(db, 'players', currentUser.uid);
      const snap = await getDoc(playerDocRef);
      const savedAvatar = localStorage.getItem('sgx_attendee_avatar_png') || '';
      
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (!data.avatar && (savedAvatar || currentUser.photoURL)) {
          data.avatar = savedAvatar || currentUser.photoURL || '';
        }
        if (!data.email && currentUser.email) {
          data.email = currentUser.email;
        }
        setPlayerProfile(data);
        try {
          localStorage.setItem('sgx_player_profile', JSON.stringify(data));
        } catch {}
      } else {
        const initialProfile: UserProfile = {
          id: currentUser.uid,
          nickname: currentUser.displayName || currentUser.email?.split('@')[0] || 'Spatialgineer',
          email: currentUser.email || '',
          isAnonymous: currentUser.isAnonymous,
          avatar: currentUser.photoURL || savedAvatar || '',
          avatarSeed: currentUser.uid.slice(0, 6),
          tenantId: 'tenant_sgx_stage',
          eventId: 'event_live_cyoa',
          totalScore: 150,
          accuracyRate: 100,
          currentStreak: 1,
          highestStreak: 1,
          multiplier: 1,
          totalInteractions: 1,
          activeSeconds: 60,
          unlockedPrizeIds: [],
          choiceHistory: [],
        };

        await setDoc(playerDocRef, {
          ...initialProfile,
          uid: currentUser.uid,
          username: initialProfile.nickname,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        setPlayerProfile(initialProfile);
        try {
          localStorage.setItem('sgx_player_profile', JSON.stringify(initialProfile));
        } catch {}
      }
    } catch (e) {
      console.warn('Player profile upsert notice:', e);
    }
  };

  // Synchronize Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError(null);

      if (currentUser) {
        setUser(currentUser);
        await upsertPlayerProfile(currentUser);

        // Check if director / admin role - Strictly info@spatialgineers.com
        if (!currentUser.isAnonymous) {
          const emailLower = currentUser.email?.toLowerCase().trim() || '';
          const isMaster = emailLower === AUTHORIZED_SUPER_ADMIN_EMAIL.toLowerCase();
          setIsAdmin(isMaster);
        } else {
          setIsAdmin(false);
        }
      } else {
        // Fallback: guest state without throwing unhandled operations
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          setUser(null);
          setIsAdmin(false);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const signInAnonymouslyUser = async () => {
    try {
      setAuthError(null);
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Anonymous sign-in error:', err);
      setAuthError(err?.message || 'Error al iniciar sesión anónima');
    }
  };

  // Direct synchronous Google Sign In with standard Firebase Auth Popup
  const signInWithGoogle = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setUser(result.user);
        await upsertPlayerProfile(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked') {
        setAuthError('POPUP_BLOCKED');
      } else if (code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
        setAuthError(`UNAUTHORIZED_DOMAIN:${currentDomain}`);
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Ventana de autenticación cerrada.');
      } else {
        setAuthError(err?.message || 'Error al iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services native token credential sign in (Bypasses popup blocker completely!)
  const signInWithGoogleCredential = async (idToken: string) => {
    setAuthError(null);
    setLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      if (result.user) {
        setUser(result.user);
        await upsertPlayerProfile(result.user);
      }
    } catch (err: any) {
      console.error('Google Credential Sign-In error:', err);
      setAuthError(err?.message || 'Error al procesar credencial de Google.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthError('Correo o contraseña incorrectos.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('Dirección de correo electrónico inválida.');
      } else {
        setAuthError(err?.message || 'Error al iniciar sesión con correo y contraseña.');
      }
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      setAuthError(null);
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Email sign-up error:', err);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setAuthError('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
      } else if (code === 'auth/weak-password') {
        setAuthError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setAuthError(err?.message || 'Error al crear cuenta con correo y contraseña.');
      }
    }
  };

  const savePlayerProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const playerDocRef = doc(db, 'players', user.uid);
      const savedAvatar = localStorage.getItem('sgx_attendee_avatar_png');
      const merged: UserProfile = {
        id: user.uid,
        nickname: updates.nickname || playerProfile?.nickname || `Player_${user.uid.slice(0, 5)}`,
        email: updates.email !== undefined ? updates.email : playerProfile?.email || '',
        isAnonymous: user.isAnonymous,
        avatar: updates.avatar !== undefined ? updates.avatar : (playerProfile?.avatar || savedAvatar || ''),
        avatarSeed: updates.avatarSeed || playerProfile?.avatarSeed || user.uid.slice(0, 6),
        tenantId: updates.tenantId || playerProfile?.tenantId || 'tenant_sgx_stage',
        eventId: updates.eventId || playerProfile?.eventId || 'event_live_cyoa',
        totalScore: updates.totalScore !== undefined ? updates.totalScore : (playerProfile?.totalScore || 0),
        accuracyRate: updates.accuracyRate !== undefined ? updates.accuracyRate : (playerProfile?.accuracyRate || 100),
        currentStreak: updates.currentStreak !== undefined ? updates.currentStreak : (playerProfile?.currentStreak || 0),
        highestStreak: updates.highestStreak !== undefined ? updates.highestStreak : (playerProfile?.highestStreak || 0),
        multiplier: updates.multiplier !== undefined ? updates.multiplier : (playerProfile?.multiplier || 1),
        totalInteractions: updates.totalInteractions !== undefined ? updates.totalInteractions : (playerProfile?.totalInteractions || 0),
        activeSeconds: updates.activeSeconds !== undefined ? updates.activeSeconds : (playerProfile?.activeSeconds || 0),
        unlockedPrizeIds: updates.unlockedPrizeIds || playerProfile?.unlockedPrizeIds || [],
        choiceHistory: updates.choiceHistory || playerProfile?.choiceHistory || [],
      };

      if (merged.avatar) {
        try {
          localStorage.setItem('sgx_attendee_avatar_png', merged.avatar);
        } catch {}
      }
      try {
        localStorage.setItem('sgx_player_profile', JSON.stringify(merged));
      } catch {}

      await setDoc(playerDocRef, {
        ...merged,
        uid: user.uid,
        username: merged.nickname,
        updatedAt: new Date().toISOString(),
        createdAt: (playerProfile as any)?.createdAt || new Date().toISOString(),
      }, { merge: true });

      setPlayerProfile(merged);
    } catch (err: any) {
      console.error('Error saving player profile to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, `players/${user.uid}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      setPlayerProfile(null);
      // Re-sign in anonymously so game state is never lost
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  const isSuperAdmin = user?.email?.toLowerCase() === AUTHORIZED_SUPER_ADMIN_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isSuperAdmin,
        isAnonymous: !!user?.isAnonymous,
        authError,
        oAuthClientId,
        playerProfile,
        signInWithGoogle,
        signInWithGoogleCredential,
        signInAnonymouslyUser,
        signInWithEmail,
        signUpWithEmail,
        clearAuthError,
        savePlayerProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

