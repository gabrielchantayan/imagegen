'use client';

import { createContext, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <AuthContext.Provider value={{ logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const use_auth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('use_auth must be used within AuthProvider');
  }
  return context;
};
