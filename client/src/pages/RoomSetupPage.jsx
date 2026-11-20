import { useState } from 'react';
import { Home, KeyRound, PlusCircle, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function RoomSetupPage() {
  const { user, setUser, setRoom, logout } = useAuth();
  const [tab, setTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    address: '',
    monthlyRent: '',
    wifiBill: '',
  });
  const [inviteCode, setInviteCode] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/rooms/create', createForm);
      setRoom(data.room);
      setUser(data.user);
      toast.success(`Room "${data.room.name}" created! Invite Code: ${data.room.inviteCode}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/rooms/join', { inviteCode });
      setRoom(data.room);
      setUser(data.user);
      toast.success(`Joined "${data.room.name}"!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg card p-7 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Welcome, {user?.name}!</h1>
              <p className="text-xs text-slate-500">Create a new room or join your roommates</p>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary px-3 py-2 text-xs">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setTab('create')}
            className={`py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              tab === 'create' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Create New Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              tab === 'join' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Join with Code
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Flat Name</label>
              <input
                required
                className="input-field"
                placeholder="e.g. Flat 302 Boys, Laxmi Nagar"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address (Optional)</label>
              <input
                className="input-field"
                placeholder="Building / Sector / City"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Rent (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="12000"
                  value={createForm.monthlyRent}
                  onChange={(e) => setCreateForm({ ...createForm, monthlyRent: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WiFi Bill (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="799"
                  value={createForm.wifiBill}
                  onChange={(e) => setCreateForm({ ...createForm, wifiBill: e.target.value })}
                />
              </div>
            </div>
            <button disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Creating...' : 'Create Room & Get Invite Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                6-Character Room Invite Code
              </label>
              <input
                required
                className="input-field uppercase tracking-widest text-center text-lg font-bold"
                placeholder="A1B2C3"
                maxLength={8}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Ask your roommate for the invite code from their Room Settings page.
              </p>
            </div>
            <button disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
