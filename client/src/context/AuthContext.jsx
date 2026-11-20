import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem('room_dost_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      if (data.user?.room) {
        const roomRes = await api.get('/rooms/mine');
        setRoom(roomRes.data.room);
      } else {
        setRoom(null);
      }
    } catch {
      localStorage.removeItem('room_dost_token');
      setUser(null);
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('room_dost_token', data.token);
    setUser(data.user);
    if (data.user.room) {
      const roomRes = await api.get('/rooms/mine');
      setRoom(roomRes.data.room);
    }
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('room_dost_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('room_dost_token');
    setUser(null);
    setRoom(null);
  };

  const refreshRoom = async () => {
    if (!user?.room) return;
    const { data } = await api.get('/rooms/mine');
    setRoom(data.room);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, room, setRoom, loading, login, register, logout, refreshRoom }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
