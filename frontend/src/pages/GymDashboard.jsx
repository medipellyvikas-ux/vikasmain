import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, useToast } from '../App';
import { 
  Flame, 
  Droplet, 
  Scale, 
  Trophy, 
  Plus, 
  Minus, 
  Utensils, 
  Moon, 
  Calendar,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';

export default function GymDashboard({ onNavigate }) {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();

  const [stats, setStats] = useState({
    weightTrend: [],
    workouts: [],
    muscleFreq: [],
    proteinTrend: [],
    waterTrend: [],
    streak: 0,
    totalCompleted: 0
  });

  const [todayWater, setTodayWater] = useState(0); // Litres
  const [todayProtein, setTodayProtein] = useState(0); // grams
  const [todayCalories, setTodayCalories] = useState(0); // kcal
  const [todaySleep, setTodaySleep] = useState({ bed_time: '', wake_time: '', quality: '', hours: 0 });
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const token = localStorage.getItem('gym_token');
    if (!token) return;

    setLoading(true);
    try {
      // 1. Fetch Analytics/Stats
      const analyticsRes = await fetch('/api/gym/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setStats(analyticsData);
      }

      // 2. Fetch today's Water
      const waterRes = await fetch(`/api/gym/water?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (waterRes.ok) {
        const waterData = await waterRes.json();
        setTodayWater(waterData.amount_liters);
      }

      // 3. Fetch today's Nutrition
      const nutritionRes = await fetch(`/api/gym/nutrition?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (nutritionRes.ok) {
        const nutr = await nutritionRes.json();
        // Calculate protein based on items
        const prot =
          (nutr.eggs || 0) * 6 +
          (nutr.chicken || 0) * 0.31 +
          (nutr.fish || 0) * 0.25 +
          (nutr.milk || 0) * 0.033 +
          (nutr.curd || 0) * 0.04 +
          (nutr.paneer || 0) * 0.18 +
          (nutr.whey_protein || 0) * 24 +
          (nutr.custom_protein || 0);

        const cals =
          (nutr.eggs || 0) * 70 +
          (nutr.chicken || 0) * 1.65 +
          (nutr.fish || 0) * 1.2 +
          (nutr.milk || 0) * 0.6 +
          (nutr.curd || 0) * 0.98 +
          (nutr.paneer || 0) * 3.65 +
          (nutr.whey_protein || 0) * 120 +
          (nutr.custom_calories || 0);

        setTodayProtein(Math.round(prot));
        setTodayCalories(Math.round(cals));
      }

      // 4. Fetch today's Sleep
      const sleepRes = await fetch(`/api/gym/sleep?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sleepRes.ok) {
        const sleepData = await sleepRes.json();
        let hours = 0;
        if (sleepData.bed_time && sleepData.wake_time) {
          const [bH, bM] = sleepData.bed_time.split(':').map(Number);
          const [wH, wM] = sleepData.wake_time.split(':').map(Number);
          let bTime = new Date(todayStr);
          bTime.setHours(bH, bM, 0);
          let wTime = new Date(todayStr);
          wTime.setHours(wH, wM, 0);
          if (wTime < bTime) {
            // Bedtime was previous night
            wTime.setDate(wTime.getDate() + 1);
          }
          hours = Math.round(((wTime - bTime) / (1000 * 60 * 60)) * 10) / 10;
        }
        setTodaySleep({ ...sleepData, hours });
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWater = async (amount) => {
    const token = localStorage.getItem('gym_token');
    const newAmt = Math.max(0, Math.round((todayWater + amount) * 100) / 100);
    setTodayWater(newAmt);

    try {
      const res = await fetch('/api/gym/water', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ date: todayStr, amount_liters: newAmt })
      });
      if (res.ok) {
        if (newAmt >= 4.0 && todayWater < 4.0) {
          addToast("Goal Achieved!", "Awesome! You have met your 4 Liters water target today.", "success");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calories Burned Calculation: Base metabolic rate + active workout burn
  // 73kg weight, approx base burn ~1700 kcal/day (BMR)
  // Let's say active workout logs add ~350-500 kcal depending on completed exercises
  const calculateCaloriesBurned = () => {
    // Basic metabolic burn fraction of day + active exercise
    const now = new Date();
    const hrs = now.getHours();
    const baseMetabolicBurn = Math.round((hrs / 24) * 1700);

    const activeWorkoutsCount = stats.workouts.filter(w => w.date === todayStr && w.completed === 1).length;
    const activeBurn = activeWorkoutsCount * 380; // 380 kcal per workout

    return baseMetabolicBurn + activeBurn;
  };

  const waterProgressPercent = Math.min(100, Math.round((todayWater / 4.0) * 100));
  const proteinProgressPercent = Math.min(100, Math.round((todayProtein / 120) * 100));
  const sleepProgressPercent = Math.min(100, Math.round((todaySleep.hours / 8.0) * 100));

  return (
    <div className="space-y-6">
      
      {/* Personalized Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 md:p-8 rounded-3xl border border-zinc-800/80">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cyber-400 block mb-1">Personalized Dashboard</span>
          <h2 className="text-3xl font-black tracking-tight text-zinc-100">
            Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-400 to-fitgreen-400">{user?.name}</span>
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            26-year-old Beginner • {user?.height} cm (5'7") • {user?.weight} kg (73 kg starting) • goal: {user?.fitness_goal}
          </p>
        </div>
        
        <button 
          onClick={() => onNavigate('workouts')}
          className="px-6 py-3 bg-gradient-to-r from-cyber-600 to-cyber-500 hover:from-cyber-500 hover:to-cyber-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyber-500/10 hover:shadow-cyber-500/20 text-center transition-all duration-200"
        >
          Track Today's Workout
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weight Card */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Weight Goal</span>
            <Scale className="w-5 h-5 text-cyber-400" />
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-zinc-100">{user?.weight} kg</span>
            <span className="block text-[11px] text-zinc-500 mt-1">Target: {user?.target_weight} kg</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-fitgreen-400">
            <span className="flex items-center gap-1 font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              {Math.max(0, Math.round((73 - user?.weight) * 10) / 10)} kg Lost
            </span>
            <span className="text-zinc-500">since start</span>
          </div>
        </div>

        {/* Workout Streak Card */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 flex flex-col justify-between pulse-blue">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Current Streak</span>
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-zinc-100">{stats.streak} Days</span>
            <span className="block text-[11px] text-zinc-500 mt-1">Consecutive Workouts</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-cyber-400">
            <span className="font-bold">Next badge: 7 Days</span>
            <span className="text-zinc-500">{stats.streak}/7</span>
          </div>
        </div>

        {/* Workouts Completed Card */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Workouts</span>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-zinc-100">{stats.totalCompleted} Sessions</span>
            <span className="block text-[11px] text-zinc-500 mt-1">Completed exercises</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-fitgreen-400">
            <span className="font-bold">First Blood Unlocked</span>
            <span className="text-zinc-500">100%</span>
          </div>
        </div>

        {/* Calories Burned Card */}
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Est. Calories Burned</span>
            <Flame className="w-5 h-5 text-red-500" />
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-black text-zinc-100">{calculateCaloriesBurned()} kcal</span>
            <span className="block text-[11px] text-zinc-500 mt-1">BMR + Workout energy</span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-zinc-500" />
              Reset at midnight
            </span>
          </div>
        </div>
      </div>

      {/* Main Trackers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Nutrition Ring Card */}
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-zinc-100">Protein Tracker</h3>
              <Utensils className="w-5 h-5 text-fitgreen-400" />
            </div>
            <p className="text-xs text-zinc-400 mb-6">Muscle-building target: 120 grams daily</p>
          </div>

          <div className="flex flex-col items-center justify-center my-4 relative">
            {/* SVG Progress Circle */}
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="62"
                strokeWidth="10"
                stroke="#18181b"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="62"
                strokeWidth="10"
                stroke="url(#proteinGradient)"
                strokeDasharray={389}
                strokeDashoffset={389 - (389 * proteinProgressPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
              <defs>
                <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-zinc-100">{todayProtein}g</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase">of 120g</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Calories Consumed</span>
              <span className="font-bold text-zinc-100">{todayCalories} kcal</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Remaining Target</span>
              <span className="font-bold text-fitgreen-400">{Math.max(0, 120 - todayProtein)}g Protein</span>
            </div>
            <button 
              onClick={() => onNavigate('nutrition')}
              className="w-full text-center mt-3 block py-2.5 bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-800/60"
            >
              Log Food Intake
            </button>
          </div>
        </div>

        {/* Water Log Interactive Card */}
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-zinc-100">Water Tracker</h3>
              <Droplet className="w-5 h-5 text-cyber-400" />
            </div>
            <p className="text-xs text-zinc-400 mb-6">Daily hydration target: 4.0 Litres</p>
          </div>

          {/* Visual Cup Animation Container */}
          <div className="my-2 flex flex-col items-center justify-center">
            <div className="w-24 h-36 border-4 border-zinc-800 rounded-b-2xl relative overflow-hidden bg-zinc-900/40">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyber-600/70 to-cyber-400/80 transition-all duration-500"
                style={{ height: `${waterProgressPercent}%` }}
              >
                {waterProgressPercent > 0 && (
                  <div className="absolute top-0 inset-x-0 h-2 bg-white/20 animate-pulse"></div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-zinc-100 drop-shadow-md">
                {waterProgressPercent}%
              </div>
            </div>
            <span className="text-sm font-black mt-3 text-zinc-200">{todayWater} L / 4.0 L</span>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex gap-2.5">
              <button
                onClick={() => handleUpdateWater(0.25)}
                className="flex-1 py-2.5 bg-cyber-950/20 hover:bg-cyber-900/30 text-cyber-400 border border-cyber-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> 250 ml
              </button>
              <button
                onClick={() => handleUpdateWater(0.5)}
                className="flex-1 py-2.5 bg-cyber-950/20 hover:bg-cyber-900/30 text-cyber-400 border border-cyber-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> 500 ml
              </button>
              <button
                onClick={() => handleUpdateWater(-0.25)}
                disabled={todayWater === 0}
                className="py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 disabled:opacity-40 disabled:pointer-events-none rounded-xl border border-zinc-800/80 transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-center text-[10px] text-zinc-500">
              Proper hydration accelerates protein digestion and muscle recovery.
            </div>
          </div>
        </div>

        {/* Sleep Target Card */}
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-zinc-100">Sleep Tracker</h3>
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-xs text-zinc-400 mb-6">Target for muscle repair: 8.0 Hours</p>
          </div>

          <div className="my-4 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" strokeWidth="8" stroke="#18181b" fill="transparent" />
                <circle 
                  cx="56" 
                  cy="56" 
                  r="48" 
                  strokeWidth="8" 
                  stroke="#818cf8" 
                  strokeDasharray={301} 
                  strokeDashoffset={301 - (301 * sleepProgressPercent) / 100}
                  strokeLinecap="round" 
                  fill="transparent" 
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-zinc-100">{todaySleep.hours || 0} hrs</span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase">of 8 hrs</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {todaySleep.bed_time ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Schedule:</span>
                  <span className="font-semibold text-zinc-200">{todaySleep.bed_time} - {todaySleep.wake_time}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Quality Index:</span>
                  <span className={`font-bold ${
                    todaySleep.quality === 'Excellent' || todaySleep.quality === 'Good' ? 'text-fitgreen-400' : 'text-amber-400'
                  }`}>
                    {todaySleep.quality}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-zinc-500 italic">
                No sleep log recorded for today.
              </div>
            )}
            
            <button 
              onClick={() => onNavigate('nutrition')}
              className="w-full text-center mt-3 block py-2.5 bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-800/60"
            >
              Log Sleep Schedules
            </button>
          </div>
        </div>

      </div>

      {/* Routine Planner & Streaks Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Monday to Sunday Workout Card */}
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg text-zinc-100">Weekly Muscle-Building Routine</h3>
              <p className="text-xs text-zinc-400 mt-1">Split template for beginner muscle gains</p>
            </div>
            <Calendar className="w-5 h-5 text-zinc-500" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {[
              { day: 'Mon', focus: 'Chest + Tri', type: 'strength' },
              { day: 'Tue', focus: 'Back + Bi', type: 'strength' },
              { day: 'Wed', focus: 'Legs', type: 'strength' },
              { day: 'Thu', focus: 'Shoulders', type: 'strength' },
              { day: 'Fri', focus: 'Upper Body', type: 'strength' },
              { day: 'Sat', focus: 'Core + Mob', type: 'core' },
              { day: 'Sun', focus: 'Jogging', type: 'cardio' },
            ].map(item => (
              <div 
                key={item.day} 
                className={`p-3 rounded-xl border text-center flex flex-col justify-between h-24 transition-all duration-200 hover:-translate-y-0.5 ${
                  item.day === new Date().toLocaleDateString('en-US', { weekday: 'short' })
                    ? 'border-cyber-500 bg-cyber-950/20 shadow-neon-blue'
                    : 'border-zinc-800/60 bg-zinc-900/30'
                }`}
              >
                <span className="block text-[11px] font-black text-zinc-400 uppercase">{item.day}</span>
                <span className="block text-[10px] text-zinc-500 mt-1 font-bold truncate">{item.focus}</span>
                <span className={`text-[8px] uppercase font-extrabold px-1.5 py-0.5 rounded-full inline-block mx-auto mt-2 ${
                  item.type === 'strength' ? 'bg-fitgreen-950/40 text-fitgreen-400 border border-fitgreen-500/20' :
                  item.type === 'core' ? 'bg-purple-950/40 text-purple-400 border border-purple-500/20' :
                  'bg-cyber-950/40 text-cyber-400 border border-cyber-500/20'
                }`}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reminders / Notifications Quick Settings Card */}
        <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-zinc-100 mb-2">Simulated Schedules</h3>
            <p className="text-xs text-zinc-400">Standard reminder presets configured for user</p>
          </div>

          <div className="space-y-3 my-4">
            {[
              { time: '05:30 AM', label: 'Wake Up Reminder', active: true },
              { time: '06:00 AM', label: 'Gym Workout Alert', active: true },
              { time: '07:30 AM', label: 'Protein Target Alert', active: true },
              { time: 'Every 2h', label: 'Water Hydration Alert', active: true },
            ].map((rem, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs">
                <div>
                  <span className="block font-bold text-zinc-200">{rem.label}</span>
                  <span className="block text-[10px] text-zinc-500 mt-0.5">{rem.time}</span>
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-fitgreen-400 animate-ping"></span>
                  <span className="text-[10px] uppercase font-bold text-fitgreen-400">Active</span>
                </span>
              </div>
            ))}
          </div>

          <div className="text-center text-[10px] text-zinc-500">
            Reminders automatically raise browser-level alerts during schedules.
          </div>
        </div>

      </div>

    </div>
  );
}
