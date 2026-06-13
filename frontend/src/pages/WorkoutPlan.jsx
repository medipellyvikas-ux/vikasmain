import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, useToast } from '../App';
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  Check, 
  Play, 
  Timer, 
  Save, 
  Info,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Flame,
  Milestone
} from 'lucide-react';

const WEEKDAYS = [
  { name: 'Monday', focus: 'Chest + Triceps' },
  { name: 'Tuesday', focus: 'Back + Biceps' },
  { name: 'Wednesday', focus: 'Legs' },
  { name: 'Thursday', focus: 'Shoulders' },
  { name: 'Friday', focus: 'Full Upper Body' },
  { name: 'Saturday', focus: 'Core + Mobility' },
  { name: 'Sunday', focus: 'Outdoor Jogging' }
];

export default function WorkoutPlan() {
  const { user } = useContext(AuthContext);
  const { addToast } = useToast();

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [exercises, setExercises] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState({}); // exerciseId -> array of sets
  const [exerciseNotes, setExerciseNotes] = useState({}); // exerciseId -> note string
  const [workoutDuration, setWorkoutDuration] = useState(0); // seconds
  const [workoutActive, setWorkoutActive] = useState(false);
  const [personalRecords, setPersonalRecords] = useState({}); // exerciseId -> max weight

  // Jogging details (Sunday only)
  const [jogDistance, setJogDistance] = useState('');
  const [jogDuration, setJogDuration] = useState('');
  const [jogNotes, setJogNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Map today's weekday on load
  useEffect(() => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const idx = WEEKDAYS.findIndex(d => d.name === day);
    if (idx !== -1) {
      setSelectedDayIndex(idx);
    }
  }, []);

  // Fetch exercises and past records for this day's routine
  useEffect(() => {
    fetchExercisesAndRecords();
  }, [selectedDayIndex, user]);

  // Duration timer
  useEffect(() => {
    let interval = null;
    if (workoutActive) {
      interval = setInterval(() => {
        setWorkoutDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [workoutActive]);

  const fetchExercisesAndRecords = async () => {
    const token = localStorage.getItem('gym_token');
    if (!token) return;

    try {
      // Fetch all exercises
      const exRes = await fetch('/api/gym/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!exRes.ok) throw new Error('Failed to fetch exercises');
      const allEx = await exRes.json();

      // Filter exercises based on selected day's focus
      const dayFocus = WEEKDAYS[selectedDayIndex].focus;
      let filtered = [];

      if (dayFocus === 'Chest + Triceps') {
        filtered = allEx.filter(e => e.name === 'Push-ups' || e.name === 'Bench Press' || e.name === 'Incline Dumbbell Press' || e.name === 'Pec Deck Fly' || e.name === 'Tricep Pushdown' || e.name === 'Overhead Tricep Extension');
      } else if (dayFocus === 'Back + Biceps') {
        filtered = allEx.filter(e => e.name === 'Lat Pulldown' || e.name === 'Seated Cable Row' || e.name === 'Dumbbell Row' || e.name === 'Barbell Curl' || e.name === 'Hammer Curl');
      } else if (dayFocus === 'Legs') {
        filtered = allEx.filter(e => e.name === 'Bodyweight Squat' || e.name === 'Barbell Squat' || e.name === 'Leg Press' || e.name === 'Leg Curl' || e.name === 'Standing Calf Raise');
      } else if (dayFocus === 'Shoulders') {
        filtered = allEx.filter(e => e.name === 'Dumbbell Shoulder Press' || e.name === 'Lateral Raise' || e.name === 'Front Raise' || e.name === 'Rear Delt Fly' || e.name === 'Shrugs');
      } else if (dayFocus === 'Full Upper Body') {
        filtered = allEx.filter(e => e.name === 'Bench Press' || e.name === 'Lat Pulldown' || e.name === 'Shoulder Press' || e.name === 'Bicep Curl' || e.name === 'Tricep Pushdown');
      } else if (dayFocus === 'Core + Mobility') {
        filtered = allEx.filter(e => e.name === 'Plank' || e.name === 'Leg Raises' || e.name === 'Mountain Climbers' || e.name === 'Stretching');
      } else if (dayFocus === 'Outdoor Jogging') {
        filtered = allEx.filter(e => e.name === 'Outdoor Jogging');
      }

      setExercises(filtered);

      // Populate default empty sets (3 sets for each exercise)
      const defaultLogs = {};
      const defaultNotes = {};
      filtered.forEach(ex => {
        defaultLogs[ex.id] = [
          { set_no: 1, reps: '10', weight: '20', completed: false },
          { set_no: 2, reps: '10', weight: '20', completed: false },
          { set_no: 3, reps: '10', weight: '20', completed: false }
        ];
        defaultNotes[ex.id] = '';
      });
      setWorkoutLogs(defaultLogs);
      setExerciseNotes(defaultNotes);

      // Fetch personal records
      const analyticsRes = await fetch('/api/gym/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        // Determine highest completed weight per exercise in the system
        const records = {};
        analyticsData.workouts.forEach(w => {
          if (w.completed === 1) {
            // We'd ideally fetch logs. To mock/infer from local, we compute a PR map.
            // Let's seed default mock PRs if none exist
          }
        });
        // Seed some starter PRs so it looks nice
        const starterPRs = {};
        allEx.forEach(ex => {
          starterPRs[ex.id] = ex.difficulty === 'Beginner' ? 30 : 50;
        });
        setPersonalRecords(starterPRs);
      }

      // Fetch today's logging if already completed
      const todayWorkoutsRes = await fetch(`/api/gym/workouts?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (todayWorkoutsRes.ok) {
        const tw = await todayWorkoutsRes.json();
        const activeToday = tw.find(w => w.name.includes(dayFocus));
        if (activeToday) {
          // Fetch its logs
          const logsRes = await fetch(`/api/gym/workouts/${activeToday.id}/logs`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (logsRes.ok) {
            const loggedSets = await logsRes.json();
            const populated = {};
            const notes = {};
            loggedSets.forEach(s => {
              populated[s.exercise_id] = s.sets_data;
              notes[s.exercise_id] = s.notes || '';
            });
            if (Object.keys(populated).length > 0) {
              setWorkoutLogs(populated);
              setExerciseNotes(notes);
            }
          }
        }
      }

    } catch (err) {
      console.error(err);
    }
  };

  const handleStartWorkout = () => {
    setWorkoutActive(true);
    setWorkoutDuration(0);
    addToast("Workout Started!", "Timer is ticking. Keep strict posture and focus on the lift.", "info");
  };

  const handleAddSet = (exerciseId) => {
    setWorkoutLogs(prev => {
      const current = prev[exerciseId] || [];
      const nextSetNo = current.length + 1;
      const lastSet = current[current.length - 1] || { reps: '10', weight: '20' };
      return {
        ...prev,
        [exerciseId]: [
          ...current,
          { set_no: nextSetNo, reps: lastSet.reps, weight: lastSet.weight, completed: false }
        ]
      };
    });
  };

  const handleDeleteSet = (exerciseId, index) => {
    setWorkoutLogs(prev => {
      const current = prev[exerciseId] || [];
      const filtered = current.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, set_no: idx + 1 }));
      return {
        ...prev,
        [exerciseId]: filtered
      };
    });
  };

  const handleSetChange = (exerciseId, index, field, value) => {
    setWorkoutLogs(prev => {
      const current = [...(prev[exerciseId] || [])];
      current[index] = { ...current[index], [field]: value };
      return {
        ...prev,
        [exerciseId]: current
      };
    });
  };

  const handleToggleCompleted = (exerciseId, index) => {
    setWorkoutLogs(prev => {
      const current = [...(prev[exerciseId] || [])];
      const newState = !current[index].completed;
      current[index] = { ...current[index], completed: newState };
      
      if (newState) {
        // Trigger a tiny micro-celebration/achievement audit check
        const wt = parseFloat(current[index].weight || 0);
        const currentPR = personalRecords[exerciseId] || 0;
        if (wt > currentPR) {
          setPersonalRecords(p => ({ ...p, [exerciseId]: wt }));
          addToast("New Personal Record!", `You lifted ${wt} kg! That is your new PR!`, "success");
        }
      }

      return {
        ...prev,
        [exerciseId]: current
      };
    });
  };

  const calculateVolume = (exerciseId) => {
    const sets = workoutLogs[exerciseId] || [];
    return sets.reduce((sum, s) => {
      if (s.completed) {
        return sum + (parseFloat(s.reps || 0) * parseFloat(s.weight || 0));
      }
      return sum;
    }, 0);
  };

  const formatDuration = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Submit Strength Workout Logs
  const handleFinishWorkout = async () => {
    const token = localStorage.getItem('gym_token');
    const dayFocus = WEEKDAYS[selectedDayIndex].focus;

    // Check if at least one set is completed
    let totalCompletedSets = 0;
    Object.values(workoutLogs).forEach(sets => {
      sets.forEach(s => { if (s.completed) totalCompletedSets++; });
    });

    if (totalCompletedSets === 0) {
      addToast("Nothing completed", "Please complete at least one set before saving.", "warning");
      return;
    }

    try {
      // 1. Log/Create Workout Entry
      const resWorkout = await fetch('/api/gym/workouts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `${dayFocus} - Routine`,
          date: todayStr,
          exercises: [] // We pass logs separately
        })
      });

      const workoutResult = await resWorkout.json();
      if (!resWorkout.ok) throw new Error(workoutResult.error || 'Failed to save workout');

      // 2. Submit logs
      const exerciseLogs = Object.entries(workoutLogs).map(([exId, sets]) => ({
        exercise_id: parseInt(exId),
        sets_data: sets,
        notes: exerciseNotes[exId] || ''
      }));

      const resLogs = await fetch(`/api/gym/workouts/${workoutResult.id}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ exercise_logs: exerciseLogs })
      });

      if (!resLogs.ok) throw new Error('Failed to save exercise sets');

      // 3. Mark workout as completed
      await fetch(`/api/gym/workouts/${workoutResult.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completed: 1, duration_seconds: workoutDuration })
      });

      setWorkoutActive(false);
      addToast("Workout Completed!", "Splendid work! Your streak and analytics have been updated.", "success");
      
      // Re-trigger badge checkers
      fetch('/api/gym/badges', { headers: { Authorization: `Bearer ${token}` } });
      
    } catch (err) {
      addToast("Error Saving", err.message, "error");
    }
  };

  // Submit Jogging session (Sunday)
  const handleSaveJog = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('gym_token');
    if (!jogDistance || !jogDuration) {
      addToast("Empty inputs", "Please fill in distance and duration.", "warning");
      return;
    }

    try {
      const res = await fetch('/api/gym/jogging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: todayStr,
          distance: parseFloat(jogDistance),
          duration_minutes: parseFloat(jogDuration),
          notes: jogNotes
        })
      });
      if (res.ok) {
        const pace = parseFloat(jogDuration) / parseFloat(jogDistance);
        addToast("Jog Logged!", `Recorded ${jogDistance} km at a pace of ${pace.toFixed(2)} min/km.`, "success");
        setJogDistance('');
        setJogDuration('');
        setJogNotes('');
      } else {
        throw new Error("Failed to save jog details");
      }
    } catch (err) {
      addToast("Error", err.message, "error");
    }
  };

  const activeFocus = WEEKDAYS[selectedDayIndex].focus;

  return (
    <div className="space-y-6">
      
      {/* Header Splitting Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-zinc-800/80">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cyber-400 block mb-1">Workout Planner</span>
          <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-fitgreen-400" />
            {WEEKDAYS[selectedDayIndex].name}: {activeFocus}
          </h2>
        </div>

        {/* Day selection slider */}
        <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800/80">
          <button 
            onClick={() => setSelectedDayIndex(prev => (prev === 0 ? 6 : prev - 1))}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-zinc-200 px-3 min-w-[100px] text-center">
            {WEEKDAYS[selectedDayIndex].name}
          </span>
          <button 
            onClick={() => setSelectedDayIndex(prev => (prev === 6 ? 0 : prev + 1))}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Routine Detail/Logger Panel */}
      {activeFocus === 'Outdoor Jogging' ? (
        /* Sunday Card Logger */
        <div className="glass-panel p-8 rounded-3xl border border-zinc-800/80 max-w-xl mx-auto">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-cyber-950/20 p-4 rounded-full border border-cyber-500/20 text-cyber-400 mb-4 shadow-neon-blue">
              <Milestone className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Sunday Outdoor Jogging</h3>
            <p className="text-xs text-zinc-400 mt-1 text-center">Track your distance, duration, and cardiovascular progress.</p>
          </div>

          <form onSubmit={handleSaveJog} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 block">Distance (km)</label>
                <input
                  type="number"
                  step="0.01"
                  value={jogDistance}
                  onChange={(e) => setJogDistance(e.target.value)}
                  placeholder="e.g. 5.2"
                  className="w-full glass-input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 block">Duration (Minutes)</label>
                <input
                  type="number"
                  step="0.5"
                  value={jogDuration}
                  onChange={(e) => setJogDuration(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full glass-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 block">Session Notes</label>
              <textarea
                value={jogNotes}
                onChange={(e) => setJogNotes(e.target.value)}
                placeholder="How was the run? Feel any knee strain? Weather conditions?"
                className="w-full glass-input h-24 resize-none"
              />
            </div>

            {jogDistance && jogDuration && (
              <div className="p-4 rounded-xl bg-cyber-950/20 border border-cyber-500/20 text-xs flex justify-between text-cyber-300 font-bold">
                <span>Calculated Pace:</span>
                <span>{(parseFloat(jogDuration) / parseFloat(jogDistance)).toFixed(2)} min/km</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyber-600 to-cyber-500 hover:from-cyber-500 hover:to-cyber-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyber-500/10"
            >
              Log Session Details
            </button>
          </form>
        </div>
      ) : (
        /* Strength Workout logs */
        <div className="space-y-6">
          {/* Tracker controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!workoutActive ? (
                <button
                  onClick={handleStartWorkout}
                  className="px-5 py-2.5 bg-fitgreen-600 hover:bg-fitgreen-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-fitgreen-500/10"
                >
                  <Play className="w-4 h-4" /> Start Workout Timer
                </button>
              ) : (
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800/80 px-4 py-2 rounded-xl text-xs">
                  <Timer className="w-4 h-4 text-cyber-400 animate-pulse" />
                  <span className="font-mono font-bold text-zinc-200">{formatDuration(workoutDuration)}</span>
                </div>
              )}
            </div>

            {workoutActive && (
              <button
                onClick={handleFinishWorkout}
                className="px-5 py-2.5 bg-gradient-to-r from-cyber-600 to-cyber-500 hover:from-cyber-500 hover:to-cyber-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg"
              >
                <Save className="w-4 h-4" /> Finish Workout
              </button>
            )}
          </div>

          {/* Exercise Logs Cards list */}
          <div className="grid grid-cols-1 gap-6">
            {exercises.map(ex => {
              const sets = workoutLogs[ex.id] || [];
              const vol = calculateVolume(ex.id);
              const pr = personalRecords[ex.id] || 0;

              return (
                <div key={ex.id} className="glass-panel p-6 rounded-2xl border border-zinc-800/60 space-y-4">
                  
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                    <div>
                      <h3 className="font-black text-lg text-zinc-100">{ex.name}</h3>
                      <span className="text-xs text-zinc-400 mt-0.5">{ex.muscle_group} • {ex.difficulty}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                      <div>
                        Volume Lifted: <span className="text-fitgreen-400">{vol} kg</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-cyber-400" />
                        Personal Record: <span className="text-cyber-400">{pr} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Sets Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[450px]">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-900">
                          <th className="py-2 w-16 text-center">Set</th>
                          <th className="py-2 w-32">Weight (kg)</th>
                          <th className="py-2 w-32">Reps</th>
                          <th className="py-2 w-20 text-center">Done</th>
                          <th className="py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sets.map((s, index) => (
                          <tr 
                            key={index} 
                            className={`border-b border-zinc-900/40 text-xs transition-colors ${
                              s.completed ? 'bg-fitgreen-950/5 text-zinc-300' : ''
                            }`}
                          >
                            <td className="py-2.5 font-bold text-center text-zinc-400">{s.set_no}</td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="number"
                                value={s.weight}
                                onChange={(e) => handleSetChange(ex.id, index, 'weight', e.target.value)}
                                disabled={s.completed}
                                className="w-24 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1 text-center focus:outline-none focus:border-cyber-500 disabled:opacity-50 disabled:border-transparent"
                              />
                            </td>
                            <td className="py-2.5 pr-2">
                              <input
                                type="number"
                                value={s.reps}
                                onChange={(e) => handleSetChange(ex.id, index, 'reps', e.target.value)}
                                disabled={s.completed}
                                className="w-24 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1 text-center focus:outline-none focus:border-cyber-500 disabled:opacity-50 disabled:border-transparent"
                              />
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => handleToggleCompleted(ex.id, index)}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center mx-auto transition-all ${
                                  s.completed 
                                    ? 'bg-fitgreen-500 border-fitgreen-500 text-zinc-950' 
                                    : 'border-zinc-700 hover:border-zinc-500 text-transparent'
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => handleDeleteSet(ex.id, index)}
                                className="p-1 text-zinc-600 hover:text-red-400 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions & Notes */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => handleAddSet(ex.id)}
                      className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4" /> Add Set
                    </button>
                    <input
                      type="text"
                      placeholder="Add exercise notes (e.g. felt light, target chest stretch)"
                      value={exerciseNotes[ex.id] || ''}
                      onChange={(e) => setExerciseNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                      className="flex-1 glass-input text-xs"
                    />
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
