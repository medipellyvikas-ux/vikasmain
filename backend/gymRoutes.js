import express from 'express';
import { queryRun, queryGet, queryAll } from './db.js';
import { authenticateToken, requireAdmin } from './routes.js';

const router = express.Router();

// Define a db helper to allow copy-paste compatibility of existing gym queries
const db = { queryRun, queryGet, queryAll };

// ================= USER PROFILE ROUTE =================

// Get unified member profile and fitness profile
router.get('/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.queryGet(`
      SELECT m.id, m.name, m.username, m.role, m.mobile,
             f.age, f.height, f.weight, f.target_weight, f.fitness_goal, f.start_date
      FROM members m
      LEFT JOIN member_fitness_profiles f ON m.id = f.member_id
      WHERE m.id = ?
    `, [req.user.id]);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put('/user/profile', authenticateToken, async (req, res) => {
  const { name, age, height, weight, target_weight, fitness_goal } = req.body;
  try {
    // 1. Update main roommate name if provided
    if (name) {
      await db.queryRun('UPDATE members SET name = ? WHERE id = ?', [name, req.user.id]);
    }

    // 2. Update or insert fitness profile details
    const existing = await db.queryGet('SELECT member_id FROM member_fitness_profiles WHERE member_id = ?', [req.user.id]);
    if (existing) {
      await db.queryRun(
        'UPDATE member_fitness_profiles SET age = ?, height = ?, weight = ?, target_weight = ?, fitness_goal = ? WHERE member_id = ?',
        [
          age ? parseInt(age) : null,
          height ? parseFloat(height) : null,
          weight ? parseFloat(weight) : null,
          target_weight ? parseFloat(target_weight) : null,
          fitness_goal,
          req.user.id
        ]
      );
    } else {
      await db.queryRun(
        'INSERT INTO member_fitness_profiles (member_id, age, height, weight, target_weight, fitness_goal) VALUES (?, ?, ?, ?, ?, ?) RETURNING member_id',
        [
          req.user.id,
          age ? parseInt(age) : 26,
          height ? parseFloat(height) : 170.0,
          weight ? parseFloat(weight) : 73.0,
          target_weight ? parseFloat(target_weight) : 68.0,
          fitness_goal || 'Muscle Building'
        ]
      );
    }

    // 3. Automatically log weight in progress measurements
    if (weight) {
      const today = new Date().toISOString().split('T')[0];
      const existingMeas = await db.queryGet('SELECT id FROM progress_measurements WHERE user_id = ? AND date = ?', [req.user.id, today]);
      if (existingMeas) {
        await db.queryRun('UPDATE progress_measurements SET weight = ? WHERE id = ?', [parseFloat(weight), existingMeas.id]);
      } else {
        await db.queryRun(
          'INSERT INTO progress_measurements (user_id, date, weight) VALUES (?, ?, ?)',
          [req.user.id, today, parseFloat(weight)]
        );
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= EXERCISE LIBRARY =================

router.get('/exercises', authenticateToken, async (req, res) => {
  try {
    const exercises = await db.queryAll('SELECT * FROM exercises ORDER BY muscle_group, name');
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/exercises', authenticateToken, requireAdmin, async (req, res) => {
  const { name, muscle_group, difficulty, instructions, common_mistakes, safety_tips, beginner_tips } = req.body;
  try {
    const result = await db.queryRun(
      'INSERT INTO exercises (name, muscle_group, difficulty, instructions, common_mistakes, safety_tips, beginner_tips) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        muscle_group,
        difficulty,
        JSON.stringify(instructions || []),
        JSON.stringify(common_mistakes || []),
        JSON.stringify(safety_tips || []),
        JSON.stringify(beginner_tips || [])
      ]
    );
    res.status(201).json({ id: result.id, message: 'Exercise added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/exercises/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.queryRun('DELETE FROM exercises WHERE id = ?', [req.params.id]);
    res.json({ message: 'Exercise deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= DAILY WORKOUT MODULE =================

router.get('/workouts', authenticateToken, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date parameter is required' });

  try {
    const workouts = await db.queryAll('SELECT * FROM workouts WHERE user_id = ? AND date = ?', [req.user.id, date]);
    res.json(workouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/workouts', authenticateToken, async (req, res) => {
  const { name, date, exercises } = req.body;
  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }

  try {
    const result = await db.queryRun(
      'INSERT INTO workouts (user_id, name, date, duration_seconds, completed) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, date, 0, 0]
    );
    const workoutId = result.id;

    if (exercises && Array.isArray(exercises)) {
      for (const ex of exercises) {
        const setsStr = JSON.stringify(ex.sets_data || []);
        let vol = 0;
        if (ex.sets_data) {
          vol = ex.sets_data.reduce((acc, curr) => acc + (curr.completed ? (curr.reps * curr.weight) : 0), 0);
        }
        await db.queryRun(
          'INSERT INTO workout_logs (workout_id, exercise_id, sets_data, total_volume, notes) VALUES (?, ?, ?, ?, ?)',
          [workoutId, ex.id, setsStr, vol, '']
        );
      }
    }

    res.status(201).json({ id: workoutId, name, date, completed: 0, message: 'Workout logged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/workouts/:id', authenticateToken, async (req, res) => {
  const { duration_seconds, completed, name } = req.body;
  try {
    const workout = await db.queryGet('SELECT * FROM workouts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });

    let updateFields = [];
    let params = [];

    if (duration_seconds !== undefined) {
      updateFields.push('duration_seconds = ?');
      params.push(parseInt(duration_seconds));
    }
    if (completed !== undefined) {
      updateFields.push('completed = ?');
      params.push(parseInt(completed));
    }
    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }

    if (updateFields.length > 0) {
      params.push(req.params.id);
      await db.queryRun(`UPDATE workouts SET ${updateFields.join(', ')} WHERE id = ?`, params);
    }

    res.json({ message: 'Workout details updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/workouts/:id/logs', authenticateToken, async (req, res) => {
  try {
    const workout = await db.queryGet('SELECT id FROM workouts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });

    const logs = await db.queryAll(
      `SELECT wl.*, e.name as exercise_name, e.muscle_group 
       FROM workout_logs wl
       JOIN exercises e ON wl.exercise_id = e.id
       WHERE wl.workout_id = ?`,
      [req.params.id]
    );

    const formatted = logs.map(l => ({
      id: l.id,
      workout_id: l.workout_id,
      exercise_id: l.exercise_id,
      exercise_name: l.exercise_name,
      muscle_group: l.muscle_group,
      sets_data: JSON.parse(l.sets_data || '[]'),
      total_volume: l.total_volume,
      notes: l.notes || ''
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/workouts/:id/logs', authenticateToken, async (req, res) => {
  const { exercise_logs } = req.body;
  try {
    const workout = await db.queryGet('SELECT id FROM workouts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!workout) return res.status(404).json({ error: 'Workout not found' });

    await db.queryRun('DELETE FROM workout_logs WHERE workout_id = ?', [req.params.id]);

    for (const log of exercise_logs) {
      const setsStr = JSON.stringify(log.sets_data || []);
      const vol = (log.sets_data || []).reduce((acc, curr) => acc + (curr.completed ? (parseFloat(curr.reps || 0) * parseFloat(curr.weight || 0)) : 0), 0);
      await db.queryRun(
        'INSERT INTO workout_logs (workout_id, exercise_id, sets_data, total_volume, notes) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, log.exercise_id, setsStr, vol, log.notes || '']
      );
    }

    res.json({ message: 'Exercise logs updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= OUTDOOR JOGGING =================

router.get('/jogging', authenticateToken, async (req, res) => {
  try {
    const logs = await db.queryAll('SELECT * FROM jogging_logs WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/jogging', authenticateToken, async (req, res) => {
  const { date, distance, duration_minutes, notes } = req.body;
  if (!date || !distance || !duration_minutes) {
    return res.status(400).json({ error: 'Date, distance, and duration are required' });
  }

  const pace = parseFloat(duration_minutes) / parseFloat(distance);

  try {
    const existing = await db.queryGet('SELECT id FROM jogging_logs WHERE user_id = ? AND date = ?', [req.user.id, date]);
    if (existing) {
      await db.queryRun(
        'UPDATE jogging_logs SET distance = ?, duration_minutes = ?, pace = ?, notes = ? WHERE id = ?',
        [parseFloat(distance), parseFloat(duration_minutes), pace, notes || '', existing.id]
      );
    } else {
      await db.queryRun(
        'INSERT INTO jogging_logs (user_id, date, distance, duration_minutes, pace, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, date, parseFloat(distance), parseFloat(duration_minutes), pace, notes || '']
      );
    }

    const existingWorkout = await db.queryGet('SELECT id FROM workouts WHERE user_id = ? AND date = ? AND name = ?', [req.user.id, date, 'Outdoor Jogging']);
    if (!existingWorkout) {
      await db.queryRun(
        'INSERT INTO workouts (user_id, name, date, duration_seconds, completed) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'Outdoor Jogging', date, parseFloat(duration_minutes) * 60, 1]
      );
    }

    res.json({ message: 'Jogging session logged successfully', pace });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= NUTRITION TRACKER =================

router.get('/nutrition', authenticateToken, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const log = await db.queryGet('SELECT * FROM nutrition_logs WHERE user_id = ? AND date = ?', [req.user.id, date]);
    if (!log) {
      return res.json({
        eggs: 0, chicken: 0, fish: 0, milk: 0, curd: 0, paneer: 0, whey_protein: 0, custom_protein: 0, custom_calories: 0
      });
    }
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/nutrition', authenticateToken, async (req, res) => {
  const { date, eggs, chicken, fish, milk, curd, paneer, whey_protein, custom_protein, custom_calories } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const existing = await db.queryGet('SELECT id FROM nutrition_logs WHERE user_id = ? AND date = ?', [req.user.id, date]);
    if (existing) {
      await db.queryRun(
        `UPDATE nutrition_logs 
         SET eggs = ?, chicken = ?, fish = ?, milk = ?, curd = ?, paneer = ?, whey_protein = ?, custom_protein = ?, custom_calories = ? 
         WHERE id = ?`,
        [
          parseInt(eggs || 0),
          parseFloat(chicken || 0),
          parseFloat(fish || 0),
          parseFloat(milk || 0),
          parseFloat(curd || 0),
          parseFloat(paneer || 0),
          parseFloat(whey_protein || 0),
          parseFloat(custom_protein || 0),
          parseFloat(custom_calories || 0),
          existing.id
        ]
      );
    } else {
      await db.queryRun(
        `INSERT INTO nutrition_logs 
         (user_id, date, eggs, chicken, fish, milk, curd, paneer, whey_protein, custom_protein, custom_calories) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          date,
          parseInt(eggs || 0),
          parseFloat(chicken || 0),
          parseFloat(fish || 0),
          parseFloat(milk || 0),
          parseFloat(curd || 0),
          parseFloat(paneer || 0),
          parseFloat(whey_protein || 0),
          parseFloat(custom_protein || 0),
          parseFloat(custom_calories || 0)
        ]
      );
    }
    res.json({ message: 'Nutrition logged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= WATER TRACKER =================

router.get('/water', authenticateToken, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const log = await db.queryGet('SELECT * FROM water_logs WHERE user_id = ? AND date = ?', [req.user.id, date]);
    res.json({ amount_liters: log ? log.amount_liters : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/water', authenticateToken, async (req, res) => {
  const { date, amount_liters } = req.body;
  if (!date || amount_liters === undefined) {
    return res.status(400).json({ error: 'Date and amount are required' });
  }

  try {
    const existing = await db.queryGet('SELECT id FROM water_logs WHERE user_id = ? AND date = ?', [req.user.id, date]);
    if (existing) {
      await db.queryRun('UPDATE water_logs SET amount_liters = ? WHERE id = ?', [parseFloat(amount_liters), existing.id]);
    } else {
      await db.queryRun('INSERT INTO water_logs (user_id, date, amount_liters) VALUES (?, ?, ?)', [req.user.id, date, parseFloat(amount_liters)]);
    }
    res.json({ message: 'Water logged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SLEEP TRACKER =================

router.get('/sleep', authenticateToken, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const log = await db.queryGet('SELECT * FROM sleep_logs WHERE user_id = ? AND date = ?', [req.user.id, date]);
    res.json(log || { bed_time: '', wake_time: '', quality: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sleep', authenticateToken, async (req, res) => {
  const { date, bed_time, wake_time, quality } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const existing = await db.queryGet('SELECT id FROM sleep_logs WHERE user_id = ? AND date = ?', [req.user.id, date]);
    if (existing) {
      await db.queryRun(
        'UPDATE sleep_logs SET bed_time = ?, wake_time = ?, quality = ? WHERE id = ?',
        [bed_time, wake_time, quality, existing.id]
      );
    } else {
      await db.queryRun(
        'INSERT INTO sleep_logs (user_id, date, bed_time, wake_time, quality) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, date, bed_time, wake_time, quality]
      );
    }
    res.json({ message: 'Sleep logged successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PROGRESS TRACKER (BODY MEASUREMENTS & PHOTOS) =================

router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const logs = await db.queryAll('SELECT * FROM progress_measurements WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/progress', authenticateToken, async (req, res) => {
  const { date, weight, waist, chest, arms, shoulders, thighs, photo_front, photo_side, photo_back } = req.body;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const existing = await db.queryGet('SELECT * FROM progress_measurements WHERE user_id = ? AND date = ?', [req.user.id, date]);
    if (existing) {
      const upFields = [];
      const params = [];
      const fields = { weight, waist, chest, arms, shoulders, thighs, photo_front, photo_side, photo_back };
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          upFields.push(`${key} = ?`);
          params.push(val === '' ? null : val);
        }
      }
      params.push(existing.id);

      if (upFields.length > 0) {
        await db.queryRun(`UPDATE progress_measurements SET ${upFields.join(', ')} WHERE id = ?`, params);
      }
    } else {
      await db.queryRun(
        `INSERT INTO progress_measurements 
         (user_id, date, weight, waist, chest, arms, shoulders, thighs, photo_front, photo_side, photo_back) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          date,
          weight || null,
          waist || null,
          chest || null,
          arms || null,
          shoulders || null,
          thighs || null,
          photo_front || null,
          photo_side || null,
          photo_back || null
        ]
      );
    }

    if (weight) {
      await db.queryRun('UPDATE member_fitness_profiles SET weight = ? WHERE member_id = ?', [parseFloat(weight), req.user.id]);
    }

    res.json({ message: 'Progress recorded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GAMIFICATION (STREAKS & BADGES) =================

async function checkBadges(userId) {
  const unlocked = [];

  const fitnessProfile = await db.queryGet('SELECT * FROM member_fitness_profiles WHERE member_id = ?', [userId]);
  if (!fitnessProfile) return [];

  const userBadges = await db.queryAll('SELECT name FROM badges WHERE user_id = ?', [userId]);
  const activeBadges = userBadges.map(b => b.name);

  const registerBadge = async (name, description) => {
    if (!activeBadges.includes(name)) {
      await db.queryRun('INSERT INTO badges (user_id, name, description) VALUES (?, ?, ?)', [userId, name, description]);
      unlocked.push({ name, description });
    }
  };

  const workouts = await db.queryAll('SELECT id FROM workouts WHERE user_id = ? AND completed = 1', [userId]);
  const completedCount = workouts.length;

  if (completedCount >= 1) await registerBadge('First Blood', 'Completed your first workout session!');
  if (completedCount >= 7) await registerBadge('Week Warrior', 'Completed 7 workout sessions!');
  if (completedCount >= 30) await registerBadge('Month Master', 'Completed 30 workout sessions!');
  if (completedCount >= 100) await registerBadge('Centurion Lifter', 'Completed 100 workout sessions!');

  const startWeight = fitnessProfile.weight;
  const startMeas = await db.queryGet('SELECT weight FROM progress_measurements WHERE user_id = ? ORDER BY date ASC LIMIT 1', [userId]);
  const initialWeight = startMeas ? startMeas.weight : startWeight;

  if (initialWeight && fitnessProfile.weight) {
    const loss = initialWeight - fitnessProfile.weight;
    if (loss >= 5) {
      await registerBadge('First 5 Kg Weight Loss', 'Shed 5 kilograms from your initial starting weight!');
    }
  }

  const allLogs = await db.queryAll(
    `SELECT wl.exercise_id, wl.sets_data, w.date
     FROM workout_logs wl
     JOIN workouts w ON wl.workout_id = w.id
     WHERE w.user_id = ? AND w.completed = 1
     ORDER BY w.date ASC`,
    [userId]
  );

  const exercisesMaxWeight = {};
  for (const log of allLogs) {
    const sets = JSON.parse(log.sets_data || '[]');
    for (const s of sets) {
      if (s.completed && s.weight) {
        const wt = parseFloat(s.weight);
        const exId = log.exercise_id;
        if (!exercisesMaxWeight[exId]) {
          exercisesMaxWeight[exId] = { first: wt, max: wt };
        } else {
          exercisesMaxWeight[exId].max = Math.max(exercisesMaxWeight[exId].max, wt);
        }
      }
    }
  }

  for (const [exId, stats] of Object.entries(exercisesMaxWeight)) {
    if (stats.max - stats.first >= 10) {
      await registerBadge('First 10 Kg Weight Lift Increase', 'Increased your workout weight by 10 kg on a lift!');
      break;
    }
  }

  const completedDates = await db.queryAll(
    'SELECT DISTINCT date FROM workouts WHERE user_id = ? AND completed = 1 ORDER BY date ASC',
    [userId]
  );
  if (completedDates.length > 0) {
    let longestStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    for (const d of completedDates) {
      const curr = new Date(d.date);
      if (lastDate === null) {
        currentStreak = 1;
      } else {
        const diffTime = Math.abs(curr - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      lastDate = curr;
    }

    if (longestStreak >= 7) await registerBadge('7 Day Streak', 'Worked out for 7 consecutive days!');
    if (longestStreak >= 30) await registerBadge('30 Day Streak', 'Worked out for 30 consecutive days!');
  }

  return unlocked;
}

router.get('/badges', authenticateToken, async (req, res) => {
  try {
    await checkBadges(req.user.id);
    const badges = await db.queryAll('SELECT * FROM badges WHERE user_id = ? ORDER BY date_unlocked DESC', [req.user.id]);
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= NOTIFICATIONS REMINDERS =================

router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const list = await db.queryAll('SELECT * FROM notifications WHERE user_id = ?', [req.user.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/notifications/:id', authenticateToken, async (req, res) => {
  const { is_active, reminder_time } = req.body;
  try {
    const reminder = await db.queryGet('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    let upFields = [];
    let params = [];
    if (is_active !== undefined) {
      upFields.push('is_active = ?');
      params.push(parseInt(is_active));
    }
    if (reminder_time !== undefined) {
      upFields.push('reminder_time = ?');
      params.push(reminder_time);
    }

    if (upFields.length > 0) {
      params.push(req.params.id);
      await db.queryRun(`UPDATE notifications SET ${upFields.join(', ')} WHERE id = ?`, params);
    }
    res.json({ message: 'Reminder updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ANALYTICS =================

router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const weightLogs = await db.queryAll(
      'SELECT date, weight FROM progress_measurements WHERE user_id = ? AND weight IS NOT NULL ORDER BY date ASC LIMIT 30',
      [req.user.id]
    );

    const workouts = await db.queryAll(
      'SELECT date, completed FROM workouts WHERE user_id = ? ORDER BY date ASC',
      [req.user.id]
    );

    const muscleFreq = await db.queryAll(
      `SELECT e.muscle_group, COUNT(wl.id) as count
       FROM workout_logs wl
       JOIN exercises e ON wl.exercise_id = e.id
       JOIN workouts w ON wl.workout_id = w.id
       WHERE w.user_id = ? AND w.completed = 1
       GROUP BY e.muscle_group`,
      [req.user.id]
    );

    const proteinLogs = await db.queryAll(
      `SELECT date, eggs, chicken, fish, milk, curd, paneer, whey_protein, custom_protein
       FROM nutrition_logs
       WHERE user_id = ?
       ORDER BY date ASC LIMIT 30`,
      [req.user.id]
    );

    const formattedProtein = proteinLogs.map(p => {
      const total =
        (p.eggs || 0) * 6 +
        (p.chicken || 0) * 0.31 +
        (p.fish || 0) * 0.25 +
        (p.milk || 0) * 0.033 +
        (p.curd || 0) * 0.04 +
        (p.paneer || 0) * 0.18 +
        (p.whey_protein || 0) * 24 +
        (p.custom_protein || 0);

      return { date: p.date, protein: Math.round(total) };
    });

    const waterLogs = await db.queryAll(
      'SELECT date, amount_liters FROM water_logs WHERE user_id = ? ORDER BY date ASC LIMIT 30',
      [req.user.id]
    );

    const completedDates = workouts.filter(w => w.completed === 1).map(w => w.date);
    let currentStreak = 0;
    if (completedDates.length > 0) {
      const uniqueCompleted = [...new Set(completedDates)].sort();
      let lastDate = null;
      let tempStreak = 0;

      for (const d of uniqueCompleted) {
        const curr = new Date(d);
        if (lastDate === null) {
          tempStreak = 1;
        } else {
          const diff = Math.ceil(Math.abs(curr - lastDate) / (1000 * 60 * 60 * 24));
          if (diff === 1) tempStreak++;
          else if (diff > 1) tempStreak = 1;
        }
        lastDate = curr;
      }
      currentStreak = tempStreak;
    }

    res.json({
      weightTrend: weightLogs,
      workouts,
      muscleFreq,
      proteinTrend: formattedProtein,
      waterTrend: waterLogs,
      streak: currentStreak,
      totalCompleted: workouts.filter(w => w.completed === 1).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ADMIN PANEL FEATURES =================

// Get all users' fitness profiles
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.queryAll(`
      SELECT m.id, m.name, m.username, m.role,
             f.age, f.height, f.weight, f.target_weight, f.fitness_goal, f.start_date
      FROM members m
      LEFT JOIN member_fitness_profiles f ON m.id = f.member_id
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user fitness data (retains member profile for historical expenses)
router.delete('/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userToDelete = await db.queryGet('SELECT role FROM members WHERE id = ?', [req.params.id]);
    if (userToDelete && userToDelete.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    await db.queryRun('DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
    await db.queryRun('DELETE FROM sleep_logs WHERE user_id = ?', [req.params.id]);
    await db.queryRun('DELETE FROM water_logs WHERE user_id = ?', [req.params.id]);
    await db.queryRun('DELETE FROM nutrition_logs WHERE user_id = ?', [req.params.id]);
    await db.queryRun('DELETE FROM jogging_logs WHERE user_id = ?', [req.params.id]);
    await db.queryRun('DELETE FROM progress_measurements WHERE user_id = ?', [req.params.id]);
    await db.queryRun('DELETE FROM badges WHERE user_id = ?', [req.params.id]);
    await db.queryRun('DELETE FROM member_fitness_profiles WHERE member_id = ?', [req.params.id]);

    const w = await db.queryAll('SELECT id FROM workouts WHERE user_id = ?', [req.params.id]);
    for (const workout of w) {
      await db.queryRun('DELETE FROM workout_logs WHERE workout_id = ?', [workout.id]);
    }
    await db.queryRun('DELETE FROM workouts WHERE user_id = ?', [req.params.id]);

    res.json({ message: 'User fitness data cleared successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin reports dashboard
router.get('/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await db.queryGet('SELECT COUNT(*) as count FROM members WHERE role = ?', ['member']);
    const totalWorkouts = await db.queryGet('SELECT COUNT(*) as count FROM workouts WHERE completed = 1');
    const totalLogs = await db.queryGet('SELECT COUNT(*) as count FROM workout_logs');
    const popularExercises = await db.queryAll(
      `SELECT e.name, COUNT(wl.id) as count 
       FROM workout_logs wl
       JOIN exercises e ON wl.exercise_id = e.id
       GROUP BY e.name
       ORDER BY count DESC LIMIT 5`
    );

    res.json({
      totalUsers: totalUsers?.count || totalUsers?.COUNT || 0,
      totalWorkouts: totalWorkouts?.count || totalWorkouts?.COUNT || 0,
      totalLogs: totalLogs?.count || totalLogs?.COUNT || 0,
      popularExercises
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
