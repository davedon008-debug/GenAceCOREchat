'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { disconnectSocket } from '../lib/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [activePersona, setActivePersona] = useState(null);
  const [user, setUser] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (typeof window === 'undefined') return;

      try {
        const savedToken = localStorage.getItem('donchat_token');
        const savedPersona = localStorage.getItem('donchat_persona');
        const savedUser = localStorage.getItem('donchat_user');

        if (savedToken && savedPersona && savedUser) {
          try {
            const parsedPersona = JSON.parse(savedPersona);
            const parsedUser = JSON.parse(savedUser);
            if (isMounted) {
              api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
              setToken(savedToken);
              setActivePersona(parsedPersona);
              setUser(parsedUser);
              setLoading(false);
            }
            fetchPersonas();
            return;
          } catch (e) {
            console.error('Error parsing stored auth data:', e);
          }
        }
      } catch (err) {
        console.error('Failed auth initialization:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    return () => { isMounted = false; };
  }, []);

  const fetchPersonas = async () => {
    try {
      const res = await api.get('/personas');
      if (res.data.success) {
        setPersonas(res.data.personas);
      }
    } catch (err) {
      console.error('Failed to fetch personas:', err);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token, user, activePersona, personas } = res.data;
      localStorage.setItem('donchat_token', token);
      localStorage.setItem('donchat_user', JSON.stringify(user));
      localStorage.setItem('donchat_persona', JSON.stringify(activePersona));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
      localStorage.setItem('donchat_token', token);
      localStorage.setItem('donchat_user', JSON.stringify(user));
      localStorage.setItem('donchat_persona', JSON.stringify(activePersona));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      setUser(user);
      setActivePersona(activePersona);
      setPersonas([activePersona]);
      return res.data;
    }
  };

  const switchPersona = async (targetPersonaId) => {
    const res = await api.post('/personas/switch', { targetPersonaId });
    if (res.data.success) {
      const { token, activePersona: newPersona } = res.data;
      localStorage.setItem('donchat_token', token);
      localStorage.setItem('donchat_persona', JSON.stringify(newPersona));
      localStorage.removeItem('donchat_active_id');
      localStorage.removeItem('donchat_active_type');
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setToken(token);
      setActivePersona(newPersona);
      disconnectSocket(); // Refresh socket connection with new persona token
      return newPersona;
    }
  };

  const createNewPersona = async (data) => {
    const res = await api.post('/personas', data);
    if (res.data.success) {
      setPersonas(prev => [...prev, res.data.persona]);
      return res.data.persona;
    }
  };

  const loginDemo = async () => {
    const res = await api.post('/auth/demo');
    if (res.data.success) {
      const { token: t, user: u, activePersona: p, personas: list } = res.data;
      localStorage.setItem('donchat_token', t);
      localStorage.setItem('donchat_user', JSON.stringify(u));
      localStorage.setItem('donchat_persona', JSON.stringify(p));
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      setToken(t);
      setUser(u);
      setActivePersona(p);
      setPersonas(list || []);
      return res.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('donchat_token');
    localStorage.removeItem('donchat_user');
    localStorage.removeItem('donchat_persona');
    localStorage.removeItem('donchat_active_id');
    localStorage.removeItem('donchat_active_type');
    disconnectSocket();
    setToken(null);
    setUser(null);
    setActivePersona(null);
    setPersonas([]);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      activePersona,
      personas,
      token,
      loading,
      login,
      register,
      loginDemo,
      switchPersona,
      createNewPersona,
      logout,
      refreshPersonas: fetchPersonas,
      setActivePersona: (persona) => {
        setActivePersona(persona);
        localStorage.setItem('donchat_persona', JSON.stringify(persona));
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
