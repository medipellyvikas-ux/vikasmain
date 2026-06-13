import React, { useState, useEffect } from 'react';
import { Award, Flame, Lock, CheckCircle2, Star, Shield, Trophy, FlameKindling } from 'lucide-react';
import { useToast } from '../App';

const BADGE_TEMPLATES = [
  {
    name: 'First Blood',
    description: 'Completed your first workout session!',
    icon: Star,
    color: 'from-amber-600 to-yellow-400',
    type: 'workout'
  },
  {
    name: 'Week Warrior',
    description: 'Completed 7 workout sessions!',
    icon: Shield,
    color: 'from-blue-600 to-cyan-400',
    type: 'workout'
  },
  {
    name: '7 Day Streak',
    description: 'Worked out for 7 consecutive days!',
    icon: Flame,
    color: 'from-orange-600 to-red-500',
    type: 'streak'
  },
  {
    name: 'First 5 Kg Weight Loss',
    description: 'Shed 5 kilograms from your initial starting weight!',
    icon: Trophy,
    color: 'from-emerald-600 to-teal-400',
    type: 'weight'
  },
  {
    name: 'First 10 Kg Weight Lift Increase',
    description: 'Increased your workout weight by 10 kg on a lift!',
    icon: Award,
    color: 'from-purple-600 to-pink-500',
    type: 'lift'
  },
  {
    name: 'Month Master',
    description: 'Completed 30 workout sessions!',
    icon: Trophy,
    color: 'from-yellow-600 to-yellow-400',
    type: 'workout'
  },
  {
    name: '30 Day Streak',
    description: 'Worked out for 30 consecutive days!',
    icon: FlameKindling,
    color: 'from-red-600 to-rose-500',
    type: 'streak'
  },
  {
    name: 'Centurion Lifter',
    description: 'Completed 100 workout sessions!',
    icon: Shield,
    color: 'from-purple-700 to-indigo-500',
    type: 'workout'
  }
];

export default function Gamification() {
  const { addToast } = useToast();

  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    const token = localStorage.getItem('gym_token');
    try {
      const res = await fetch('/api/gym/badges', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnlockedBadges(data.map(b => b.name));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBadgeClick = (badgeName, isUnlocked) => {
    if (isUnlocked) {
      addToast(
        "Milestone Unlocked!",
        `Congratulations on achieving the "${badgeName}" badge! Keep up the dedication!`,
        "success"
      );
    } else {
      addToast(
        "Locked Milestone",
        `Work hard to unlock "${badgeName}". Check the details to see the requirement.`,
        "info"
      );
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
      <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80">
        <span className="text-xs font-bold uppercase tracking-widest text-fitgreen-400 block mb-1">Milestones & Achievements</span>
        <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          AeroFit Badge Cabinet
        </h2>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 text-center">
          <span className="text-xs font-bold text-zinc-500 uppercase block">Total Badges</span>
          <span className="text-4xl font-black text-zinc-100 block mt-2">{unlockedBadges.length} / 8</span>
          <span className="text-[10px] text-zinc-400 block mt-1">Unlocked Milestones</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 text-center">
          <span className="text-xs font-bold text-zinc-500 uppercase block">Next Target</span>
          <span className="text-lg font-black text-cyber-400 block mt-3 uppercase tracking-wider">7-Day Streak</span>
          <span className="text-[10px] text-zinc-500 block mt-1">Consistency pays off</span>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-zinc-800/60 text-center">
          <span className="text-xs font-bold text-zinc-500 uppercase block">Profile Tier</span>
          <span className="text-lg font-black text-fitgreen-400 block mt-3 uppercase tracking-wider">Beginner Iron</span>
          <span className="text-[10px] text-zinc-500 block mt-1">Level 1 Fitness Enthusiast</span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {BADGE_TEMPLATES.map(badge => {
          const isUnlocked = unlockedBadges.includes(badge.name);
          const Icon = badge.icon;

          return (
            <div
              key={badge.name}
              onClick={() => handleBadgeClick(badge.name, isUnlocked)}
              className={`glass-panel p-6 rounded-3xl border text-center flex flex-col items-center justify-between cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                isUnlocked
                  ? 'border-fitgreen-500/30 hover:border-fitgreen-400/50 hover:bg-zinc-900/30'
                  : 'border-zinc-800/60 opacity-60 hover:opacity-80'
              }`}
            >
              {/* Highlight radial glow for unlocked badges */}
              {isUnlocked && (
                <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-fitgreen-500/10 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-300"></div>
              )}

              {/* Badge Icon */}
              <div className="relative mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover:rotate-6 ${
                  isUnlocked
                    ? `bg-gradient-to-tr ${badge.color} text-zinc-950 shadow-fitgreen-500/20`
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                }`}>
                  <Icon className="w-8 h-8" />
                </div>
                
                {/* Lock Overlay */}
                {!isUnlocked && (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-zinc-950 border border-zinc-800 p-1 rounded-md text-zinc-500 shadow-md">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}
                {isUnlocked && (
                  <div className="absolute -bottom-1.5 -right-1.5 bg-fitgreen-500 border border-zinc-950 p-0.5 rounded-full text-zinc-950 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 fill-fitgreen-500 text-zinc-950" />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="space-y-1">
                <h4 className={`font-black text-sm ${isUnlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                  {badge.name}
                </h4>
                <p className="text-[11px] text-zinc-400 leading-normal min-h-[32px] flex items-center justify-center">
                  {badge.description}
                </p>
              </div>

              {/* Unlock State Badge */}
              <div className="mt-4 pt-3 border-t border-zinc-900/60 w-full">
                <span className={`text-[9px] uppercase font-black tracking-widest ${
                  isUnlocked ? 'text-fitgreen-400' : 'text-zinc-600'
                }`}>
                  {isUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
