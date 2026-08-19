import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../../shared/types.js';
import { api, getStoredUser, clearStoredUser } from '../api.js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (name: string, email: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifySession() {
      const stored = getStoredUser();
      if (stored) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          // Token or user invalid
          clearStoredUser();
          setUser(null);
        }
      }
      setLoading(false);
    }
    verifySession();
  }, []);

  const login = async (name: string, email: string) => {
    const res = await api.login(name, email);
    setUser(res.user);
  };

  const logout = () => {
    clearStoredUser();
    setUser(null);
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
