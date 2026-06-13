import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, useToast } from '../App';
import { 
  Camera, 
  ChevronRight, 
  Save, 
  TrendingUp, 
  Calendar,
  Activity,
  History,
  Grid
} from 'lucide-react';

export default function ProgressSection() {
  const { user, setUser } = useContext(AuthContext);
  const { addToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arms, setArms] = useState('');
  const [shoulders, setShoulders] = useState('');
  const [thighs, setThighs] = useState('');

  // Base64 photos
  const [photoFront, setPhotoFront] = useState(null);
  const [photoSide, setPhotoSide] = useState(null);
  const [photoBack, setPhotoBack] = useState(null);

  const [history, setHistory] = useState([]);
  const [selectedBeforeId, setSelectedBeforeId] = useState('');
  const [selectedCurrentId, setSelectedCurrentId] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [user]);

  useEffect(() => {
    // Fill in today's fields if they exist in history
    const todayLog = history.find(h => h.date === date);
    if (todayLog) {
      setWeight(todayLog.weight || '');
      setWaist(todayLog.waist || '');
      setChest(todayLog.chest || '');
      setArms(todayLog.arms || '');
      setShoulders(todayLog.shoulders || '');
      setThighs(todayLog.thighs || '');
      setPhotoFront(todayLog.photo_front || null);
      setPhotoSide(todayLog.photo_side || null);
      setPhotoBack(todayLog.photo_back || null);
    } else {
      setWeight('');
      setWaist('');
      setChest('');
      setArms('');
      setShoulders('');
      setThighs('');
      setPhotoFront(null);
      setPhotoSide(null);
      setPhotoBack(null);
    }
  }, [date, history]);

  const fetchHistory = async () => {
    const token = localStorage.getItem('gym_token');
    if (!token) return;

    try {
      const res = await fetch('/api/gym/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);

        // Preselect before (earliest) and current (latest) for side-by-side comparison
        if (data.length > 0) {
          setSelectedBeforeId(data[data.length - 1].id.toString()); // earliest
          setSelectedCurrentId(data[0].id.toString()); // latest
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'front') setPhotoFront(reader.result);
      if (target === 'side') setPhotoSide(reader.result);
      if (target === 'back') setPhotoBack(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProgress = async () => {
    const token = localStorage.getItem('gym_token');
    try {
      const res = await fetch('/api/gym/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date,
          weight: weight ? parseFloat(weight) : null,
          waist: waist ? parseFloat(waist) : null,
          chest: chest ? parseFloat(chest) : null,
          arms: arms ? parseFloat(arms) : null,
          shoulders: shoulders ? parseFloat(shoulders) : null,
          thighs: thighs ? parseFloat(thighs) : null,
          photo_front: photoFront,
          photo_side: photoSide,
          photo_back: photoBack
        })
      });

      if (res.ok) {
        addToast("Progress Saved", "Measurements and posture photos updated.", "success");
        
        // Update user state if weight is edited for today
        if (date === todayStr && weight) {
          setUser(prev => ({ ...prev, weight: parseFloat(weight) }));
        }

        fetchHistory();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save progress');
      }
    } catch (err) {
      addToast("Error", err.message, "error");
    }
  };

  // Compare measurements delta
  const beforeLog = history.find(h => h.id.toString() === selectedBeforeId);
  const currentLog = history.find(h => h.id.toString() === selectedCurrentId);

  const getDeltaString = (key, unit = 'cm') => {
    if (!beforeLog || !currentLog) return null;
    const beforeVal = parseFloat(beforeLog[key]);
    const currentVal = parseFloat(currentLog[key]);
    if (isNaN(beforeVal) || isNaN(currentVal)) return null;

    const diff = currentVal - beforeVal;
    if (diff === 0) return '0';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)} ${unit}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Header date picker panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-zinc-800/80">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cyber-400 block mb-1">Body Transformation Tracker</span>
          <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyber-500" />
            Measurements & Progress Photos
          </h2>
        </div>

        <div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="glass-input text-xs font-bold w-40 text-center"
          />
        </div>
      </div>

      {/* Grid splits: Logger form vs before/after sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left column: Measurements log + Photo boxes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <h3 className="font-extrabold text-lg text-zinc-100">Log Dimensions</h3>
              <button
                onClick={handleSaveProgress}
                className="px-4 py-2 bg-cyber-600 hover:bg-cyber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg"
              >
                <Save className="w-3.5 h-3.5" /> Save Entry
              </button>
            </div>

            {/* Input grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Weight (kg)', val: weight, set: setWeight, placeholder: 'e.g. 73.0' },
                { label: 'Waist (cm)', val: waist, set: setWaist, placeholder: 'e.g. 84' },
                { label: 'Chest (cm)', val: chest, set: setChest, placeholder: 'e.g. 96' },
                { label: 'Arms (cm)', val: arms, set: setArms, placeholder: 'e.g. 33' },
                { label: 'Shoulders (cm)', val: shoulders, set: setShoulders, placeholder: 'e.g. 110' },
                { label: 'Thighs (cm)', val: thighs, set: setThighs, placeholder: 'e.g. 52' },
              ].map(item => (
                <div key={item.label} className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 block">{item.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={item.val}
                    onChange={(e) => item.set(e.target.value)}
                    placeholder={item.placeholder}
                    className="w-full glass-input text-xs"
                  />
                </div>
              ))}
            </div>

            {/* Photo Boxes */}
            <div className="border-t border-zinc-900 pt-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">Progress Photos</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Front Photo */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 block text-center uppercase">Front Posture</span>
                  <div className="h-44 border-2 border-dashed border-zinc-800 rounded-2xl relative overflow-hidden bg-zinc-900/40 flex items-center justify-center">
                    {photoFront ? (
                      <img src={photoFront} alt="Front View" className="w-full h-full object-cover" />
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors w-full h-full">
                        <Camera className="w-6 h-6 mb-2" />
                        <span className="text-[10px] font-semibold">Upload Photo</span>
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'front')} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Side Photo */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 block text-center uppercase">Side Profile</span>
                  <div className="h-44 border-2 border-dashed border-zinc-800 rounded-2xl relative overflow-hidden bg-zinc-900/40 flex items-center justify-center">
                    {photoSide ? (
                      <img src={photoSide} alt="Side View" className="w-full h-full object-cover" />
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors w-full h-full">
                        <Camera className="w-6 h-6 mb-2" />
                        <span className="text-[10px] font-semibold">Upload Photo</span>
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'side')} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Back Photo */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 block text-center uppercase">Back Posture</span>
                  <div className="h-44 border-2 border-dashed border-zinc-800 rounded-2xl relative overflow-hidden bg-zinc-900/40 flex items-center justify-center">
                    {photoBack ? (
                      <img src={photoBack} alt="Back View" className="w-full h-full object-cover" />
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer text-zinc-500 hover:text-zinc-400 transition-colors w-full h-full">
                        <Camera className="w-6 h-6 mb-2" />
                        <span className="text-[10px] font-semibold">Upload Photo</span>
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'back')} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Right column: Before vs After side-by-side comparison */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 space-y-5">
            <h3 className="font-extrabold text-lg text-zinc-100 flex items-center gap-2">
              <History className="w-5 h-5 text-fitgreen-400" />
              Before vs. Current
            </h3>

            {history.length >= 2 ? (
              <div className="space-y-4">
                {/* Select log dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Before Date</span>
                    <select
                      value={selectedBeforeId}
                      onChange={(e) => setSelectedBeforeId(e.target.value)}
                      className="w-full glass-input text-xs font-bold py-1.5"
                    >
                      {history.map(h => (
                        <option key={h.id} value={h.id.toString()} className="bg-zinc-900 text-zinc-200">
                          {h.date}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Current Date</span>
                    <select
                      value={selectedCurrentId}
                      onChange={(e) => setSelectedCurrentId(e.target.value)}
                      className="w-full glass-input text-xs font-bold py-1.5"
                    >
                      {history.map(h => (
                        <option key={h.id} value={h.id.toString()} className="bg-zinc-900 text-zinc-200">
                          {h.date}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Deltas display list */}
                <div className="space-y-2 border-t border-zinc-900 pt-4">
                  {[
                    { label: 'Weight Change', key: 'weight', unit: 'kg' },
                    { label: 'Waist Delta', key: 'waist', unit: 'cm' },
                    { label: 'Chest Delta', key: 'chest', unit: 'cm' },
                    { label: 'Arms Delta', key: 'arms', unit: 'cm' },
                    { label: 'Shoulders Delta', key: 'shoulders', unit: 'cm' },
                    { label: 'Thighs Delta', key: 'thighs', unit: 'cm' },
                  ].map(stat => {
                    const delta = getDeltaString(stat.key, stat.unit);
                    if (!delta) return null;
                    const isNeg = delta.startsWith('-');
                    const isPos = delta.startsWith('+');
                    return (
                      <div key={stat.key} className="flex justify-between items-center text-xs py-1">
                        <span className="text-zinc-400 font-medium">{stat.label}</span>
                        <span className={`font-black ${
                          isPos && stat.key !== 'waist' ? 'text-fitgreen-400' :
                          isNeg && stat.key === 'waist' ? 'text-fitgreen-400' :
                          delta === '0' ? 'text-zinc-500' : 'text-cyber-400'
                        }`}>
                          {delta}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Image side by side */}
                {beforeLog && currentLog && (beforeLog.photo_front || currentLog.photo_front) && (
                  <div className="border-t border-zinc-900 pt-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block text-center">Front Comparison</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-32 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/30 flex items-center justify-center text-[10px] text-zinc-500">
                        {beforeLog.photo_front ? (
                          <img src={beforeLog.photo_front} alt="Before" className="w-full h-full object-cover" />
                        ) : 'No photo'}
                      </div>
                      <div className="h-32 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/30 flex items-center justify-center text-[10px] text-zinc-500">
                        {currentLog.photo_front ? (
                          <img src={currentLog.photo_front} alt="Current" className="w-full h-full object-cover" />
                        ) : 'No photo'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-zinc-500 italic border border-dashed border-zinc-800/80 rounded-2xl">
                Need at least 2 logged progress dates to compute before vs. current deltas.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
