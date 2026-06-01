import React, { useState, useMemo } from 'react';
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Users, Plus, Trash2, Edit2, 
  Download, Moon, Sun, LogOut, Shield, User, Key, Search, Filter, 
  AlertTriangle, CheckCircle, FileText, QrCode, ClipboardList, Database,
  ArrowRight, CreditCard, Image as ImageIcon, Sparkles, RefreshCw, Upload, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';

// Categories and themes
const CATEGORIES = [
  'Groceries', 'Vegetables', 'Milk', 'Water Can', 'Gas Cylinder', 
  'Electricity', 'Internet', 'Cleaning', 'Cooking', 'Rent', 
  'Maintenance', 'Snacks', 'Miscellaneous'
];

const COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', 
  '#f43f5e', '#3b82f6', '#14b8a6', '#a855f7', '#eab308',
  '#f97316', '#64748b', '#84cc16'
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer'];

// Format currency
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

// ---------------- LOGIN COMPONENT ----------------
export function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-950 via-slate-950 to-navy-950 p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl shadow-premium bg-white/10 dark:bg-navy-900/40 border-white/20">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-brand-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20 mb-4 animate-pulse">
            <DollarSign className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
            Room Expense Tracker
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Shared Finance for Bachelor Rooms</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Username</label>
            <input 
              type="text"
              required
              placeholder="e.g. member1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500 transition duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-700/50 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand-500 transition duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-500 to-cyan-500 text-white font-bold py-4 rounded-2xl hover:opacity-95 shadow-lg shadow-brand-500/15 focus:outline-none transition duration-200 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          <p>Seeded: admin/admin123 or member1/password123</p>
        </div>
      </div>
    </div>
  );
}

// ---------------- DASHBOARD COMPONENT ----------------
export function Dashboard({ data, user, transactions }) {
  const isBalanceLow = data.walletBalance < 1000;

  // Chart 1: Category Wise Pie Chart
  const pieChartData = useMemo(() => {
    // Collect active expenses (not closed)
    const categoryTotals = {};
    transactions
      .filter(t => t.type === 'expense' && !t.closed_month)
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    return Object.keys(categoryTotals).map(cat => ({
      name: cat,
      value: categoryTotals[cat]
    }));
  }, [transactions]);

  // Chart 2: Member Contribution Comparison
  const memberContributionsData = useMemo(() => {
    return data.members.map(m => ({
      name: m.name,
      contributed: m.contributed
    }));
  }, [data]);

  // Chart 3: Monthly Spending Trend (from transaction history closed months + current)
  const monthlyTrendData = useMemo(() => {
    const monthlyGroups = {};
    
    // Scan all transactions (even closed ones) to build trend
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        monthlyGroups[month] = (monthlyGroups[month] || 0) + t.amount;
      });

    return Object.keys(monthlyGroups)
      .sort()
      .map(month => ({
        month,
        amount: monthlyGroups[month]
      }));
  }, [transactions]);

  // Alert flags
  const largeExpenses = useMemo(() => {
    return transactions.filter(t => t.type === 'expense' && t.amount > 2000 && !t.closed_month).slice(0, 3);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Notifications bar */}
      {isBalanceLow && (
        <div className="p-4 bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/30 rounded-2xl text-rose-700 dark:text-rose-400 flex items-center gap-3 animate-pulse shadow-sm">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <div className="font-semibold text-sm">Low Wallet Balance Alert</div>
            <div className="text-xs opacity-90">Current room balance is {formatCurrency(data.walletBalance)}. Please contribute funds to cover daily expenses.</div>
          </div>
        </div>
      )}

      {largeExpenses.length > 0 && (
        <div className="p-4 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-400 flex items-center gap-3">
          <Sparkles className="w-6 h-6 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Recent Large Expense Alert: </span>
            {largeExpenses.map((exp, idx) => (
              <span key={exp.id} className="text-xs">
                {exp.member_name} spent {formatCurrency(exp.amount)} on {exp.category} ({exp.date})
                {idx < largeExpenses.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance */}
        <div className="glass-panel p-5 rounded-3xl shadow-premium dark:bg-navy-900/60 flex flex-col justify-between hover-card-trigger">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Wallet Balance</span>
            <div className={`p-2 rounded-xl ${isBalanceLow ? 'bg-rose-500/10 text-rose-500' : 'bg-brand-500/10 text-brand-600'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold tracking-tight ${isBalanceLow ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
              {formatCurrency(data.walletBalance)}
            </div>
            <span className="text-xs text-slate-400 font-medium">Contributions - Expenses</span>
          </div>
        </div>

        {/* This Month Expenses */}
        <div className="glass-panel p-5 rounded-3xl shadow-premium dark:bg-navy-900/60 flex flex-col justify-between hover-card-trigger">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">This Month Expenses</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-500">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {formatCurrency(data.thisMonthExpenses)}
            </div>
            <span className="text-xs text-slate-400 font-medium">Expenses for {new Date().toLocaleString('default', { month: 'long' })}</span>
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="glass-panel p-5 rounded-3xl shadow-premium dark:bg-navy-900/60 flex flex-col justify-between hover-card-trigger">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Expenses</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Plus className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {formatCurrency(data.todayExpenses)}
            </div>
            <span className="text-xs text-slate-400 font-medium">Spent today</span>
          </div>
        </div>

        {/* Active Transactions */}
        <div className="glass-panel p-5 rounded-3xl shadow-premium dark:bg-navy-900/60 flex flex-col justify-between hover-card-trigger">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transactions Count</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {data.transactionCount}
            </div>
            <span className="text-xs text-slate-400 font-medium">Active this month</span>
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Pie chart */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 flex flex-col justify-between min-h-[350px]">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Expense Category Split</h3>
          {pieChartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
              <ImageIcon className="w-10 h-10 mb-2 opacity-55" />
              <span>No active expenses recorded</span>
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 max-h-[80px] overflow-y-auto">
                {pieChartData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Member contribution comparison */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 min-h-[350px] flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Member Contributions</h3>
          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberContributionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={30} />
                <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="contributed" fill="#10b981" radius={[8, 8, 0, 0]}>
                  {memberContributionsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Spending Trend */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 min-h-[350px] flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Spending Trend (Monthly)</h3>
          {monthlyTrendData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
              <ImageIcon className="w-10 h-10 mb-2 opacity-55" />
              <span>No historical data</span>
            </div>
          ) : (
            <div className="flex-1 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={30} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom split: Member Contributions Details & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contributions Summary list */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Roommate Contributions</h3>
          <div className="space-y-4">
            {data.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold text-brand-600 dark:text-brand-400 uppercase">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-white">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.mobile}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800 dark:text-white">{formatCurrency(m.contributed)}</div>
                  <div className="text-[10px] text-slate-400">Total Contributed</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions list */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Recent Active Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Member</th>
                  <th className="pb-3">Category/Remarks</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {transactions.slice(0, 5).map((t) => (
                  <tr key={`${t.type}-${t.id}`} className="text-xs">
                    <td className="py-3 text-slate-500 dark:text-slate-400 font-medium">{t.date}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 text-[10px] ${t.type === 'contribution' ? 'bg-brand-500/10 text-brand-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        {t.type === 'contribution' ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 dark:text-slate-300 font-semibold">{t.member_name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                      {t.type === 'expense' ? (
                        <span><b className="text-slate-800 dark:text-slate-300">{t.category}</b> - {t.description || 'No desc'}</span>
                      ) : (
                        <span>{t.description || 'Fund contribution'}</span>
                      )}
                    </td>
                    <td className={`py-3 text-right font-bold ${t.type === 'contribution' ? 'text-brand-600' : 'text-slate-700 dark:text-white'}`}>
                      {t.type === 'contribution' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">No active transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- CONTRIBUTION MODULE ----------------
export function Contributions({ data, onAdd, onEdit, onDelete, isAdmin }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [remarks, setRemarks] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Edit fields
  const handleEditInit = (c) => {
    setEditingId(c.id);
    setDate(c.date);
    setMemberId(c.member_id);
    setAmount(c.amount);
    setMethod(c.payment_method);
    setRemarks(c.remarks || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setMemberId('');
    setAmount('');
    setMethod('UPI');
    setRemarks('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!memberId || !amount) return;

    const payload = {
      date,
      member_id: parseInt(memberId),
      amount: parseFloat(amount),
      payment_method: method,
      remarks
    };

    if (editingId) {
      onEdit(editingId, payload);
      setEditingId(null);
    } else {
      onAdd(payload);
    }

    // Reset
    setMemberId('');
    setAmount('');
    setRemarks('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add / Edit contribution Form */}
      <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 self-start">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
          {editingId ? 'Edit Contribution' : 'Add New Contribution'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Date</label>
            <input 
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Member Name</label>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Roommate</option>
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Amount (INR)</label>
            <input 
              type="number"
              required
              placeholder="e.g. 3000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border ${method === m ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Remarks / Details</label>
            <input 
              type="text"
              placeholder="e.g. Vikas added ₹3000"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-brand-500 text-white text-xs font-bold py-3 rounded-xl hover:bg-brand-600 transition"
            >
              {editingId ? 'Save Changes' : 'Record Contribution'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-3 px-4 rounded-xl hover:opacity-90"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Contributions Logs Table */}
      <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Contribution Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Member</th>
                <th className="pb-3">Method</th>
                <th className="pb-3">Remarks</th>
                <th className="pb-3 text-right">Amount</th>
                {isAdmin && <th className="pb-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {data.contributionsList.map((c) => (
                <tr key={c.id} className="text-xs">
                  <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">{c.date}</td>
                  <td className="py-3.5 text-slate-800 dark:text-white font-semibold">{c.member_name}</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {c.payment_method}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-500 max-w-[120px] truncate">{c.remarks || '-'}</td>
                  <td className="py-3.5 text-right font-bold text-brand-600">{formatCurrency(c.amount)}</td>
                  {isAdmin && (
                    <td className="py-3.5 text-right">
                      {c.closed_month ? (
                        <span className="text-[10px] text-slate-400 italic">Closed ({c.closed_month})</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditInit(c)} className="p-1 hover:text-brand-500 transition text-slate-400">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(c.id)} className="p-1 hover:text-rose-500 transition text-slate-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {data.contributionsList.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No contributions logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- EXPENSE MODULE ----------------
export function Expenses({ data, onAdd, onEdit, onDelete, isAdmin }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Groceries');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [description, setDescription] = useState('');
  const [receiptBase64, setReceiptBase64] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null); // Receipt viewer modal

  // Image compressor + Base64 helper
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const img = new Image();
        img.src = uploadEvent.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.65);
          setReceiptBase64(compressed);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditInit = (e) => {
    setEditingId(e.id);
    setDate(e.date);
    setCategory(e.category);
    setAmount(e.amount);
    setPaidBy(e.paid_by_member_id);
    setDescription(e.description || '');
    setReceiptBase64(e.receipt_base64 || null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Groceries');
    setAmount('');
    setPaidBy('');
    setDescription('');
    setReceiptBase64(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!paidBy || !amount) return;

    const payload = {
      date,
      category,
      amount: parseFloat(amount),
      paid_by_member_id: parseInt(paidBy),
      description,
      receipt_base64: receiptBase64
    };

    if (editingId) {
      onEdit(editingId, payload);
      setEditingId(null);
    } else {
      onAdd(payload);
    }

    // Reset
    setPaidBy('');
    setAmount('');
    setDescription('');
    setReceiptBase64(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add / Edit Expense Form */}
      <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 self-start">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
          {editingId ? 'Edit Room Expense' : 'Add New Expense'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Date</label>
            <input 
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Amount (INR)</label>
            <input 
              type="number"
              required
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Paid By</label>
            <select
              required
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Payer</option>
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
            <input 
              type="text"
              placeholder="e.g. Bought monthly milk packets"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Bill Receipt Upload */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Receipt Attachment (Optional)</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-400 hover:text-brand-500 hover:border-brand-500 transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-semibold">Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              {receiptBase64 && (
                <div className="relative w-12 h-12 border border-slate-200 dark:border-slate-850 rounded-lg overflow-hidden flex-shrink-0 group">
                  <img src={receiptBase64} className="w-full h-full object-cover" alt="Preview" />
                  <button
                    type="button"
                    onClick={() => setReceiptBase64(null)}
                    className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 text-white flex items-center justify-center text-[10px] font-bold transition"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-brand-500 text-white text-xs font-bold py-3 rounded-xl hover:bg-brand-600 transition"
            >
              {editingId ? 'Save Changes' : 'Record Expense'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-3 px-4 rounded-xl hover:opacity-90"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Expenses logs list */}
      <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Expense Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Paid By</th>
                <th className="pb-3">Description</th>
                <th className="pb-3 text-center">Bill</th>
                <th className="pb-3 text-right">Amount</th>
                {isAdmin && <th className="pb-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {data.expensesList.map((e) => (
                <tr key={e.id} className="text-xs">
                  <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">{e.date}</td>
                  <td className="py-3.5 text-slate-800 dark:text-white font-semibold">{e.category}</td>
                  <td className="py-3.5 text-slate-700 dark:text-slate-300 font-medium">{e.member_name}</td>
                  <td className="py-3.5 text-slate-500 max-w-[120px] truncate">{e.description || '-'}</td>
                  <td className="py-3.5 text-center">
                    {e.receipt_base64 ? (
                      <button
                        onClick={() => setSelectedReceipt(e.receipt_base64)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-700 bg-brand-500/10 px-2 py-1 rounded-full transition"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">-</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right font-bold text-slate-800 dark:text-white">{formatCurrency(e.amount)}</td>
                  {isAdmin && (
                    <td className="py-3.5 text-right">
                      {e.closed_month ? (
                        <span className="text-[10px] text-slate-400 italic">Closed ({e.closed_month})</span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEditInit(e)} className="p-1 hover:text-brand-500 transition text-slate-400">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(e.id)} className="p-1 hover:text-rose-500 transition text-slate-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {data.expensesList.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">No expenses recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Receipt Preview Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full p-5 rounded-3xl shadow-2xl relative">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-brand-500" /> Bill Receipt Attachment
            </h4>
            <div className="w-full aspect-square border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
              <img src={selectedReceipt} className="max-w-full max-h-full object-contain" alt="Receipt Upload" />
            </div>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition text-xs"
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- SETTLEMENTS COMPONENT ----------------
export function Settlement({ data, config }) {
  const [selectedPayee, setSelectedPayee] = useState(null); // UPI Payment Modal trigger

  // Check if we should pay anyone
  const paymentsList = data.payments;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Member settlements overview */}
      <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Member Account Settlements</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Member</th>
                <th className="pb-3">Contributed</th>
                <th className="pb-3">Share</th>
                <th className="pb-3 text-right">Difference</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium">
              {data.members.map((m) => {
                const isCreditor = m.difference >= 0;
                return (
                  <tr key={m.id}>
                    <td className="py-4 text-slate-800 dark:text-white font-bold">{m.name}</td>
                    <td className="py-4 text-slate-600 dark:text-slate-400">{formatCurrency(m.contributed)}</td>
                    <td className="py-4 text-slate-600 dark:text-slate-400">{formatCurrency(m.share)}</td>
                    <td className={`py-4 text-right font-bold ${isCreditor ? 'text-brand-600' : 'text-rose-500'}`}>
                      {isCreditor ? '+' : ''}{formatCurrency(m.difference)}
                    </td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${isCreditor ? 'bg-brand-500/10 text-brand-600' : 'bg-rose-500/10 text-rose-500'}`}>
                        {isCreditor ? 'To Receive' : 'To Pay'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Debts Section (Who pays whom) */}
      <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Settlement Actions</h3>
        <div className="space-y-4">
          {paymentsList.map((p, idx) => (
            <div key={idx} className="p-4 bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-rose-500">{p.fromName}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="text-brand-500">{p.toName}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(p.amount)}</span>
                <button
                  onClick={() => setSelectedPayee({ to: p.toName, amount: p.amount })}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
                >
                  <QrCode className="w-3.5 h-3.5" /> Pay Now
                </button>
              </div>
            </div>
          ))}
          {paymentsList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
              <CheckCircle className="w-10 h-10 text-brand-500 mb-2" />
              <span>All balances are settled!</span>
            </div>
          )}
        </div>
      </div>

      {/* UPI QR Payment Modal */}
      {selectedPayee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 rounded-3xl shadow-2xl relative text-center">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Scan & Pay via UPI</h4>
            <p className="text-xs text-slate-500 mb-4">Send money to <b className="text-slate-800 dark:text-slate-200">{selectedPayee.to}</b></p>
            
            <div className="mx-auto w-[200px] h-[200px] bg-white border border-slate-100 rounded-2xl overflow-hidden p-2 flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${config.upiId}&pn=${selectedPayee.to}&am=${selectedPayee.amount}&cu=INR`)}`}
                className="w-full h-full object-contain"
                alt="UPI QR Code" 
              />
            </div>
            
            <div className="mt-4 p-3 bg-slate-50 dark:bg-navy-950 rounded-2xl">
              <span className="text-xs text-slate-400 block font-semibold mb-1">Payment Amount</span>
              <span className="text-xl font-extrabold text-slate-800 dark:text-white">{formatCurrency(selectedPayee.amount)}</span>
            </div>

            <p className="text-[10px] text-slate-400 mt-3">UPI ID: {config.upiId}</p>

            <button
              onClick={() => setSelectedPayee(null)}
              className="mt-5 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition text-xs"
            >
              Close QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- TRANSACTION HISTORY LIST ----------------
export function History({ transactions, data, onDelete, isAdmin }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter logic
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesMember = memberFilter === 'all' || t.member_id === parseInt(memberFilter);
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && t.date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && t.date <= endDate;
      }

      return matchesSearch && matchesType && matchesMember && matchesCategory && matchesDate;
    });
  }, [transactions, searchTerm, typeFilter, memberFilter, categoryFilter, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Search and Filters grid */}
      <div className="glass-panel p-5 rounded-3xl shadow-premium dark:bg-navy-900/60 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search descriptions, remarks, or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:border-brand-500"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 lg:w-[450px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-3 text-xs focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="contribution">Contributions</option>
              <option value="expense">Expenses</option>
            </select>

            <select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-3 text-xs focus:outline-none"
            >
              <option value="all">All Roommates</option>
              {data.members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-3 text-xs focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-center text-xs">
          <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Date Range:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-brand-500 font-bold hover:underline ml-auto text-[10px]"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Filtered logs list */}
      <div className="glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Transaction Logs</h3>
          <span className="text-xs text-slate-400 font-semibold">{filteredList.length} matches</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Member</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Description / Remarks</th>
                <th className="pb-3 text-right">Amount</th>
                {isAdmin && <th className="pb-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredList.map((t) => (
                <tr key={`${t.type}-${t.id}`} className="text-xs">
                  <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">{t.date}</td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 text-[10px] ${t.type === 'contribution' ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3.5 text-slate-800 dark:text-white font-semibold">{t.member_name}</td>
                  <td className="py-3.5 text-slate-700 dark:text-slate-300 font-medium">{t.category || '-'}</td>
                  <td className="py-3.5 text-slate-500 max-w-[200px] truncate">{t.description || '-'}</td>
                  <td className={`py-3.5 text-right font-bold ${t.type === 'contribution' ? 'text-brand-600' : 'text-slate-800 dark:text-white'}`}>
                    {t.type === 'contribution' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 text-right">
                      {t.closed_month ? (
                        <span className="text-[10px] text-slate-400 italic">Closed ({t.closed_month})</span>
                      ) : (
                        <button
                          onClick={() => onDelete(t.id, t.type)}
                          className="p-1 hover:text-rose-500 transition text-slate-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">No matching transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- REPORTS & CLOSING MODULE ----------------
export function Reports({ onTriggerRefresh, data, isAdmin }) {
  const [closingsList, setClosingsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closeMonth, setCloseMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch closings history
  const fetchClosings = async () => {
    try {
      const res = await fetch('/api/closings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const hist = await res.json();
      if (res.ok) setClosingsList(hist);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchClosings();
  }, []);

  const handleCloseMonthSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/reports/close', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ month_year: closeMonth })
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Closing failed');
      
      setSuccess(resData.message);
      fetchClosings();
      onTriggerRefresh(); // Update main dashboard calculations
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* File Export and download card */}
      <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Download Reports</h3>
          <p className="text-xs text-slate-400 mt-1">Export transaction logs and settlement tables for active accounts.</p>
        </div>

        <div className="space-y-3">
          <a
            href="/api/reports/export/excel"
            onClick={(e) => {
              // Inject Bearer header since browser links don't hold authorization header automatically
              e.preventDefault();
              fetch('/api/reports/export/excel', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              })
              .then(res => res.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `room-expense-report-${closeMonth}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              });
            }}
            className="flex items-center justify-between p-4 bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 rounded-2xl hover:bg-brand-500/15 font-semibold transition text-xs"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5" /> Export to Excel (.xlsx)
            </span>
            <Download className="w-4 h-4" />
          </a>

          <a
            href="/api/reports/export/pdf"
            onClick={(e) => {
              e.preventDefault();
              fetch('/api/reports/export/pdf', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              })
              .then(res => res.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `room-settlement-statement.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              });
            }}
            className="flex items-center justify-between p-4 bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 rounded-2xl hover:bg-violet-500/15 font-semibold transition text-xs"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4.5 h-4.5" /> Export to PDF Statement
            </span>
            <Download className="w-4 h-4" />
          </a>
        </div>

        {/* Closing card */}
        {isAdmin && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Close Monthly Accounts</h4>
            {success && <div className="mb-3 text-[10px] p-2 bg-brand-500/10 border border-brand-500/30 text-brand-600 rounded-xl">{success}</div>}
            {error && <div className="mb-3 text-[10px] p-2 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl">{error}</div>}

            <form onSubmit={handleCloseMonthSubmit} className="space-y-3">
              <input
                type="month"
                required
                value={closeMonth}
                onChange={(e) => setCloseMonth(e.target.value)}
                className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition text-xs"
              >
                {loading ? 'Closing Accounts...' : 'Freeze & Rollover Month'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Historical monthly statements list */}
      <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Closed Months Archive</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Closed Month</th>
                <th className="pb-3">Closed On</th>
                <th className="pb-3">Contributions</th>
                <th className="pb-3">Expenses</th>
                <th className="pb-3 text-right">Rollover Bal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {closingsList.map((c) => (
                <tr key={c.id}>
                  <td className="py-3.5 font-bold text-slate-800 dark:text-white">{c.month_year}</td>
                  <td className="py-3.5 text-slate-500">{new Date(c.closed_at).toLocaleDateString()}</td>
                  <td className="py-3.5 text-brand-600 font-semibold">{formatCurrency(c.total_contributions)}</td>
                  <td className="py-3.5 text-slate-700 dark:text-slate-300 font-semibold">{formatCurrency(c.total_expenses)}</td>
                  <td className={`py-3.5 text-right font-bold ${c.wallet_balance >= 0 ? 'text-brand-600' : 'text-rose-500'}`}>
                    {formatCurrency(c.wallet_balance)}
                  </td>
                </tr>
              ))}
              {closingsList.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">No archived months exist.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- MEMBER MANAGEMENT MODULE ----------------
export function Members({ data, onAdd, onUpdate, onResetPassword }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [pwdResetId, setPwdResetId] = useState(null);
  const [resetPwdText, setResetPwdText] = useState('');

  const handleEditInit = (m) => {
    setEditingMember(m);
    setName(m.name);
    setMobile(m.mobile);
    setUsername(m.username);
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setName('');
    setMobile('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMember) {
      onUpdate(editingMember.id, {
        name,
        mobile,
        username,
        status: editingMember.status,
        role: editingMember.role
      });
      setEditingMember(null);
    } else {
      onAdd({ name, mobile, username, password, role: 'member' });
    }

    // Reset
    setName('');
    setMobile('');
    setUsername('');
    setPassword('');
  };

  const handlePasswordResetSubmit = (e) => {
    e.preventDefault();
    if (!resetPwdText) return;
    onResetPassword(pwdResetId, resetPwdText);
    setPwdResetId(null);
    setResetPwdText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Create / Edit Form */}
      <div className="lg:col-span-1 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 self-start">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">
          {editingMember ? 'Modify Roommate Info' : 'Create Roommate Account'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
            <input 
              type="text"
              required
              placeholder="e.g. Vikas Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Mobile Number</label>
            <input 
              type="tel"
              required
              placeholder="10 digit mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Username (Login)</label>
            <input 
              type="text"
              required
              placeholder="e.g. vikas_room"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          {!editingMember && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <input 
                type="password"
                required
                placeholder="Password for roommate"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-brand-500 text-white text-xs font-bold py-3 rounded-xl hover:bg-brand-600 transition"
            >
              {editingMember ? 'Save Changes' : 'Register Roommate'}
            </button>
            {editingMember && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-3 px-4 rounded-xl hover:opacity-90"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Members list */}
      <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Registered Roommates</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Name</th>
                <th className="pb-3">Username</th>
                <th className="pb-3">Mobile</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {data.members.map((m) => (
                <tr key={m.id}>
                  <td className="py-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-navy-950 text-[10px] font-bold text-brand-600 flex items-center justify-center uppercase">
                      {m.name.substring(0, 2)}
                    </span>
                    <span>{m.name} {m.role === 'admin' && <Shield className="w-3.5 h-3.5 text-violet-500 inline ml-1" />}</span>
                  </td>
                  <td className="py-4 text-slate-500">{m.username}</td>
                  <td className="py-4 text-slate-500">{m.mobile}</td>
                  <td className="py-4">
                    <button
                      onClick={() => onUpdate(m.id, { ...m, status: m.status === 'active' ? 'inactive' : 'active' })}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${m.status === 'active' ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}
                    >
                      {m.status}
                    </button>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setPwdResetId(m.id)}
                        className="p-1 text-slate-400 hover:text-violet-500 transition text-[10px] font-semibold border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 flex items-center gap-1"
                      >
                        <Key className="w-3.5 h-3.5" /> Key
                      </button>
                      <button onClick={() => handleEditInit(m)} className="p-1 hover:text-brand-500 transition text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {pwdResetId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 rounded-3xl shadow-2xl relative">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-violet-500" /> Force Reset Password
            </h4>
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">New Password</label>
                <input 
                  type="password"
                  required
                  placeholder="Enter new account password"
                  value={resetPwdText}
                  onChange={(e) => setResetPwdText(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-violet-500 text-white text-xs font-bold py-3 rounded-xl hover:bg-violet-600 transition"
                >
                  Overwrite Password
                </button>
                <button
                  type="button"
                  onClick={() => { setPwdResetId(null); setResetPwdText(''); }}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-3 px-4 rounded-xl hover:opacity-90"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- SYSTEM AUDIT LOGS ----------------
export function AuditLogs({ logs }) {
  return (
    <div className="glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">System Activity Audit Log</h3>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-navy-900 z-10">
              <th className="pb-3">Timestamp</th>
              <th className="pb-3">User</th>
              <th className="pb-3">Action</th>
              <th className="pb-3">Operation Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                <td className="py-3 text-slate-800 dark:text-white font-semibold">{log.name || 'System/Guest'}</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-500/10 text-violet-600">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 text-slate-500 max-w-[300px] truncate" title={log.details}>{log.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="4" className="py-8 text-center text-slate-400">No logs collected yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- MEMBER PROFILE PAGE & DB BACKUP/RESTORE ----------------
export function Profile({ user, onUpdateProfile, config, onSaveConfig, isAdmin }) {
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile);
  const [password, setPassword] = useState('');
  const [upiId, setUpiId] = useState(config.upiId || 'roommate@upi');
  
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setMsg('');
    const payload = { name, mobile };
    if (password) payload.password = password;

    onUpdateProfile(user.id, payload)
      .then(() => {
        setMsg('Profile details updated successfully!');
        setPassword('');
      })
      .catch(e => setErr(e.message));
  };

  const handleConfigSubmit = (e) => {
    e.preventDefault();
    onSaveConfig({ upiId });
    setMsg('UPI configurations saved!');
  };

  const handleBackupDownload = () => {
    fetch('/api/backup', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `room-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  const handleRestoreUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRestoreStatus('Uploading backup...');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ data: backupData.data })
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.message || 'Restore failed');
        setRestoreStatus('Database restored successfully! Reloading in 1s...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        setRestoreStatus(`Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile Details Edit Card */}
      <div className="glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Roommate Profile Settings</h3>
        {msg && <div className="p-3 bg-brand-500/10 border border-brand-500/30 text-brand-600 rounded-xl text-xs">{msg}</div>}
        {err && <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl text-xs">{err}</div>}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">My Full Name</label>
            <input 
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">My Mobile Number</label>
            <input 
              type="tel"
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Change Password (Leave blank to keep same)</label>
            <input 
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-brand-500 text-white text-xs font-bold py-3 rounded-xl hover:bg-brand-600 transition"
          >
            Update Profile
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {/* Admin QR UPI code config */}
        {isAdmin && (
          <div className="glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Admin QR Code config</h3>
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Room Wallet UPI ID</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. roommate@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-navy-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-800 text-white text-xs font-bold py-3 rounded-xl hover:bg-slate-700 transition"
              >
                Save Room Config
              </button>
            </form>
          </div>
        )}

        {/* Database backup and restore card */}
        {isAdmin && (
          <div className="glass-panel p-6 rounded-3xl shadow-premium dark:bg-navy-900/60 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-500" /> Database Backup & Restore
            </h3>
            <p className="text-xs text-slate-400">Download a full snapshot of your room database as a JSON backup or restore past data.</p>
            {restoreStatus && <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-600 rounded-xl text-xs">{restoreStatus}</div>}
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleBackupDownload}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" /> Download Backup (.json)
              </button>

              <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-center">
                <Upload className="w-4 h-4" /> Restore JSON File
                <input type="file" accept=".json" className="hidden" onChange={handleRestoreUpload} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
