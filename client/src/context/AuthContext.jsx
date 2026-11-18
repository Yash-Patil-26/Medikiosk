import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';
import { clearKioskCredentials } from '../services/kioskCredentials.js';
import i18n from '../i18n/i18n.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      setUser(userData);
      // Apply user's preferred language when user data is loaded
      if (userData?.preferred_language) {
        i18n.changeLanguage(userData.preferred_language);
      }
      return userData;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (identifierType, identifier, password) => {
    const response = await api.post('/auth/login', {
      identifier_type: identifierType,
      identifier,
      password
    });
    clearKioskCredentials();
    const userData = response.data.user;
    setUser(userData);
    // Apply user's preferred language after login
    if (userData?.preferred_language) {
      i18n.changeLanguage(userData.preferred_language);
    }
    return userData;
  };

  const register = async registration => {
    const response = await api.post('/auth/register', registration);
    clearKioskCredentials();
    const userData = response.data.user;
    setUser(userData);
    // Apply user's preferred language after registration
    if (userData?.preferred_language) {
      i18n.changeLanguage(userData.preferred_language);
    }
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearKioskCredentials();
      setUser(null);
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(prev => ({ ...prev, ...updatedUserData }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
