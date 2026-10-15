import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession } from '../types/cafeteria';
import { CafeteriaAPI } from '../services/api';

interface AuthContextType {
  user: UserSession | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => CafeteriaAPI.getStoredSession());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = CafeteriaAPI.getStoredSession();
    if (saved) {
      setUser(saved);
    }
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const session = await CafeteriaAPI.login(username, password);
      setUser(session);
      setIsLoginModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    CafeteriaAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoginModalOpen,
        setIsLoginModalOpen,
        loading
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
