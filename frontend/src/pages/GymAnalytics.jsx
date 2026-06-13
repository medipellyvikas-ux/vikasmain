import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Activity, Calendar, Award, Droplet, Apple, Scale } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    weightTrend: [],
    workouts: [],
    muscleFreq: [],
    proteinTrend: [],
    waterTrend: [],
    streak: 0,
    totalCompleted: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('gym_token');
    try {
      const res = await fetch('/api/gym/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getWeightData = () => {
    const dates = data.weightTrend.map(w => w.date);
    const weights = data.weightTrend.map(w => w.weight);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Body Weight (kg)',
          data: weights,
          borderColor: '#3b82f6', // Cyber Blue
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointHoverRadius: 7,
          fill: true
        }
      ]
    };
  };

  const getProteinData = () => {
    const dates = data.proteinTrend.map(p => p.date);
    const proteins = data.proteinTrend.map(p => p.protein);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Protein Intake (g)',
          data: proteins,
          backgroundColor: '#10b981', // Fit Green
          borderRadius: 6,
          borderWidth: 0,
          barThickness: 20
        }
      ]
    };
  };

  const getWaterData = () => {
    const dates = data.waterTrend.map(w => w.date);
    const waters = data.waterTrend.map(w => w.amount_liters);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Water Volume (L)',
          data: waters,
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.15)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: true
        }
      ]
    };
  };

  const getMuscleData = () => {
    const groups = data.muscleFreq.map(m => m.muscle_group);
    const counts = data.muscleFreq.map(m => parseInt(m.count));

    return {
      labels: groups,
      datasets: [
        {
          data: counts,
          backgroundColor: [
            '#3b82f6',
            '#10b981',
            '#8b5cf6',
            '#f59e0b',
            '#ec4899',
            '#14b8a6',
            '#f43f5e'
          ],
          borderWidth: 1,
          borderColor: document.documentElement.classList.contains('dark') ? '#18181b' : '#ffffff'
        }
      ]
    };
  };

  // Chart Global Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleFont: { family: 'Outfit', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        borderColor: '#27272a',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#71717a', font: { family: 'Inter', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(39, 39, 42, 0.4)' },
        ticks: { color: '#71717a', font: { family: 'Inter', size: 10 } }
      }
    }
  };

  // Dougnhut options
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#e4e4e7',
          font: { family: 'Outfit', size: 11 }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80">
        <span className="text-xs font-bold uppercase tracking-widest text-cyber-400 block mb-1">Performance Analytics</span>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-6 h-6 text-fitgreen-500" />
          Fitness Trends & Progress Curves
        </h2>
      </div>

      {/* Grid: Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Weight trend chart */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyber-400" />
              Weight Loss Curve
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg">Last 30 Logs</span>
          </div>
          <div className="h-64 relative">
            {data.weightTrend.length > 0 ? (
              <Line data={getWeightData()} options={chartOptions} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500">
                  <Scale className="w-8 h-8 text-cyber-400 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[280px]">
                  No weight records logged yet. Record your weight in the Body Progress tab.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Protein Intake Trend */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Apple className="w-4 h-4 text-fitgreen-400" />
              Daily Protein Consumed
            </h3>
            <span className="text-[10px] text-fitgreen-400 font-bold border border-fitgreen-500/20 bg-fitgreen-950/20 px-2.5 py-1 rounded-lg">Target: 120g</span>
          </div>
          <div className="h-64 relative">
            {data.proteinTrend.length > 0 ? (
              <Bar data={getProteinData()} options={chartOptions} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500">
                  <Apple className="w-8 h-8 text-fitgreen-400 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[280px]">
                  No protein logs recorded yet. Log your meals in the Nutrition Tracker.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Water Intake Trend */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Droplet className="w-4 h-4 text-sky-400" />
              Daily Water Intake
            </h3>
            <span className="text-[10px] text-sky-400 font-bold border border-sky-500/20 bg-sky-950/20 px-2.5 py-1 rounded-lg">Target: 4.0L</span>
          </div>
          <div className="h-64 relative">
            {data.waterTrend.length > 0 ? (
              <Line data={getWaterData()} options={chartOptions} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500">
                  <Droplet className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[280px]">
                  No water intake logged yet. Log your hydration on the Dashboard.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Muscle group split Doughnut */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Muscle Group Balance
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg">Volume Breakdown</span>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            {data.muscleFreq.length > 0 ? (
              <Doughnut data={getMuscleData()} options={doughnutOptions} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 space-y-3">
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500">
                  <Activity className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[280px]">
                  No workouts completed yet. Log your completed sets in the Workout Plan.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
