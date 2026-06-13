import React, { useState, useEffect } from 'react';
import { useToast } from '../App';
import { 
  Apple, 
  Flame, 
  UtensilsCrossed, 
  Moon, 
  Plus, 
  Minus, 
  Save, 
  TrendingUp, 
  PlusCircle,
  HelpCircle,
  Activity,
  Heart
} from 'lucide-react';

const NUTRITION_ITEMS = [
  { key: 'eggs', name: 'Eggs', unit: 'Count', protein: 6, carbs: 0.6, fiber: 0, calories: 70, multiplier: 1 },
  { key: 'chicken', name: 'Chicken Breast', unit: 'Grams', protein: 0.31, carbs: 0, fiber: 0, calories: 1.65, multiplier: 100 },
  { key: 'fish', name: 'Fish Fillet', unit: 'Grams', protein: 0.25, carbs: 0, fiber: 0, calories: 1.2, multiplier: 100 },
  { key: 'milk', name: 'Whole Milk', unit: 'ml', protein: 0.033, carbs: 0.048, fiber: 0, calories: 0.6, multiplier: 100 },
  { key: 'curd', name: 'Greek Curd', unit: 'Grams', protein: 0.04, carbs: 0.036, fiber: 0, calories: 0.98, multiplier: 100 },
  { key: 'paneer', name: 'Paneer / Cottage Cheese', unit: 'Grams', protein: 0.18, carbs: 0.03, fiber: 0, calories: 3.65, multiplier: 100 },
  { key: 'whey_protein', name: 'Whey Protein', unit: 'Scoops', protein: 24, carbs: 3, fiber: 0, calories: 120, multiplier: 1 },
  { key: 'soya_chunks', name: 'Soya Chunks', unit: 'Grams', protein: 0.52, carbs: 0.33, fiber: 0.13, calories: 3.45, multiplier: 100 },
  { key: 'peanut_butter', name: 'Peanut Butter', unit: 'Grams', protein: 0.25, carbs: 0.20, fiber: 0.06, calories: 5.88, multiplier: 100 },
  { key: 'mutton', name: 'Mutton', unit: 'Grams', protein: 0.25, carbs: 0, fiber: 0, calories: 2.94, multiplier: 100 },
  { key: 'salads', name: 'Salads', unit: 'Bowls', protein: 1.5, carbs: 5.0, fiber: 3.0, calories: 25, multiplier: 1 },
  { key: 'banana', name: 'Banana', unit: 'Count', protein: 1.3, carbs: 27.0, fiber: 3.0, calories: 105, multiplier: 1 }
];

export default function NutritionTracker() {
  const { addToast } = useToast();
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);

  // Nutrition Log State
  const [log, setLog] = useState({
    eggs: 0,
    chicken: 0,
    fish: 0,
    milk: 0,
    curd: 0,
    paneer: 0,
    whey_protein: 0,
    soya_chunks: 0,
    peanut_butter: 0,
    mutton: 0,
    salads: 0,
    banana: 0,
    custom_protein: 0,
    custom_carbs: 0,
    custom_fiber: 0,
    custom_calories: 0
  });

  // Custom single food input
  const [customProtInput, setCustomProtInput] = useState('');
  const [customCarbsInput, setCustomCarbsInput] = useState('');
  const [customFiberInput, setCustomFiberInput] = useState('');
  const [customCalInput, setCustomCalInput] = useState('');

  // Sleep Log State
  const [sleep, setSleep] = useState({
    bed_time: '',
    wake_time: '',
    quality: 'Good'
  });

  useEffect(() => {
    fetchLogs();
  }, [date]);

  const fetchLogs = async () => {
    const token = localStorage.getItem('gym_token');
    if (!token) return;

    try {
      // Nutrition
      const nutRes = await fetch(`/api/gym/nutrition?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (nutRes.ok) {
        const nutData = await nutRes.json();
        setLog(nutData);
      }

      // Sleep
      const sleepRes = await fetch(`/api/gym/sleep?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sleepRes.ok) {
        const sleepData = await sleepRes.json();
        setSleep({
          bed_time: sleepData.bed_time || '',
          wake_time: sleepData.wake_time || '',
          quality: sleepData.quality || 'Good'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateItem = (key, amt) => {
    setLog(prev => {
      const current = parseFloat(prev[key] || 0);
      const updated = Math.max(0, current + amt);
      return { ...prev, [key]: updated };
    });
  };

  const handleSaveNutrition = async () => {
    const token = localStorage.getItem('gym_token');
    try {
      const res = await fetch('/api/gym/nutrition', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ date, ...log })
      });
      if (res.ok) {
        addToast("Nutrition Saved", "Daily protein and calorie data logged.", "success");
      } else {
        throw new Error('Failed to save log');
      }
    } catch (err) {
      addToast("Error", err.message, "error");
    }
  };

  const handleSaveSleep = async () => {
    const token = localStorage.getItem('gym_token');
    if (!sleep.bed_time || !sleep.wake_time) {
      addToast("Missing times", "Please input both bed time and wake time.", "warning");
      return;
    }
    try {
      const res = await fetch('/api/gym/sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ date, ...sleep })
      });
      if (res.ok) {
        addToast("Sleep Logged", "Sleep times and recovery quality index saved.", "success");
      } else {
        throw new Error('Failed to save sleep log');
      }
    } catch (err) {
      addToast("Error", err.message, "error");
    }
  };

  const handleAddCustom = () => {
    if (!customProtInput && !customCarbsInput && !customFiberInput && !customCalInput) return;
    const pVal = parseFloat(customProtInput || 0);
    const cbVal = parseFloat(customCarbsInput || 0);
    const fVal = parseFloat(customFiberInput || 0);
    const cVal = parseFloat(customCalInput || 0);
    setLog(prev => ({
      ...prev,
      custom_protein: Math.round((parseFloat(prev.custom_protein || 0) + pVal) * 10) / 10,
      custom_carbs: Math.round((parseFloat(prev.custom_carbs || 0) + cbVal) * 10) / 10,
      custom_fiber: Math.round((parseFloat(prev.custom_fiber || 0) + fVal) * 10) / 10,
      custom_calories: Math.round((parseFloat(prev.custom_calories || 0) + cVal) * 10) / 10
    }));
    setCustomProtInput('');
    setCustomCarbsInput('');
    setCustomFiberInput('');
    setCustomCalInput('');
    addToast("Custom item added", "Custom macronutrient and calorie values stacked.", "success");
  };

  // Calculations
  const calculateTotalProtein = () => {
    return Math.round(
      NUTRITION_ITEMS.reduce((sum, item) => {
        return sum + (parseFloat(log[item.key] || 0) * item.protein);
      }, 0) + parseFloat(log.custom_protein || 0)
    );
  };

  const calculateTotalCarbs = () => {
    return Math.round(
      NUTRITION_ITEMS.reduce((sum, item) => {
        return sum + (parseFloat(log[item.key] || 0) * (item.carbs || 0));
      }, 0) + parseFloat(log.custom_carbs || 0)
    );
  };

  const calculateTotalFiber = () => {
    return Math.round(
      NUTRITION_ITEMS.reduce((sum, item) => {
        return sum + (parseFloat(log[item.key] || 0) * (item.fiber || 0));
      }, 0) + parseFloat(log.custom_fiber || 0)
    );
  };

  const calculateTotalCalories = () => {
    return Math.round(
      NUTRITION_ITEMS.reduce((sum, item) => {
        return sum + (parseFloat(log[item.key] || 0) * item.calories);
      }, 0) + parseFloat(log.custom_calories || 0)
    );
  };

  const totalProtein = calculateTotalProtein();
  const totalCarbs = calculateTotalCarbs();
  const totalFiber = calculateTotalFiber();
  const totalCalories = calculateTotalCalories();
  const proteinPercent = Math.min(100, Math.round((totalProtein / 120) * 100));
  const carbsPercent = Math.min(100, Math.round((totalCarbs / 250) * 100));
  const fiberPercent = Math.min(100, Math.round((totalFiber / 30) * 100));

  // Sleep hours compute helper
  const calculateSleepHours = () => {
    if (!sleep.bed_time || !sleep.wake_time) return 0;
    const [bH, bM] = sleep.bed_time.split(':').map(Number);
    const [wH, wM] = sleep.wake_time.split(':').map(Number);
    let bTime = new Date(date);
    bTime.setHours(bH, bM, 0);
    let wTime = new Date(date);
    wTime.setHours(wH, wM, 0);
    if (wTime < bTime) {
      wTime.setDate(wTime.getDate() + 1);
    }
    return Math.round(((wTime - bTime) / (1000 * 60 * 60)) * 10) / 10;
  };

  const sleepHours = calculateSleepHours();

  return (
    <div className="space-y-6">
      
      {/* Date selector header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-fitgreen-400 block mb-1">Nutrition & Recovery Trackers</span>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Apple className="w-6 h-6 text-fitgreen-500" />
            Daily Fuel Logger
          </h2>
        </div>

        <div className="relative">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="glass-input text-xs font-bold w-40 text-center"
          />
        </div>
      </div>

      {/* Main Trackers split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Food logger items (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-250 dark:border-slate-900 pb-3">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-fitgreen-400" />
                Track Foods
              </h3>
              <button
                onClick={handleSaveNutrition}
                className="px-4 py-2 bg-fitgreen-600 hover:bg-fitgreen-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
              >
                <Save className="w-3.5 h-3.5" /> Save Food Logs
              </button>
            </div>

            {/* List of high-protein items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {NUTRITION_ITEMS.map(item => {
                const loggedVal = log[item.key] || 0;
                return (
                  <div key={item.key} className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="block font-bold text-slate-700 dark:text-slate-200 text-sm leading-tight">{item.name}</span>
                      <span className="block text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {item.unit === 'Grams' ? `Per 100g` : item.unit === 'ml' ? `Per 100ml` : `Per portion`}
                        {' '}• <span className="font-semibold text-fitgreen-500">P: {item.multiplier === 100 ? Math.round(item.protein * 100) : item.protein}g</span>
                        {' '}• <span className="font-semibold text-amber-500">C: {item.multiplier === 100 ? Math.round(item.carbs * 100) : item.carbs}g</span>
                        {item.fiber > 0 && ` • `}
                        {item.fiber > 0 && <span className="font-semibold text-teal-500">F: {item.multiplier === 100 ? Math.round(item.fiber * 100) : item.fiber}g</span>}
                        {' '}• {item.multiplier === 100 ? Math.round(item.calories * 100) : item.calories} kcal
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleUpdateItem(item.key, item.unit === 'Grams' || item.unit === 'ml' ? -50 : -1)}
                        disabled={loggedVal === 0}
                        className="w-7 h-7 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40 disabled:pointer-events-none rounded-lg flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-16 text-center font-bold text-sm text-slate-700 dark:text-slate-200">
                        {loggedVal} <span className="text-[10px] text-slate-500 dark:text-slate-550 font-normal">{item.unit === 'Grams' || item.unit === 'ml' ? item.unit : ''}</span>
                      </span>
                      <button
                        onClick={() => handleUpdateItem(item.key, item.unit === 'Grams' || item.unit === 'ml' ? 50 : 1)}
                        className="w-7 h-7 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-lg flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom food entry */}
            <div className="border-t border-slate-250 dark:border-slate-900 pt-5 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Quick Log Other Foods</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <input
                  type="number"
                  placeholder="Protein (g)"
                  value={customProtInput}
                  onChange={(e) => setCustomProtInput(e.target.value)}
                  className="w-full glass-input text-xs"
                />
                <input
                  type="number"
                  placeholder="Carbs (g)"
                  value={customCarbsInput}
                  onChange={(e) => setCustomCarbsInput(e.target.value)}
                  className="w-full glass-input text-xs"
                />
                <input
                  type="number"
                  placeholder="Fiber (g)"
                  value={customFiberInput}
                  onChange={(e) => setCustomFiberInput(e.target.value)}
                  className="w-full glass-input text-xs"
                />
                <input
                  type="number"
                  placeholder="Calories (kcal)"
                  value={customCalInput}
                  onChange={(e) => setCustomCalInput(e.target.value)}
                  className="w-full glass-input text-xs"
                />
                <button
                  onClick={handleAddCustom}
                  className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-slate-800/80"
                >
                  <PlusCircle className="w-4 h-4 text-cyber-400" /> Add Custom
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Targets rings & sleep logs (1 col) */}
        <div className="space-y-6">
          
          {/* Targets breakdown summary card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-5">
            <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100">Nutrition Targets</h3>
            
            {/* Protein bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">Total Protein</span>
                <span className="text-fitgreen-400">{totalProtein}g / 120g</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/50">
                <div 
                  className="h-full bg-gradient-to-r from-fitgreen-600 to-fitgreen-400 transition-all duration-500 rounded-full"
                  style={{ width: `${proteinPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Carbs bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">Total Carbs</span>
                <span className="text-amber-500">{totalCarbs}g / 250g</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/50">
                <div 
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 rounded-full"
                  style={{ width: `${carbsPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Fiber bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">Total Dietary Fiber</span>
                <span className="text-teal-500">{totalFiber}g / 30g</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/50">
                <div 
                  className="h-full bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-500 rounded-full"
                  style={{ width: `${fiberPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Calories count */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">Est. Total Calories</span>
                <span className="text-cyber-400">{totalCalories} kcal</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-550 leading-relaxed">
              <div className="flex gap-2 items-start">
                <Heart className="w-4 h-4 text-fitgreen-400 shrink-0 mt-0.5" />
                <span>
                  Track protein for muscle recovery, carbs for daily training energy, and fiber from salads and whole grains to support gut health and optimal nutrient digestion.
                </span>
              </div>
            </div>
          </div>

          {/* Sleep logger card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-250 dark:border-slate-900 pb-3">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-400" />
                Log Sleep
              </h3>
              <button
                onClick={handleSaveSleep}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
              >
                <Save className="w-3.5 h-3.5" /> Log
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Bed Time</label>
                <input
                  type="time"
                  value={sleep.bed_time}
                  onChange={(e) => setSleep(prev => ({ ...prev, bed_time: e.target.value }))}
                  className="w-full glass-input text-xs font-bold text-center"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Wake Time</label>
                <input
                  type="time"
                  value={sleep.wake_time}
                  onChange={(e) => setSleep(prev => ({ ...prev, wake_time: e.target.value }))}
                  className="w-full glass-input text-xs font-bold text-center"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Sleep Quality</label>
              <select
                value={sleep.quality}
                onChange={(e) => setSleep(prev => ({ ...prev, quality: e.target.value }))}
                className="w-full glass-input text-xs font-bold cursor-pointer"
              >
                <option value="Excellent" className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">Excellent (Felt amazing)</option>
                <option value="Good" className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">Good (Rested)</option>
                <option value="Fair" className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">Fair (Slightly tired)</option>
                <option value="Poor" className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">Poor (Exhausted)</option>
              </select>
            </div>

            {sleep.bed_time && sleep.wake_time && (
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs flex justify-between text-indigo-300 font-bold">
                <span>Calculated Duration:</span>
                <span>{sleepHours} Hours / 8 Target</span>
              </div>
            )}

            <div className="text-[10px] text-slate-500 dark:text-slate-550 leading-relaxed">
              Target 8 hours of sleep. Most muscle growth hormone is secreted during deep REM sleep stages.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
