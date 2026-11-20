import { useEffect, useState, useCallback } from 'react';
import { Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const CATEGORIES = ['Kitchen', 'Bathroom', 'Cleaning', 'Snacks & Drinks', 'Utility', 'Other'];

export default function InventoryPage() {
  const { lastUpdateTick } = useSocket();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('shopping');
  const [form, setForm] = useState({ name: '', category: 'Kitchen', quantity: '', status: 'out' });
  const [restockItem, setRestockItem] = useState(null);
  const [restockForm, setRestockForm] = useState({ addExpense: true, amount: '' });

  const loadItems = useCallback(async () => {
    try {
      const { data } = await api.get('/inventory');
      setItems(data.items || []);
    } catch {
      toast.error('Failed to load stock list');
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems, lastUpdateTick]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory', form);
      toast.success('Item added to room stock!');
      setForm({ name: '', category: 'Kitchen', quantity: '', status: 'out' });
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/inventory/${id}/status`, { status });
      toast.success('Stock status updated!');
      loadItems();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/inventory/${restockItem._id}/restock`, {
        addExpense: restockForm.addExpense,
        amount: Number(restockForm.amount || 0),
      });
      toast.success(
        restockForm.addExpense
          ? 'Item restocked & expense logged automatically!'
          : 'Item marked In Stock!'
      );
      setRestockItem(null);
      setRestockForm({ addExpense: true, amount: '' });
      loadItems();
    } catch {
      toast.error('Restock failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/inventory/${id}`);
      loadItems();
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered =
    tab === 'shopping'
      ? items.filter((i) => i.status === 'out' || i.status === 'low')
      : tab === 'in_stock'
      ? items.filter((i) => i.status === 'in_stock')
      : items;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Room Ration & Stock Tracker</h2>
        <p className="text-sm text-slate-500">
          Jo saman khatm ho gaya ya hone wala hai uski entry karo — sabko instant alert milega
        </p>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAdd} className="card p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input
          required
          placeholder="Item (e.g. Atta, Oil, Dishwash)"
          className="input-field sm:col-span-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          placeholder="Qty (e.g. 5 kg, 2 pack)"
          className="input-field"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <select
          className="input-field"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="out">Khatm Ho Gaya (Out)</option>
          <option value="low">Hone Wala Hai (Low)</option>
          <option value="in_stock">In Stock</option>
        </select>
        <button type="submit" className="btn-primary">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </form>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'shopping', label: `Shopping List (${items.filter((i) => i.status !== 'in_stock').length})` },
          { key: 'all', label: `All Items (${items.length})` },
          { key: 'in_stock', label: `In Stock (${items.filter((i) => i.status === 'in_stock').length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              tab === t.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400">
          No items in this list.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div key={item._id} className="card p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{item.name}</h3>
                  <p className="text-xs text-slate-500">
                    {item.category} {item.quantity ? `• ${item.quantity}` : ''} • Updated by{' '}
                    {item.updatedBy?.name}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  {[
                    { k: 'out', l: 'Khatm', active: 'bg-rose-600 text-white' },
                    { k: 'low', l: 'Low', active: 'bg-amber-500 text-white' },
                    { k: 'in_stock', l: 'In Stock', active: 'bg-emerald-600 text-white' },
                  ].map((s) => (
                    <button
                      key={s.k}
                      onClick={() => updateStatus(item._id, s.k)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        item.status === s.k ? s.active : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>

                {item.status !== 'in_stock' && (
                  <button
                    onClick={() => setRestockItem(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Bought & Log ₹
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restock Modal */}
      {restockItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">Restock "{restockItem.name}"</h3>
              <button onClick={() => setRestockItem(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRestock} className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restockForm.addExpense}
                  onChange={(e) => setRestockForm({ ...restockForm, addExpense: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                Automatically add to Daily Expenses (Equal Split)
              </label>
              {restockForm.addExpense && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="e.g. 320"
                    value={restockForm.amount}
                    onChange={(e) => setRestockForm({ ...restockForm, amount: e.target.value })}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRestockItem(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Mark In Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
