import React, { useState, useEffect } from 'react';
import { Search, BookOpen, AlertTriangle, ShieldAlert, Sparkles, ChevronRight, X } from 'lucide-react';

// Inline Custom SVG Animation Renderer for Exercises
function ExerciseAnimation({ name }) {
  const normalized = name.toLowerCase();

  // 1. Squatting exercises
  if (normalized.includes('squat') || normalized.includes('leg press') || normalized.includes('calf raise')) {
    const isCalf = normalized.includes('calf');
    return (
      <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes squatBody {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(${isCalf ? '5px' : '22px'}); }
          }
        `}} />
        <svg viewBox="0 0 100 160" className="w-24 h-36">
          {/* Ground */}
          <line x1="10" y1="145" x2="90" y2="145" stroke="#27272a" strokeWidth="3" />
          {/* Feet */}
          <line x1="40" y1="145" x2="60" y2="145" stroke="#3b82f6" strokeWidth="4" />
          
          {/* Moving body */}
          <g style={{ animation: 'squatBody 2.5s infinite ease-in-out', transformOrigin: '50px 145px' }}>
            {/* Head */}
            <circle cx="50" cy="30" r="8" fill="#10b981" />
            {/* Spine */}
            <line x1="50" y1="38" x2="50" y2="80" stroke="#f4f4f5" strokeWidth="4" />
            {/* Arms extended forward */}
            <line x1="50" y1="48" x2="80" y2="48" stroke="#f4f4f5" strokeWidth="3" strokeLinecap="round" />
            {/* Hips & Legs */}
            <path d="M 50 80 L 50 110 L 50 145" stroke="#3b82f6" strokeWidth="4" fill="none" strokeLinecap="round" />
            
            {/* Barbell on back */}
            {normalized.includes('barbell') && (
              <g>
                <line x1="25" y1="38" x2="75" y2="38" stroke="#a1a1aa" strokeWidth="5" />
                <circle cx="25" cy="38" r="6" fill="#3f3f46" />
                <circle cx="75" cy="38" r="6" fill="#3f3f46" />
              </g>
            )}
          </g>
        </svg>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">
          {isCalf ? 'Calf Extension Path' : 'Squat Posture & Depth Guide'}
        </span>
      </div>
    );
  }

  // 2. Chest Pressing & Flys
  if (normalized.includes('bench') || normalized.includes('pushdown') || normalized.includes('push-up') || normalized.includes('fly') || normalized.includes('pec deck')) {
    const isPushdown = normalized.includes('pushdown');
    return (
      <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pressAction {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(${isPushdown ? '20px' : '-20px'}); }
          }
        `}} />
        <svg viewBox="0 0 100 150" className="w-32 h-32">
          {!isPushdown ? (
            // Bench Press Mode
            <g>
              <rect x="25" y="80" width="50" height="10" rx="3" fill="#27272a" />
              <line x1="35" y1="90" x2="35" y2="120" stroke="#27272a" strokeWidth="3" />
              <line x1="65" y1="90" x2="65" y2="120" stroke="#27272a" strokeWidth="3" />
              {/* Lying Torso */}
              <line x1="30" y1="75" x2="75" y2="75" stroke="#f4f4f5" strokeWidth="4" strokeLinecap="round" />
              <circle cx="22" cy="73" r="6" fill="#10b981" />
              <path d="M 75 75 L 80 90 L 85 110" stroke="#f4f4f5" strokeWidth="3" fill="none" />
              {/* Pressing bar */}
              <g style={{ animation: 'pressAction 2.8s infinite ease-in-out', transformOrigin: '50px 75px' }}>
                <line x1="20" y1="45" x2="80" y2="45" stroke="#a1a1aa" strokeWidth="4" />
                <circle cx="20" cy="45" r="6" fill="#3f3f46" />
                <circle cx="80" cy="45" r="6" fill="#3f3f46" />
                {/* Arms */}
                <path d="M 45 75 L 40 60 L 45 45 M 60 75 L 65 60 L 60 45" stroke="#3b82f6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </g>
            </g>
          ) : (
            // Cable Tricep Pushdown Mode
            <g>
              <line x1="30" y1="20" x2="70" y2="20" stroke="#27272a" strokeWidth="4" />
              <line x1="50" y1="20" x2="50" y2="45" stroke="#71717a" strokeWidth="2" />
              {/* Standing Torso */}
              <line x1="35" y1="45" x2="35" y2="95" stroke="#f4f4f5" strokeWidth="4" />
              <circle cx="35" cy="35" r="6" fill="#10b981" />
              {/* Arms pushing rope */}
              <g style={{ animation: 'pressAction 2s infinite ease-in-out', transformOrigin: '35px 45px' }}>
                <path d="M 35 48 L 48 55 L 48 70" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
                <line x1="48" y1="70" x2="55" y2="65" stroke="#a1a1aa" strokeWidth="3" />
              </g>
            </g>
          )}
        </svg>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">
          {isPushdown ? 'Tricep Extension Lockout' : 'Chest Press Vertical Path'}
        </span>
      </div>
    );
  }

  // 3. Back Rows & Pulldowns
  if (normalized.includes('pulldown') || normalized.includes('row')) {
    const isPulldown = normalized.includes('pulldown');
    return (
      <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes backPull {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(22px); }
          }
        `}} />
        <svg viewBox="0 0 100 150" className="w-28 h-32">
          {isPulldown ? (
            // Pulldown Mode
            <g>
              {/* Seat */}
              <rect x="25" y="100" width="30" height="6" fill="#27272a" />
              <line x1="40" y1="106" x2="40" y2="130" stroke="#27272a" strokeWidth="3" />
              {/* Torso sitting */}
              <line x1="40" y1="55" x2="40" y2="100" stroke="#f4f4f5" strokeWidth="4" />
              <circle cx="40" cy="45" r="7" fill="#10b981" />
              {/* Moving bar / arms pulling */}
              <g style={{ animation: 'backPull 2.5s infinite ease-in-out', transformOrigin: '40px 55px' }}>
                <line x1="15" y1="20" x2="65" y2="20" stroke="#a1a1aa" strokeWidth="4" />
                {/* Arms */}
                <path d="M 40 55 L 25 35 L 20 20 M 40 55 L 55 35 L 60 20" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
              </g>
            </g>
          ) : (
            // One-Arm DB Row Mode
            <g>
              {/* Bench */}
              <line x1="10" y1="100" x2="90" y2="100" stroke="#27272a" strokeWidth="3" />
              {/* Torso bent over */}
              <line x1="30" y1="75" x2="70" y2="75" stroke="#f4f4f5" strokeWidth="4" />
              <circle cx="22" cy="73" r="6" fill="#10b981" />
              {/* Leg supporting on bench */}
              <path d="M 70 75 L 75 90 L 75 100" stroke="#f4f4f5" strokeWidth="3.5" fill="none" />
              {/* Moving Dumbbell Row */}
              <g style={{ animation: 'backPull 2s infinite ease-in-out', transformOrigin: '40px 75px' }}>
                {/* Dumbbell */}
                <rect x="42" y="90" width="12" height="6" fill="#a1a1aa" />
                <line x1="48" y1="88" x2="48" y2="98" stroke="#3f3f46" strokeWidth="3" />
                {/* Arm pulling */}
                <path d="M 45 75 L 48 92" stroke="#3b82f6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              </g>
            </g>
          )}
        </svg>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">
          {isPulldown ? 'Lats Contraction Path' : 'Scapular Retraction Drive'}
        </span>
      </div>
    );
  }

  // 4. Dumbbell Curls (Biceps)
  if (normalized.includes('curl')) {
    return (
      <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes curlBicep {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-75deg); }
          }
        `}} />
        <svg viewBox="0 0 100 150" className="w-24 h-32">
          {/* Ground */}
          <line x1="20" y1="130" x2="80" y2="130" stroke="#27272a" strokeWidth="3" />
          {/* Spine & standing legs */}
          <line x1="40" y1="50" x2="40" y2="90" stroke="#f4f4f5" strokeWidth="4" />
          <line x1="40" y1="90" x2="35" y2="130" stroke="#f4f4f5" strokeWidth="3.5" />
          <line x1="40" y1="90" x2="45" y2="130" stroke="#f4f4f5" strokeWidth="3.5" />
          <circle cx="40" cy="40" r="7.5" fill="#10b981" />

          {/* Upper arm (stationary) */}
          <line x1="40" y1="55" x2="42" y2="75" stroke="#f4f4f5" strokeWidth="3.5" strokeLinecap="round" />
          
          {/* Forearm (pivoting at elbow) */}
          <g style={{ animation: 'curlBicep 2s infinite ease-in-out', transformOrigin: '42px 75px' }}>
            <line x1="42" y1="75" x2="62" y2="82" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" />
            {/* Dumbbell */}
            <circle cx="62" cy="82" r="4" fill="#a1a1aa" />
            <line x1="58" y1="82" x2="66" y2="82" stroke="#3f3f46" strokeWidth="2.5" />
          </g>
        </svg>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Bicep Elbow Pivot Isolation</span>
      </div>
    );
  }

  // 5. Shoulder Presses & Raises
  if (normalized.includes('shoulder press') || normalized.includes('raise') || normalized.includes('shrug')) {
    const isPress = normalized.includes('press');
    return (
      <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shoulderPress {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          @keyframes armRaise {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-65deg); }
          }
        `}} />
        <svg viewBox="0 0 100 150" className="w-24 h-32">
          {/* Body */}
          <line x1="50" y1="65" x2="50" y2="105" stroke="#f4f4f5" strokeWidth="4" />
          <line x1="50" y1="105" x2="45" y2="135" stroke="#f4f4f5" strokeWidth="3" />
          <line x1="50" y1="105" x2="55" y2="135" stroke="#f4f4f5" strokeWidth="3" />
          <circle cx="50" cy="52" r="7" fill="#10b981" />

          {isPress ? (
            // Shoulder Press vertical path
            <g style={{ animation: 'shoulderPress 2.5s infinite ease-in-out', transformOrigin: '50px 65px' }}>
              <path d="M 30 50 L 35 60 L 50 65 L 65 60 L 70 50" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* Dumbbells */}
              <rect x="24" y="47" width="12" height="5" fill="#a1a1aa" />
              <rect x="64" y="47" width="12" height="5" fill="#a1a1aa" />
            </g>
          ) : (
            // Lateral raise pivot outward
            <g>
              {/* Left arm raising */}
              <g style={{ animation: 'armRaise 2.2s infinite ease-in-out', transformOrigin: '50px 65px' }}>
                <line x1="50" y1="65" x2="50" y2="92" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                <circle cx="50" cy="92" r="3.5" fill="#a1a1aa" />
              </g>
              {/* Right arm mirroring */}
              <g style={{ animation: 'armRaise 2.2s infinite ease-in-out', transformOrigin: '50px 65px' }}>
                <line x1="50" y1="65" x2="50" y2="92" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                <circle cx="50" cy="92" r="3.5" fill="#a1a1aa" />
              </g>
            </g>
          )}
        </svg>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">
          {isPress ? 'Deltoid Overhead Lockout' : 'Lateral Abduction Alignment'}
        </span>
      </div>
    );
  }

  // 6. Planking & Leg Raises (Core)
  if (normalized.includes('plank') || normalized.includes('leg raise') || normalized.includes('climber')) {
    const isPlank = normalized.includes('plank');
    return (
      <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes corePulse {
            0%, 100% { filter: drop-shadow(0 0 1px #10b981); opacity: 0.5; }
            50% { filter: drop-shadow(0 0 8px #10b981); opacity: 1; }
          }
          @keyframes legRotate {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-75deg); }
          }
        `}} />
        <svg viewBox="0 0 140 100" className="w-36 h-28">
          {/* Ground */}
          <line x1="10" y1="80" x2="130" y2="80" stroke="#27272a" strokeWidth="3" />

          {isPlank ? (
            // Plank horizontal posture
            <g>
              {/* Forearm */}
              <path d="M 40 80 L 40 68 L 55 68" stroke="#27272a" strokeWidth="3" fill="none" />
              {/* Torso straight */}
              <path d="M 40 68 L 105 68" stroke="#f4f4f5" strokeWidth="4" strokeLinecap="round" />
              <circle cx="32" cy="64" r="6" fill="#3b82f6" />
              {/* Legs/Toes */}
              <path d="M 105 68 L 115 80" stroke="#f4f4f5" strokeWidth="3.5" />
              {/* Core glow */}
              <circle cx="70" cy="68" r="8" fill="#10b981" style={{ animation: 'corePulse 2s infinite ease-in-out' }} />
            </g>
          ) : (
            // Lying Leg Raises posture
            <g>
              {/* Bench */}
              <line x1="20" y1="65" x2="90" y2="65" stroke="#27272a" strokeWidth="3.5" />
              {/* Torso lying */}
              <line x1="30" y1="60" x2="80" y2="60" stroke="#f4f4f5" strokeWidth="4" />
              <circle cx="20" cy="58" r="6" fill="#10b981" />
              {/* Rotating Legs */}
              <g style={{ animation: 'legRotate 2.5s infinite ease-in-out', transformOrigin: '80px 60px' }}>
                <line x1="80" y1="60" x2="120" y2="60" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
              </g>
            </g>
          )}
        </svg>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">
          {isPlank ? 'Core Bracing & Neutral Spine' : 'Lower Abdominals Lever'}
        </span>
      </div>
    );
  }

  // 7. Running/Jogging (Cardio)
  if (normalized.includes('jogging') || normalized.includes('run')) {
    return (
      <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes runRight {
            0%, 100% { transform: rotate(-25deg); }
            50% { transform: rotate(35deg); }
          }
          @keyframes runLeft {
            0%, 100% { transform: rotate(35deg); }
            50% { transform: rotate(-25deg); }
          }
          @keyframes torsoBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
        `}} />
        <svg viewBox="0 0 100 150" className="w-24 h-32 animate-pulse">
          {/* Ground */}
          <line x1="10" y1="130" x2="90" y2="130" stroke="#27272a" strokeWidth="3" />
          
          <g style={{ animation: 'torsoBounce 0.8s infinite ease-in-out' }}>
            <circle cx="50" cy="38" r="7" fill="#10b981" />
            <line x1="50" y1="45" x2="52" y2="85" stroke="#f4f4f5" strokeWidth="4" />
            
            {/* Left Leg */}
            <g style={{ animation: 'runRight 0.8s infinite ease-in-out', transformOrigin: '52px 85px' }}>
              <path d="M 52 85 L 42 108 L 55 125" stroke="#3b82f6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
            {/* Right Leg */}
            <g style={{ animation: 'runLeft 0.8s infinite ease-in-out', transformOrigin: '52px 85px' }}>
              <path d="M 52 85 L 62 108 L 52 125" stroke="#3b82f6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>

            {/* Left Arm */}
            <g style={{ animation: 'runLeft 0.8s infinite ease-in-out', transformOrigin: '50px 48px' }}>
              <path d="M 50 48 L 38 65 L 45 75" stroke="#f4f4f5" strokeWidth="3" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </svg>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Cardio stride Mechanics</span>
      </div>
    );
  }

  // Fallback Static Posture diagram (Alignment check)
  return (
    <div className="w-full h-48 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 flex flex-col items-center justify-center p-4 relative">
      <svg viewBox="0 0 100 120" className="w-20 h-24">
        <circle cx="50" cy="30" r="8.5" fill="#10b981" />
        <line x1="50" y1="38" x2="50" y2="78" stroke="#f4f4f5" strokeWidth="4" />
        <line x1="50" y1="48" x2="72" y2="60" stroke="#f4f4f5" strokeWidth="3" strokeLinecap="round" />
        <line x1="50" y1="48" x2="28" y2="60" stroke="#f4f4f5" strokeWidth="3" strokeLinecap="round" />
        <line x1="50" y1="78" x2="40" y2="108" stroke="#f4f4f5" strokeWidth="3.5" />
        <line x1="50" y1="78" x2="60" y2="108" stroke="#f4f4f5" strokeWidth="3.5" />
      </svg>
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-2">Alignment Calibration Guide</span>
    </div>
  );
}

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [activeExercise, setActiveExercise] = useState(null);
  const [loading, setLoading] = useState(true);

  const muscleGroups = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Mobility', 'Cardio'];

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    const token = localStorage.getItem('gym_token');
    try {
      const res = await fetch('/api/gym/exercises', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExercises(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = selectedMuscle === 'All' || ex.muscle_group === selectedMuscle;
    return matchSearch && matchMuscle;
  });

  return (
    <div className="space-y-6 relative min-h-[80vh]">
      
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-fitgreen-400 block mb-1">Interactive Catalog</span>
            <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyber-400" />
              Exercise Library & Posture Guide
            </h2>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search exercise name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input pl-10 text-xs"
            />
          </div>
        </div>

        {/* Muscle group selection filter */}
        <div className="flex gap-1.5 mt-5 overflow-x-auto pb-2 border-t border-zinc-900 pt-4 scrollbar-thin">
          {muscleGroups.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMuscle(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                selectedMuscle === m
                  ? 'bg-cyber-950/20 border-cyber-500 text-cyber-400 shadow-neon-blue'
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout: Main List vs Slide-over Detail */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Main List (Left 2 cols) */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyber-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-zinc-500 text-sm italic">
              No exercises match your search filters.
            </div>
          ) : (
            filtered.map(ex => (
              <div 
                key={ex.id}
                onClick={() => setActiveExercise(ex)}
                className={`glass-panel p-5 rounded-2xl border cursor-pointer flex justify-between items-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-900/30 ${
                  activeExercise?.id === ex.id
                    ? 'border-cyber-500/80 bg-cyber-950/10 shadow-glass-highlight'
                    : 'border-zinc-800/60'
                }`}
              >
                <div>
                  <h3 className="font-extrabold text-zinc-100 text-sm">{ex.name}</h3>
                  <span className="block text-[11px] text-zinc-400 mt-1">{ex.muscle_group} • {ex.difficulty}</span>
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform duration-200 ${
                  activeExercise?.id === ex.id ? 'translate-x-1 text-cyber-400' : 'text-zinc-600'
                }`} />
              </div>
            ))
          )}
        </div>

        {/* Slide-over/Floating Details panel (Right col) */}
        <div className="md:sticky md:top-6">
          {activeExercise ? (
            <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 space-y-5 shadow-glass animate-fade-in">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-zinc-900 pb-3.5">
                <div>
                  <h3 className="text-lg font-black text-zinc-100">{activeExercise.name}</h3>
                  <span className="text-xs text-zinc-400 mt-0.5">{activeExercise.muscle_group} • {activeExercise.difficulty}</span>
                </div>
                <button 
                  onClick={() => setActiveExercise(null)}
                  className="p-1 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Animated Demonstration */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Posture Demo</span>
                <ExerciseAnimation name={activeExercise.name} />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Instructions</span>
                <ol className="list-decimal pl-4.5 text-xs text-zinc-300 space-y-1.5 leading-relaxed">
                  {JSON.parse(activeExercise.instructions || '[]').map((inst, index) => (
                    <li key={index}>{inst}</li>
                  ))}
                </ol>
              </div>

              {/* Warnings/Tips Panel */}
              <div className="space-y-3 pt-3 border-t border-zinc-900">
                {/* Mistakes */}
                <div className="flex gap-2.5 p-3 rounded-xl bg-red-950/20 border border-red-500/25">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">Common Mistakes</span>
                    <ul className="list-disc pl-3 text-[11px] text-zinc-300 mt-1 space-y-0.5">
                      {JSON.parse(activeExercise.common_mistakes || '[]').map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="flex gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/25">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Safety Tips</span>
                    <ul className="list-disc pl-3 text-[11px] text-zinc-300 mt-1 space-y-0.5">
                      {JSON.parse(activeExercise.safety_tips || '[]').map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Beginner Tips */}
                <div className="flex gap-2.5 p-3 rounded-xl bg-fitgreen-950/20 border border-fitgreen-500/25">
                  <Sparkles className="w-4 h-4 text-fitgreen-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fitgreen-400 block">Beginner Tips</span>
                    <ul className="list-disc pl-3 text-[11px] text-zinc-300 mt-1 space-y-0.5">
                      {JSON.parse(activeExercise.beginner_tips || '[]').map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-8 rounded-3xl border border-zinc-800/60 text-center text-zinc-500 py-16 flex flex-col items-center">
              <BookOpen className="w-8 h-8 text-zinc-600 mb-3" />
              <span className="text-sm font-semibold">Select an Exercise</span>
              <span className="text-xs text-zinc-600 mt-1 max-w-[200px] leading-relaxed">
                Click any exercise from the list to view its step-by-step posture guide and animation.
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
