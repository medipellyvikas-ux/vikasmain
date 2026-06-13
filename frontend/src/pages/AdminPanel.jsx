import React, { useState, useEffect } from 'react';
import { useToast } from '../App';
import { 
  Shield, 
  Users, 
  PlusCircle, 
  BarChart3, 
  Trash2, 
  Dumbbell, 
  Save, 
  CheckCircle2 
} from 'lucide-react';

export default function AdminPanel() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('metrics'); // metrics, users, add_ex

  // Metrics state
  const [reports, setReports] = useState({
    totalUsers: 0,
    totalWorkouts: 0,
    totalLogs: 0,
    popularExercises: []
  });

  // Users state
  const [usersList, setUsersList] = useState([]);
  
  // Add Exercise Form state
  const [exName, setExName] = useState('');
  const [exMuscle, setExMuscle] = useState('Chest');
  const [exDifficulty, setExDifficulty] = useState('Beginner');
  const [exInstText, setExInstText] = useState('');
  const [exMistakeText, setExMistakeText] = useState('');
  const [exSafetyText, setExSafetyText] = useState('');
  const [exBeginnerText, setExBeginnerText] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    const token = localStorage.getItem('gym_token');
    if (!token) return;

    setLoading(true);
    try {
      if (activeTab === 'metrics') {
        const res = await fetch('/api/gym/admin/reports', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } else if (activeTab === 'users') {
        const res = await fetch('/api/gym/admin/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsersList(data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you absolutely sure you want to delete this user and all their fitness logs? This cannot be undone.")) return;

    const token = localStorage.getItem('gym_token');
    try {
      const res = await fetch(`/api/gym/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        addToast("User Deleted", data.message, "success");
        fetchAdminData(); // Refresh list
      } else {
        throw new Error(data.error || 'Failed to delete user');
      }
    } catch (err) {
      addToast("Action Failed", err.message, "error");
    }
  };

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    if (!exName || !exInstText) {
      addToast("Missing fields", "Please fill in the exercise name and instructions.", "warning");
      return;
    }

    const token = localStorage.getItem('gym_token');
    // Format JSON inputs from textarea line items
    const parseLines = (text) => text.split('\n').map(l => l.trim()).filter(l => l !== '');

    try {
      const res = await fetch('/api/gym/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: exName,
          muscle_group: exMuscle,
          difficulty: exDifficulty,
          instructions: parseLines(exInstText),
          common_mistakes: parseLines(exMistakeText),
          safety_tips: parseLines(exSafetyText),
          beginner_tips: parseLines(exBeginnerText)
        })
      });

      const data = await res.json();
      if (res.ok) {
        addToast("Exercise Added!", `${exName} has been injected to the database library.`, "success");
        // Clear fields
        setExName('');
        setExInstText('');
        setExMistakeText('');
        setExSafetyText('');
        setExBeginnerText('');
      } else {
        throw new Error(data.error || 'Failed to create exercise');
      }
    } catch (err) {
      addToast("Action Failed", err.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400 block mb-1">Administrative Terminal</span>
            <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-500" />
              AeroFit Controls
            </h2>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'metrics' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> System Metrics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'users' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-4 h-4" /> Users List
            </button>
            <button
              onClick={() => setActiveTab('add_ex')}
              className={`px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                activeTab === 'add_ex' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Add Exercise
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Render */}
      {loading && activeTab !== 'add_ex' ? (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : activeTab === 'metrics' ? (
        /* System Metrics Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 text-center">
              <span className="text-xs font-bold text-zinc-500 uppercase block">Registered Users</span>
              <span className="text-3xl font-black text-zinc-100 mt-2 block">{reports.totalUsers} Members</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 text-center">
              <span className="text-xs font-bold text-zinc-500 uppercase block">Completed Workouts</span>
              <span className="text-3xl font-black text-zinc-100 mt-2 block">{reports.totalWorkouts} Workouts</span>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 text-center">
              <span className="text-xs font-bold text-zinc-500 uppercase block">Exercise Logs Captured</span>
              <span className="text-3xl font-black text-zinc-100 mt-2 block">{reports.totalLogs} Logs</span>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 max-w-xl mx-auto space-y-4">
            <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider">Top Selections</h3>
            <div className="space-y-2.5">
              {reports.popularExercises.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 text-xs italic">No workout logs captured yet.</div>
              ) : (
                reports.popularExercises.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-xl text-xs">
                    <span className="font-bold text-zinc-200">{item.name}</span>
                    <span className="text-[10px] uppercase font-bold text-purple-400 border border-purple-500/20 bg-purple-950/20 px-2.5 py-1 rounded-lg">
                      Logged {item.count} times
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        /* Users list Management Tab */
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 overflow-hidden">
          <h3 className="font-extrabold text-lg text-zinc-100 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Manage Accounts
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-900">
                  <th className="py-2.5">User</th>
                  <th className="py-2.5">Email</th>
                  <th className="py-2.5">Age</th>
                  <th className="py-2.5">Height / Weight</th>
                  <th className="py-2.5">Goal</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-zinc-500 text-xs italic">No users registered in database.</td>
                  </tr>
                ) : (
                  usersList.map(item => (
                    <tr key={item.id} className="border-b border-zinc-900/40 text-xs">
                      <td className="py-3 font-bold text-zinc-200">{item.name}</td>
                      <td className="py-3 text-zinc-400">{item.email}</td>
                      <td className="py-3 text-zinc-400">{item.age}</td>
                      <td className="py-3 text-zinc-400">{item.height} cm / {item.weight} kg</td>
                      <td className="py-3 text-zinc-400">{item.fitness_goal}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(item.id)}
                          className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Create Exercise Tab */
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 max-w-2xl mx-auto">
          <h3 className="font-extrabold text-lg text-zinc-100 mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-purple-400" />
            Append to Muscle Library
          </h3>

          <form onSubmit={handleCreateExercise} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 block">Exercise Name</label>
              <input
                type="text"
                value={exName}
                onChange={(e) => setExName(e.target.value)}
                placeholder="e.g. Incline Bench Press"
                className="w-full glass-input text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 block">Muscle Group</label>
                <select
                  value={exMuscle}
                  onChange={(e) => setExMuscle(e.target.value)}
                  className="w-full glass-input text-xs cursor-pointer font-bold"
                >
                  {['Chest', 'Back', 'Legs', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Mobility', 'Cardio'].map(m => (
                    <option key={m} value={m} className="bg-zinc-900">{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 block">Difficulty</label>
                <select
                  value={exDifficulty}
                  onChange={(e) => setExDifficulty(e.target.value)}
                  className="w-full glass-input text-xs cursor-pointer font-bold"
                >
                  <option value="Beginner" className="bg-zinc-900">Beginner</option>
                  <option value="Intermediate" className="bg-zinc-900">Intermediate</option>
                  <option value="Advanced" className="bg-zinc-900">Advanced</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 block">Instructions (One step per line)</label>
              <textarea
                value={exInstText}
                onChange={(e) => setExInstText(e.target.value)}
                placeholder="Step 1...&#10;Step 2...&#10;Step 3..."
                className="w-full glass-input h-24 text-xs font-mono resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 block">Common Mistakes (One per line)</label>
                <textarea
                  value={exMistakeText}
                  onChange={(e) => setExMistakeText(e.target.value)}
                  placeholder="Mistake 1...&#10;Mistake 2..."
                  className="w-full glass-input h-20 text-xs font-mono resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 block">Safety Tips (One per line)</label>
                <textarea
                  value={exSafetyText}
                  onChange={(e) => setExSafetyText(e.target.value)}
                  placeholder="Safety 1...&#10;Safety 2..."
                  className="w-full glass-input h-20 text-xs font-mono resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 block">Beginner Tips (One per line)</label>
                <textarea
                  value={exBeginnerText}
                  onChange={(e) => setExBeginnerText(e.target.value)}
                  placeholder="Tip 1...&#10;Tip 2..."
                  className="w-full glass-input h-20 text-xs font-mono resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-purple-500/10"
            >
              <Save className="w-4 h-4" /> Save to Exercise Library
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
