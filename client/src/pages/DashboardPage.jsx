import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Plus,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#64748B'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { lastUpdateTick } = useSocket();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [analytics, setAnalytics] = useState({ totalSpent: 0, count: 0, byCategory: [], byMember: [] });
  const [settlementData, setSettlementData] = useState({ balances: [], transfers: [] });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {
      const [anRes, setRes, expRes, invRes] = await Promise.all([
        api.get(`/expenses/analytics?month=${month}`),
        api.get('/settlements/summary'),
        api.get(`/expenses?month=${month}`),
        api.get('/inventory'),
      ]);
      setAnalytics(anRes.data);
      setSettlementData(setRes.data);
      setRecentExpenses((expRes.data.expenses || []).slice(0, 5));
      setLowStockItems((invRes.data.items || []).filter((i) => i.status !== 'in_stock'));
    } catch (err) {
      console.error(err);
    }
  }, [month]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, lastUpdateTick]);

  const myBalanceObj = settlementData.balances.find((b) => b.user._id === user?._id);
  const myNet = myBalanceObj?.netBalance || 0;
  const myMonthlyShare = analytics.byMember.find((m) => m.name === user?.name)?.share || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Room Dashboard</h2>
          <p className="text-sm text-slate-500">Monthly spending, balances, and urgent room alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input-field w-auto py-2"
          />
          <Link to="/expenses" className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" /> Add Expense
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Month Total Spend</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            ₹{analytics.totalSpent.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-500 mt-1">{analytics.count} entries in {month}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Your Month Share</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            ₹{myMonthlyShare.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-500 mt-1">Your combined split this month</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Your Overall Net</span>
            <div
              className={`p-2 rounded-xl ${
                myNet >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-extrabold mt-2 ${
              myNet >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {myNet >= 0 ? `+₹${myNet.toLocaleString('en-IN')}` : `-₹${Math.abs(myNet).toLocaleString('en-IN')}`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {myNet > 0.5 ? 'Aapko lena hai (You are owed)' : myNet < -0.5 ? 'Aapko dena hai (You owe)' : 'All settled up!'}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Ration / Stock Alerts</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{lowStockItems.length}</p>
          <Link to="/inventory" className="text-xs text-indigo-600 font-semibold hover:underline mt-1 inline-flex items-center gap-1">
            View shopping list <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-1">Category Breakdown</h3>
          <p className="text-xs text-slate-500 mb-4">Food, Rent, Electricity, WiFi & others ({month})</p>
          {analytics.byCategory.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              No expenses recorded for {month} yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.byCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={82}
                      paddingAngle={3}
                    >
                      {analytics.byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {analytics.byCategory.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-slate-700 font-medium truncate">{cat.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 whitespace-nowrap ml-2">
                      ₹{cat.value.toLocaleString('en-IN')} ({cat.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-1">Roommate Paid vs Share</h3>
          <p className="text-xs text-slate-500 mb-4">Who paid how much vs their actual share ({month})</p>
          {analytics.byMember.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">
              Add expenses to see roommate comparison.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byMember}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />
                  <Legend />
                  <Bar dataKey="paid" name="Paid (₹)" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="share" name="Share (₹)" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Expenses & Urgent Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Recent Expenses</h3>
            <Link to="/expenses" className="text-xs font-semibold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No expenses yet this month.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentExpenses.map((e) => (
                <div key={e._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{e.title}</p>
                    <p className="text-xs text-slate-500">
                      {e.category} • Paid by <b>{e.paidBy?.name}</b> • Split {e.splits.length} ways
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">₹{e.amount.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Kya Lana Hai (Shopping List)</h3>
            <Link to="/inventory" className="text-xs font-semibold text-indigo-600 hover:underline">
              Manage
            </Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl p-4 text-center font-medium">
              Sab saman stock me hai!
            </p>
          ) : (
            <div className="space-y-2.5">
              {lowStockItems.slice(0, 6).map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.quantity || item.category}</p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      item.status === 'out'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.status === 'out' ? 'Khatm' : 'Low'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
