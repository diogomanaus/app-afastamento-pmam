import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import api from '../api/axios';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('scaf_token');
    const saved = localStorage.getItem('scaf_user');
    if (token && saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  async function login(email: string, senha: string) {
    const res = await api.post('/auth/login', { email, senha });
    localStorage.setItem('scaf_token', res.data.token);
    localStorage.setItem('scaf_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem('scaf_token');
    localStorage.removeItem('scaf_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
