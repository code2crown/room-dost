import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import api from '../services/api';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user, room } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUpdateTick, setLastUpdateTick] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user?.room) return;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore if room not joined yet
    }
  }, [user?.room]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const token = localStorage.getItem('room_dost_token');
    if (!user || !room || !token) return;

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      s.emit('room:join_channel', room._id);
    });

    s.on('room:notification', (notif) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      const isSelf = notif.actor?._id === user._id;
      if (!isSelf) {
        setUnreadCount((c) => c + 1);
        toast(`${notif.title}: ${notif.message}`, {
          icon: '🔔',
          duration: 4500,
        });

        // Native Browser / PWA Notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Room Dost — ${notif.title}`, {
            body: notif.message,
            icon: '/pwa-192x192.png',
          });
        }
      }
    });

    s.on('room:data_updated', () => {
      setLastUpdateTick((t) => t + 1);
    });

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [user?._id, room?._id]);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readBy: [...(n.readBy || []), user._id] }))
      );
    } catch {
      // ignore
    }
  };

  return (
    <SocketContext.Provider
      value={{ socket, notifications, unreadCount, markAllRead, fetchNotifications, lastUpdateTick }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
