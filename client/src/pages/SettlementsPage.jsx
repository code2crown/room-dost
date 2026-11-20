import { useEffect, useState, useCallback } from 'react';
import { ArrowRight, CheckCircle2, Copy, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

export default function SettlementsPage() {
  const { lastUpdateTick } = useSocket();
  const [data, setData] = useState({ balances: [], transfers: [], history: [] });
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [settleForm, setSettleForm] = useState({ amount: '', method: 'UPI', note: '' });

  const loadSummary = useCallback(async () => {
    try {
      const res = await api.get('/settlements/summary');
      setData(res.data);
    } catch {
      toast.error('Failed to load settlement summary');
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, lastUpdateTick]);

  const openSettleModal = (t) => {
    setActiveTransfer(t);
    setSettleForm({ amount: String(t.amount), method: 'UPI', note: '' });
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settlements', {
        from: activeTransfer.from._id,
        to: activeTransfer.to._id,
        amount: Number(settleForm.amount),
        method: settleForm.method,
        note: settleForm.note,
      });
      toast.success('Settlement recorded & roommates notified!');
      setActiveTransfer(null);
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record settlement');
    }
  };

  const copyUpi = (upi) => {
    navigator.clipboard.writeText(upi);
    toast.success(`UPI ID copied: ${upi}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Hisab & Settlements</h2>
        <p className="text-sm text-slate-500">
          Kisko kitna dena hai aur kisko kitna lena hai — auto-simplified minimum transfers
        </p>
      </div>

      {/* Simplified Transfers */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-3">Pending Settlements (Who Pays Whom)</h3>
        {data.transfers.length === 0 ? (
          <div className="p-6 rounded-xl bg-emerald-50 text-emerald-700 text-center font-semibold text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Sab hisab barabar hai! No pending dues.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.transfers.map((t, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm">
                    <span className="text-rose-600">{t.from.name}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="text-emerald-700">{t.to.name}</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900">
                    ₹{t.amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                  {t.to.upiId ? (
                    <button
                      onClick={() => copyUpi(t.to.upiId)}
                      className="text-xs text-indigo-600 hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> UPI: {t.to.upiId}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">No UPI ID saved</span>
                  )}
                  <button onClick={() => openSettleModal(t)} className="btn-primary py-1.5 px-3 text-xs">
                    Mark Paid / Settled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-Member Balance Breakdown */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-3">Roommate Balance Sheet</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Roommate</th>
                <th className="px-4 py-3 text-right">Total Paid</th>
                <th className="px-4 py-3 text-right">Total Share</th>
                <th className="px-4 py-3 text-right">Net Balance</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.balances.map((b) => (
                <tr key={b.user._id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{b.user.name}</td>
                  <td className="px-4 py-3 text-right">₹{b.totalPaid.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right">₹{b.totalShare.toLocaleString('en-IN')}</td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      b.netBalance > 0.5
                        ? 'text-emerald-600'
                        : b.netBalance < -0.5
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {b.netBalance >= 0 ? `+₹${b.netBalance}` : `-₹${Math.abs(b.netBalance)}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        b.netBalance > 0.5
                          ? 'bg-emerald-50 text-emerald-700'
                          : b.netBalance < -0.5
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {b.netBalance > 0.5 ? 'Lena Hai' : b.netBalance < -0.5 ? 'Dena Hai' : 'Settled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement History */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-3">Settlement History</h3>
        {data.history.length === 0 ? (
          <p className="text-sm text-slate-400">No settlements recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.history.map((s) => (
              <div key={s._id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-800">
                    <b>{s.from?.name}</b> paid <b>{s.to?.name}</b> via{' '}
                    <span className="text-indigo-600 font-semibold">{s.method}</span>
                  </p>
                  {s.note && <p className="text-xs text-slate-500">{s.note}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">₹{s.amount.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(s.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Settlement Modal */}
      {activeTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Record Payment Settlement</h3>
              <button onClick={() => setActiveTransfer(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              <b>{activeTransfer.from.name}</b> paying <b>{activeTransfer.to.name}</b>
            </p>
            <form onSubmit={handleSettle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="input-field"
                  value={settleForm.amount}
                  onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  className="input-field"
                  value={settleForm.method}
                  onChange={(e) => setSettleForm({ ...settleForm, method: e.target.value })}
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note (Optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. Oct rent + food hisab clear"
                  value={settleForm.note}
                  onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setActiveTransfer(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
