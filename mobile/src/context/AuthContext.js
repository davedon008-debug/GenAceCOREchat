import React, { createContext, useContext, useState, useEffect } from 'react';
import storage from '../config/storage';
import api from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [activePersona, setActivePersona] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPersonas = async () => {
    try {
      const res = await api.get('/personas');
      if (res.data?.success && Array.isArray(res.data.personas)) {
        const fetchedList = res.data.personas;
        setPersonas(fetchedList);

        const savedPersonaStr = await storage.getItem('donchat_persona');
        let currentId = activePersona?._id;
        if (!currentId && savedPersonaStr) {
          try { currentId = JSON.parse(savedPersonaStr)?._id; } catch (e) {}
        }

        if (currentId) {
          const freshActive = fetchedList.find(p => String(p._id) === String(currentId));
          if (freshActive) {
            setActivePersona(freshActive);
            await storage.setItem('donchat_persona', JSON.stringify(freshActive));
          } else if (fetchedList.length > 0) {
            const defaultP = fetchedList.find(p => p.isDefault) || fetchedList[0];
            setActivePersona(defaultP);
            await storage.setItem('donchat_persona', JSON.stringify(defaultP));
          }
        } else if (fetchedList.length > 0) {
          const defaultP = fetchedList.find(p => p.isDefault) || fetchedList[0];
          setActivePersona(defaultP);
          await storage.setItem('donchat_persona', JSON.stringify(defaultP));
        }
      }
    } catch (err) {
      console.error('[AuthContext] Failed to fetch personas:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = await storage.getItem('donchat_token');
        const savedUser = await storage.getItem('donchat_user');
        const savedPersona = await storage.getItem('donchat_persona');

        if (savedToken && savedUser && savedPersona) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          setActivePersona(JSON.parse(savedPersona));
          setLoading(false);
          fetchPersonas();
          return;
        }
      } catch (err) {
        console.error('[AuthContext] Init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token, user, activePersona, personas } = res.data;
      await storage.setItem('donchat_token', token);
      await storage.setItem('donchat_user', JSON.stringify(user));
      await storage.setItem('donchat_persona', JSON.stringify(activePersona));

      setToken(token);
      setUser(user);
      setActivePersona(activePersona);
      setPersonas(personas || []);
      return res.data;
    }
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.data.success) {
      const { token, user, activePersona } = res.data;
      await storage.setItem('donchat_token', token);
      await storage.setItem('donchat_user', JSON.stringify(user));
      await storage.setItem('donchat_persona', JSON.stringify(activePersona));

      setToken(token);
      setUser(user);
      setActivePersona(activePersona);
      setPersonas([activePersona]);
      return res.data;
    }
  };

  const loginDemo = async () => {
    const res = await api.post('/auth/demo');
    if (res.data.success) {
      const { token: t, user: u, activePersona: p, personas: list } = res.data;
      await storage.setItem('donchat_token', t);
      await storage.setItem('donchat_user', JSON.stringify(u));
      await storage.setItem('donchat_persona', JSON.stringify(p));

      setToken(t);
      setUser(u);
      setActivePersona(p);
      setPersonas(list || []);
      return res.data;
    }
  };

  const switchPersona = async (targetPersonaId) => {
    const res = await api.post('/personas/switch', { targetPersonaId });
    if (res.data.success) {
      const { token: newToken, activePersona: newPersona } = res.data;
      await storage.setItem('donchat_token', newToken);
      await storage.setItem('donchat_persona', JSON.stringify(newPersona));

      setToken(newToken);
      setActivePersona(newPersona);
      return newPersona;
    }
  };

  const createNewPersona = async (data) => {
    const res = await api.post('/personas', data);
    if (res.data?.success) {
      setPersonas(prev => [...prev, res.data.persona]);
      return res.data.persona;
    }
  };

  const logout = async () => {
    await storage.removeItem('donchat_token');
    await storage.removeItem('donchat_user');
    await storage.removeItem('donchat_persona');

    setToken(null);
    setUser(null);
    setActivePersona(null);
    setPersonas([]);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        activePersona,
        personas,
        loading,
        login,
        register,
        loginDemo,
        switchPersona,
        createNewPersona,
        logout,
        fetchPersonas,
        refreshPersonas: fetchPersonas,
        setActivePersona: async (p) => {
          setActivePersona(p);
          await storage.setItem('donchat_persona', JSON.stringify(p));
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
