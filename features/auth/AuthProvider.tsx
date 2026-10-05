import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

import { getFirebaseAuth } from '@/firebase/auth';
import { isFirebaseConfigured } from '@/firebase/env';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const unsub = onAuthStateChanged(auth, (next) => {
      if (cancelled) {
        return;
      }
      setUser(next);
      setLoading(false);
    });

    void auth.authStateReady().then(() => {
      if (cancelled) {
        return;
      }
      setUser(auth.currentUser);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured,
      signOut: async () => {
        const auth = getFirebaseAuth();
        if (!auth) {
          return;
        }
        await firebaseSignOut(auth);
      },
    }),
    [user, loading, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
