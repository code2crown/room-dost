import { useEffect, useState } from 'react';
import { Copy, RefreshCw, BellRing, Smartphone, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function RoomSettingsPage() {
  const { user, setUser, room, setRoom, refreshRoom } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    upiId: user?.upiId || '',
  });

  const [roomForm, setRoomForm] = useState({
    name: room?.name || '',
    address: room?.address || '',
    monthlyRent: room?.monthlyRent || 0,
    wifiBill: room?.wifiBill || 0,
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const copyInvite = () => {
    navigator.clipboard.writeText(room?.inviteCode || '');
    toast.success('Invite code copied!');
  };

  const regenerateCode = async () => {
    try {
      const { data } = await api.post('/rooms/regenerate-code');
      setRoom((r) => ({ ...r, inviteCode: data.inviteCode }));
      toast.success(`New invite code: ${data.inviteCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Only admin can regenerate');
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/profile', profile);
      setUser(data.user);
      refreshRoom();
      toast.success('Profile updated!');
    } catch {
      toast.error('Update failed');
    }
  };

  const saveRoom = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/rooms/settings', roomForm);
      setRoom(data.room);
      toast.success('Room settings saved!');
    } catch {
      toast.error('Failed to save room settings');
    }
  };

  const enableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      return toast.error('Browser notifications not supported on this device');
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      toast.success('Real-time browser notifications enabled!');
    } else {
      toast.error('Permission denied');
    }
  };

  const installPWA = async () => {
    if (!deferredPrompt) {
      return toast('Use browser menu → "Add to Home Screen" to install Room Dost.');
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Room & Settings</h2>
        <p className="text-sm text-slate-500">Invite roommates, manage UPI details, and install PWA app</p>
      </div>

      {/* Invite Code & PWA Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-slate-900">Room Invite Code</h3>
          <p className="text-xs text-slate-500">
            Share this code with your roommates so they can join <b>{room?.name}</b>.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-center text-2xl font-extrabold tracking-widest text-indigo-700">
              {room?.inviteCode}
            </div>
            <button onClick={copyInvite} className="btn-secondary p-3" title="Copy Code">
              <Copy className="w-5 h-5" />
            </button>
            {user?.role === 'admin' && (
              <button onClick={regenerateCode} className="btn-secondary p-3" title="Regenerate">
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <h3 className="font-bold text-slate-900">App & Notifications (PWA)</h3>
          <p className="text-xs text-slate-500">
            Install Room Dost on your phone home screen and turn on instant push alerts.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button onClick={installPWA} className="btn-primary">
              <Smartphone className="w-4 h-4" /> Install Room Dost App
            </button>
            <button onClick={enableBrowserNotifications} className="btn-secondary">
              <BellRing className="w-4 h-4" /> Enable Push Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Roommates Directory */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-3">
          Roommates ({room?.members?.length || 0})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(room?.members || []).map((m) => (
            <div key={m._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div
                className="h-10 w-10 rounded-full text-white font-bold flex items-center justify-center shrink-0"
                style={{ backgroundColor: m.avatarColor || '#4F46E5' }}
              >
                {m.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {m.name} {m.role === 'admin' && <span className="text-[10px] text-indigo-600">(Admin)</span>}
                </p>
                <p className="text-xs text-slate-500 truncate">{m.upiId || m.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile & Room Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={saveProfile} className="card p-5 space-y-4">
          <h3 className="font-bold text-slate-900">Your Profile & UPI</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              className="input-field"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
            <input
              className="input-field"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">UPI ID (for settlements)</label>
            <input
              className="input-field"
              placeholder="yourname@okaxis"
              value={profile.upiId}
              onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" /> Save Profile
          </button>
        </form>

        <form onSubmit={saveRoom} className="card p-5 space-y-4">
          <h3 className="font-bold text-slate-900">Room Details</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room Name</label>
            <input
              className="input-field"
              value={roomForm.name}
              onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
            <input
              className="input-field"
              value={roomForm.address}
              onChange={(e) => setRoomForm({ ...roomForm, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Rent (₹)</label>
              <input
                type="number"
                className="input-field"
                value={roomForm.monthlyRent}
                onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WiFi Bill (₹)</label>
              <input
                type="number"
                className="input-field"
                value={roomForm.wifiBill}
                onChange={(e) => setRoomForm({ ...roomForm, wifiBill: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            <Save className="w-4 h-4" /> Update Room
          </button>
        </form>
      </div>
    </div>
  );
}
