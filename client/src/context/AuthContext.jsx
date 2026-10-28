import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api.js';
import { clearKioskCredentials } from '../services/kioskCredentials.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      return response.data.user;
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
    setUser(response.data.user);
    return response.data.user;
  };

  const register = async registration => {
    const response = await api.post('/auth/register', registration);
    clearKioskCredentials();
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearKioskCredentials();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
