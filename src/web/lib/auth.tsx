import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  onboarded: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  emailVerifiedAt: string | null;
  isEmailVerified: boolean;
  isPremium: boolean;
  premiumUntil: string | null;
  isTrial: boolean;
  isPostTrial: boolean;
  trialDaysLeft: number;
}

interface RegisterResponse {
  verificationRequired: true;
  email: string;
  message: string;
  verificationEmailSent: boolean;
  verificationLink?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  isTrial: boolean;
  isPostTrial: boolean;
  trialDaysLeft: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<RegisterResponse>;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const profile = await api.get('/auth/profile');
      setUser(profile);
    } catch {
      localStorage.removeItem('lt_token');
      setUser(null);
    }
  };

  const setSession = (token: string, nextUser: User) => {
    localStorage.setItem('lt_token', token);
    setUser(nextUser);
  };

  useEffect(() => {
    const token = localStorage.getItem('lt_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post('/auth/login', { email, password });
    setSession(data.token, data.user);
  };

  const register = async (email: string, name: string, password: string) => {
    return api.post('/auth/register', { email, name, password });
  };

  const logout = () => {
    localStorage.removeItem('lt_token');
    setUser(null);
  };

  const isPremium = !!(user?.isPremium);
  const isTrial = !!(user?.isTrial);
  const isPostTrial = !!(user?.isPostTrial);
  const trialDaysLeft = user?.trialDaysLeft ?? 0;

  return (
    <AuthContext.Provider value={{ user, loading, isPremium, isTrial, isPostTrial, trialDaysLeft, login, register, setSession, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
