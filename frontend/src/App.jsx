import React, { useState, useEffect } from 'react';
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Users, ClipboardList,
  FileText, Shield, User, LogOut, Sun, Moon, Menu, X, QrCode, Sparkles, RefreshCw
} from 'lucide-react';
import { 
  Login, Dashboard, Contributions, Expenses, 
  Settlement, History, Reports, Members, AuditLogs, Profile 
} from './components.jsx';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Data states
  const [report, setReport] = useState({
    members: [],
    payments: [],
    totalContributions: 0,
    totalExpenses: 0,
    walletBalance: 0,
    todayExpenses: 0,
    thisMonthExpenses: 0,
    transactionCount: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // App settings/configs
  const [config, setConfig] = useState({
    upiId: localStorage.getItem('room_upi_id') || 'roommate@upi'
  });

  // Sync theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Synchronize data
  const fetchData = async () => {
    if (!token) return;

    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. Fetch settlements (contains summary stats)
      const resSet = await fetch('/api/settlements', { headers });
      if (resSet.status === 401) return handleLogout();
      const setRep = await resSet.json();
      setReport(setRep);

      // 2. Fetch all transactions
      const resTx = await fetch('/api/transactions', { headers });
      const txs = await resTx.json();
      setTransactions(txs);

      // 3. Fetch audit logs (only if admin)
      if (user?.role === 'admin') {
        const resLogs = await fetch('/api/audit-logs', { headers });
        const logs = await resLogs.json();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Failed to sync server data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleLogin = (newToken, loggedUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setToken(newToken);
    setUser(loggedUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  const handleSaveConfig = (newConf) => {
    localStorage.setItem('room_upi_id', newConf.upiId);
    setConfig(newConf);
  };

  // ---------------- CRUD API TRIGGERS ----------------

  const addContribution = async (payload) => {
    const res = await fetch('/api/contributions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) fetchData();
  };

  const editContribution = async (id, payload) => {
    const res = await fetch(`/api/contributions/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) fetchData();
  };

  const deleteContribution = async (id) => {
    if (!window.confirm('Delete this contribution record?')) return;
    const res = await fetch(`/api/contributions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchData();
  };

  const addExpense = async (payload) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) fetchData();
  };

  const editExpense = async (id, payload) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) fetchData();
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchData();
  };

  const addMember = async (payload) => {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) fetchData();
    else {
      const data = await res.json();
      alert(data.message || 'Failed to add member');
    }
  };

  const updateMember = async (id, payload) => {
    const res = await fetch(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) fetchData();
  };

  const resetMemberPassword = async (id, newPassword) => {
    const res = await fetch(`/api/members/${id}/reset-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });
    if (res.ok) alert('Password reset successfully!');
  };

  const updateProfile = async (id, payload) => {
    const res = await fetch(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      // Update local storage user info
      const updatedUser = { ...user, name: payload.name, mobile: payload.mobile };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      fetchData();
    } else {
      const data = await res.json();
      throw new Error(data.message || 'Profile update failed');
    }
  };

  const deleteTransaction = (id, type) => {
    if (type === 'contribution') {
      deleteContribution(id);
    } else {
      deleteExpense(id);
    }
  };

  // If not logged in, show auth page
  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  // Sidebar navigation items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: DollarSign, roles: ['admin', 'member'] },
    { id: 'expenses', label: 'Expenses', icon: ArrowDownRight, roles: ['admin', 'member'] },
    { id: 'contributions', label: 'Contributions', icon: ArrowUpRight, roles: ['admin', 'member'] },
    { id: 'settlements', label: 'Settlements', icon: QrCode, roles: ['admin', 'member'] },
    { id: 'history', label: 'History Logs', icon: ClipboardList, roles: ['admin', 'member'] },
    { id: 'reports', label: 'Reports & Closing', icon: FileText, roles: ['admin', 'member'] },
    { id: 'members', label: 'Manage Members', icon: Users, roles: ['admin'] },
    { id: 'audit', label: 'Audit Trail', icon: Shield, roles: ['admin'] },
    { id: 'profile', label: 'My Settings', icon: User, roles: ['admin', 'member'] }
  ];

  const activeMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-navy-950">
      
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800/80 sticky top-0 h-screen p-5 flex-shrink-0">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-brand-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/10">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-tight">SpendLens</h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">{user.role} workspace</span>
          </div>
        </div>

        {/* Tab links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {activeMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition ${isActive ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/10' : 'hover:bg-slate-800/50 hover:text-white'}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile / theme / logout footer */}
        <div className="border-t border-slate-800/80 pt-4 mt-4 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white uppercase border border-slate-700">
                {user.name.charAt(0)}
              </div>
              <div className="truncate w-24">
                <div className="text-xs font-bold text-white truncate">{user.name}</div>
                <div className="text-[9px] text-slate-500 truncate">@{user.username}</div>
              </div>
            </div>
            
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE TOP NAVIGATION & MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-slate-900 text-white px-5 py-4 sticky top-0 z-40 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="font-bold text-sm tracking-tight">SpendLens</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 bg-slate-800 rounded-lg text-slate-300 transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 bg-slate-800 rounded-lg text-slate-300 transition"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Drawer (overlay) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-45 md:hidden bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-72 bg-slate-900 text-slate-300 h-full p-6 shadow-2xl flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{user.name}</div>
                    <div className="text-xs text-slate-400">@{user.username}</div>
                  </div>
                </div>

                <nav className="space-y-1">
                  {activeMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-bold transition ${isActive ? 'bg-brand-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-4 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl text-xs font-bold transition border-t border-slate-800"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
          
          {/* Header Dashboard context (Title + Subtitle) */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white capitalize">
                {activeTab.replace('-', ' ')}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">
                {activeTab === 'dashboard' && `Welcome back, ${user.name}! Track and resolve shared roommate debts.`}
                {activeTab === 'expenses' && 'Log room outflows: groceries, gas cylinders, internet bills, rent, etc.'}
                {activeTab === 'contributions' && 'Log contributions: add money directly to the shared wallet.'}
                {activeTab === 'settlements' && 'Verify individual roommate shares and settle net differences.'}
                {activeTab === 'history' && 'Search, filter, and review complete transaction histories.'}
                {activeTab === 'reports' && 'Export Excel sheets, download PDF statements, or close monthly accounts.'}
                {activeTab === 'members' && 'Admin Workspace: add, edit, and toggle roommates access credentials.'}
                {activeTab === 'audit' && 'System Audit: monitor database and administrative activities.'}
                {activeTab === 'profile' && 'Update your profile information and configure wallet UPI details.'}
              </p>
            </div>

            {/* Quick sync button */}
            <button
              onClick={fetchData}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-navy-900/60 dark:hover:bg-slate-800/80 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold transition shadow-sm border border-transparent dark:border-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Data
            </button>
          </div>

          {/* Core View Switch router */}
          <div className="relative">
            {activeTab === 'dashboard' && (
              <Dashboard data={report} user={user} transactions={transactions} />
            )}
            {activeTab === 'contributions' && (
              <Contributions 
                data={{ contributionsList: transactions.filter(t => t.type === 'contribution'), members: report.members }} 
                onAdd={addContribution}
                onEdit={editContribution}
                onDelete={deleteContribution}
                isAdmin={user.role === 'admin'}
              />
            )}
            {activeTab === 'expenses' && (
              <Expenses 
                data={{ expensesList: transactions.filter(t => t.type === 'expense'), members: report.members }} 
                onAdd={addExpense}
                onEdit={editExpense}
                onDelete={deleteExpense}
                isAdmin={user.role === 'admin'}
              />
            )}
            {activeTab === 'settlements' && (
              <Settlement data={report} config={config} />
            )}
            {activeTab === 'history' && (
              <History 
                transactions={transactions} 
                data={report} 
                onDelete={deleteTransaction}
                isAdmin={user.role === 'admin'}
              />
            )}
            {activeTab === 'reports' && (
              <Reports onTriggerRefresh={fetchData} data={report} isAdmin={user.role === 'admin'} />
            )}
            {activeTab === 'members' && (
              <Members 
                data={report} 
                onAdd={addMember}
                onUpdate={updateMember}
                onResetPassword={resetMemberPassword}
              />
            )}
            {activeTab === 'audit' && (
              <AuditLogs logs={auditLogs} />
            )}
            {activeTab === 'profile' && (
              <Profile 
                user={user} 
                onUpdateProfile={updateProfile} 
                config={config} 
                onSaveConfig={handleSaveConfig}
                isAdmin={user.role === 'admin'}
              />
            )}
          </div>
        </main>

        {/* 3. MOBILE BOTTOM NAVIGATION TAB BAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800/80 z-40 flex items-center justify-around py-2 px-1 safe-bottom">
          {menuItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition ${isActive ? 'text-brand-500 font-bold' : 'text-slate-400'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] tracking-tight">{item.label}</span>
              </button>
            );
          })}
          
          {/* Quick trigger for other sections */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1.5 py-1 px-3 text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[9px] tracking-tight">More</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
