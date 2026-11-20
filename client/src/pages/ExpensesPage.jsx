import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Download, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const CATEGORIES = [
  'Food & Groceries',
  'Rent',
  'Electricity',
  'WiFi',
  'Gas & Water',
  'Cleaning & Essentials',
  'Outing',
  'Other',
];

export default function ExpensesPage() {
  const { user, room } = useAuth();
  const { lastUpdateTick } = useSocket();
  const members = room?.members || [];

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'Food & Groceries',
    paidBy: user?._id || '',
    date: new Date().toISOString().slice(0, 10),
    splitType: 'equal',
    splitBetween: members.map((m) => m._id),
    customMap: {},
    notes: '',
  });

  useEffect(() => {
    if (members.length > 0 && form.splitBetween.length === 0) {
      setForm((f) => ({
        ...f,
        paidBy: f.paidBy || user?._id || members[0]._id,
        splitBetween: members.map((m) => m._id),
      }));
    }
  }, [members, user?._id]);

  const fetchExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams({ month, category: categoryFilter });
      if (search.trim()) params.append('search', search.trim());
      const { data } = await api.get(`/expenses?${params.toString()}`);
      setExpenses(data.expenses || []);
    } catch {
      toast.error('Failed to load expenses');
    }
  }, [month, categoryFilter, search]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, lastUpdateTick]);

  const toggleParticipant = (uid) => {
    setForm((prev) => {
      const exists = prev.splitBetween.includes(uid);
      const next = exists
        ? prev.splitBetween.filter((id) => id !== uid)
        : [...prev.splitBetween, uid];
      return { ...prev, splitBetween: next };
    });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (form.splitType === 'equal' && form.splitBetween.length === 0) {
      return toast.error('Select at least one roommate to split with');
    }
    try {
      const payload = {
        title: form.title,
        amount: Number(form.amount),
        category: form.category,
        paidBy: form.paidBy || user._id,
        date: form.date,
        splitType: form.splitType,
        notes: form.notes,
      };
      if (form.splitType === 'equal') {
        payload.splitBetween = form.splitBetween;
      } else {
        payload.customSplits = Object.entries(form.customMap).map(([u, share]) => ({
          user: u,
          share: Number(share || 0),
        }));
      }

      await api.post('/expenses', payload);
      toast.success('Expense added & roommates notified!');
      setModalOpen(false);
      setForm({
        title: '',
        amount: '',
        category: 'Food & Groceries',
        paidBy: user?._id || '',
        date: new Date().toISOString().slice(0, 10),
        splitType: 'equal',
        splitBetween: members.map((m) => m._id),
        customMap: {},
        notes: '',
      });
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add expense');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense entry?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/expenses/export?month=${month}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `room-dost-expenses-${month}.csv`;
      a.click();
    } catch {
      toast.error('Export failed');
    }
  };

  const totalFiltered = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Daily Expenses</h2>
          <p className="text-sm text-slate-500">
            Showing {expenses.length} entries • Total: <b>₹{totalFiltered.toLocaleString('en-IN')}</b>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={handleExportCSV} className="btn-secondary">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input-field"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field"
        >
          <option value="All">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search item (e.g. Milk, WiFi)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Expense List */}
      <div className="card overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No expenses found for this filter. Click "Add Expense" to log your first item.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item & Category</th>
                  <th className="px-4 py-3">Paid By</th>
                  <th className="px-4 py-3">Split Between</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                      {new Date(exp.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{exp.title}</p>
                      <span className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{exp.paidBy?.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {exp.splits.map((sp) => (
                          <span
                            key={sp.user?._id}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                          >
                            {sp.user?.name}: ₹{sp.share}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Daily Expense</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Sabzi & Milk, WiFi Bill, Electricity"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="1"
                    className="input-field"
                    placeholder="500"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    className="input-field"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paid By (Kisne Pay Kiya)</label>
                  <select
                    className="input-field"
                    value={form.paidBy}
                    onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
                  >
                    {members.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Split Mode */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Split Mode</label>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, splitType: 'equal' })}
                      className={`px-3 py-1 rounded-md font-semibold ${
                        form.splitType === 'equal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Equal Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, splitType: 'custom' })}
                      className={`px-3 py-1 rounded-md font-semibold ${
                        form.splitType === 'custom' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Custom ₹
                    </button>
                  </div>
                </div>

                {form.splitType === 'equal' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {members.map((m) => {
                      const checked = form.splitBetween.includes(m._id);
                      return (
                        <label
                          key={m._id}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-sm ${
                            checked
                              ? 'border-indigo-500 bg-indigo-50/60 text-indigo-900 font-medium'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(m._id)}
                            className="rounded text-indigo-600"
                          />
                          <span className="truncate">{m.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m._id} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-700">{m.name}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="₹0"
                          className="input-field w-32 py-1.5"
                          value={form.customMap[m._id] || ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              customMap: { ...form.customMap, [m._id]: e.target.value },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <input
                  className="input-field"
                  placeholder="Shop name or extra details..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save & Notify Roommates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
