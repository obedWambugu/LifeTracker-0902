import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  isPremium: boolean;
  premiumUntil: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
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
    localStorage.setItem('lt_token', data.token);
    setUser(data.user);
  };

  const register = async (email: string, name: string, password: string) => {
    const data = await api.post('/auth/register', { email, name, password });
    localStorage.setItem('lt_token', data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('lt_token');
    setUser(null);
  };

  const isPremium = !!(user?.isPremium);

  return (
    <AuthContext.Provider value={{ user, loading, isPremium, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
