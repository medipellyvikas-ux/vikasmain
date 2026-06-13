import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://');

let sqliteDb = null;
let pgClient = null;

if (isPostgres) {
  console.log('Bachelors Hub DB: Connecting to PostgreSQL...');
  pgClient = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  pgClient.connect().then(() => {
    console.log('Connected to PostgreSQL successfully!');
  }).catch(err => {
    console.error('PostgreSQL connection failed:', err.message);
  });
} else {
  const dbPath = path.join(__dirname, 'database.sqlite');
  console.log('Bachelors Hub DB: Falling back to local SQLite at:', dbPath);
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database successfully.');
    }
  });
}

// Translate SQLite "?" parameters to PostgreSQL "$1", "$2" format
function translateQuery(sql) {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Translate SQLite schema queries to PostgreSQL schema compatibility
function translateSchema(sql) {
  if (!isPostgres) return sql;
  let script = sql;
  script = script.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  script = script.replace(/DATETIME/gi, 'TIMESTAMP');
  return script;
}

// Helper wrappers to use Promises across both database drivers
export const queryRun = (sql, params = []) => {
  if (isPostgres) {
    return new Promise(async (resolve, reject) => {
      try {
        let pgSql = translateQuery(sql);
        if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
          pgSql += ' RETURNING id';
        }
        const res = await pgClient.query(pgSql, params);
        const lastID = res.rows[0]?.id || null;
        resolve({ id: lastID, changes: res.rowCount });
      } catch (err) {
        reject(err);
      }
    });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

export const queryGet = (sql, params = []) => {
  if (isPostgres) {
    return new Promise(async (resolve, reject) => {
      try {
        const pgSql = translateQuery(sql);
        const res = await pgClient.query(pgSql, params);
        resolve(res.rows[0] || null);
      } catch (err) {
        reject(err);
      }
    });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

export const queryAll = (sql, params = []) => {
  if (isPostgres) {
    return new Promise(async (resolve, reject) => {
      try {
        const pgSql = translateQuery(sql);
        const res = await pgClient.query(pgSql, params);
        resolve(res.rows);
      } catch (err) {
        reject(err);
      }
    });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initial table schemas and seeding function
export const initDatabase = async () => {
  try {
    // ---------------- ROOM EXPENSES SCHEMAS ----------------

    // 1. Members Table (Single Source of Auth)
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 2. Contributions Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        member_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        remarks TEXT,
        closed_month TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 3. Expenses Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        paid_by_member_id INTEGER,
        description TEXT,
        receipt_base64 TEXT,
        closed_month TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 4. Audit Logs Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        member_id INTEGER,
        action TEXT NOT NULL,
        details TEXT
      )
    `));

    // 5. Monthly Closings Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS monthly_closings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_year TEXT NOT NULL UNIQUE,
        closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_by INTEGER,
        total_contributions REAL NOT NULL,
        total_expenses REAL NOT NULL,
        wallet_balance REAL NOT NULL,
        settlement_data TEXT NOT NULL
      )
    `));

    // ---------------- GYM WORKOUT TRACKER SCHEMAS ----------------

    // 6. Member Fitness Profiles Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS member_fitness_profiles (
        member_id INTEGER PRIMARY KEY,
        age INTEGER DEFAULT 26,
        height REAL DEFAULT 170.0,
        weight REAL DEFAULT 73.0,
        target_weight REAL DEFAULT 68.0,
        fitness_goal TEXT DEFAULT 'Muscle Building',
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 7. Exercises Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        muscle_group TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        instructions TEXT,
        common_mistakes TEXT,
        safety_tips TEXT,
        beginner_tips TEXT
      )
    `));

    // 8. Workouts Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        duration_seconds INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 9. Workout Logs Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER,
        exercise_id INTEGER,
        sets_data TEXT,
        total_volume REAL DEFAULT 0,
        notes TEXT
      )
    `));

    // 10. Jogging Logs Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS jogging_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL UNIQUE,
        distance REAL NOT NULL,
        duration_minutes REAL NOT NULL,
        pace REAL NOT NULL,
        notes TEXT
      )
    `));

    // 11. Nutrition Logs Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS nutrition_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL UNIQUE,
        eggs INTEGER DEFAULT 0,
        chicken REAL DEFAULT 0,
        fish REAL DEFAULT 0,
        milk REAL DEFAULT 0,
        curd REAL DEFAULT 0,
        paneer REAL DEFAULT 0,
        whey_protein REAL DEFAULT 0,
        soya_chunks REAL DEFAULT 0,
        peanut_butter REAL DEFAULT 0,
        mutton REAL DEFAULT 0,
        salads REAL DEFAULT 0,
        banana REAL DEFAULT 0,
        custom_protein REAL DEFAULT 0,
        custom_carbs REAL DEFAULT 0,
        custom_fiber REAL DEFAULT 0,
        custom_calories REAL DEFAULT 0
      )
    `));

    // Migration for existing tables: add columns if they do not exist
    const migrateCols = [
      { name: 'soya_chunks', type: 'REAL DEFAULT 0' },
      { name: 'peanut_butter', type: 'REAL DEFAULT 0' },
      { name: 'mutton', type: 'REAL DEFAULT 0' },
      { name: 'salads', type: 'REAL DEFAULT 0' },
      { name: 'banana', type: 'REAL DEFAULT 0' },
      { name: 'custom_carbs', type: 'REAL DEFAULT 0' },
      { name: 'custom_fiber', type: 'REAL DEFAULT 0' }
    ];
    for (const col of migrateCols) {
      try {
        await queryRun(`ALTER TABLE nutrition_logs ADD COLUMN ${col.name} ${col.type}`);
      } catch (err) {
        // Swallowing "duplicate column name" errors
      }
    }

    // 12. Water Logs Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS water_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL UNIQUE,
        amount_liters REAL DEFAULT 0
      )
    `));

    // 13. Sleep Logs Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS sleep_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL UNIQUE,
        bed_time TEXT,
        wake_time TEXT,
        quality TEXT
      )
    `));

    // 14. Progress Measurements Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS progress_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL UNIQUE,
        weight REAL,
        waist REAL,
        chest REAL,
        arms REAL,
        shoulders REAL,
        thighs REAL,
        photo_front TEXT,
        photo_side TEXT,
        photo_back TEXT
      )
    `));

    // 15. Badges Table
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        date_unlocked DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `));

    // 16. Notifications Table (Daily Schedule Reminders)
    await queryRun(translateSchema(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        reminder_time TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )
    `));

    // ---------------- SEEDING LOGIC ----------------

    // Seed default members if table is empty
    const membersCount = await queryGet('SELECT COUNT(*) as count FROM members');
    const count = parseInt(membersCount?.count || membersCount?.COUNT || 0);

    // Auto-migrate old roommate names to new SpendLens roommate names if they exist
    if (count > 0) {
      const m1 = await queryGet("SELECT * FROM members WHERE username = 'member1'");
      if (m1 && m1.name === 'Vikas') {
        console.log('Migrating default members to SpendLens names...');
        await queryRun("UPDATE members SET name = 'Akhil' WHERE username = 'member1'");
        await queryRun("UPDATE members SET name = 'Vikas' WHERE username = 'member2'");
        await queryRun("UPDATE members SET name = 'Jithu' WHERE username = 'member3'");
        await queryRun("UPDATE members SET name = 'Bhanu' WHERE username = 'member4'");
        await queryRun("UPDATE members SET name = 'Jagan' WHERE username = 'member5'");
        console.log('Migration completed.');
      }
    }

    if (count === 0) {
      console.log('Seeding default members into the database...');
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      const defaultPasswordHash = bcrypt.hashSync('password123', 10);

      // Add Admin
      await queryRun(
        'INSERT INTO members (name, mobile, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin User', '9999999999', 'admin', adminPasswordHash, 'admin', 'active']
      );

      // Add Default Members 1 to 5 (SpendLens names)
      const defaultMembers = [
        { name: 'Akhil', mobile: '9876543210', username: 'member1' },
        { name: 'Vikas', mobile: '9876543211', username: 'member2' },
        { name: 'Jithu', mobile: '9876543212', username: 'member3' },
        { name: 'Bhanu', mobile: '9876543213', username: 'member4' },
        { name: 'Jagan', mobile: '9876543214', username: 'member5' }
      ];

      for (const m of defaultMembers) {
        await queryRun(
          'INSERT INTO members (name, mobile, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
          [m.name, m.mobile, m.username, defaultPasswordHash, 'member', 'active']
        );
      }
      console.log('Seeding members completed successfully!');
    }

    // Seed default fitness profiles & reminders for members who don't have one
    const activeMembers = await queryAll('SELECT id, role FROM members');
    for (const m of activeMembers) {
      const existingProfile = await queryGet('SELECT member_id FROM member_fitness_profiles WHERE member_id = ?', [m.id]);
      if (!existingProfile) {
        const isUserAdmin = m.role === 'admin';
        await queryRun(
          'INSERT INTO member_fitness_profiles (member_id, age, height, weight, target_weight, fitness_goal) VALUES (?, ?, ?, ?, ?, ?) RETURNING member_id',
          [
            m.id,
            isUserAdmin ? 30 : 26,
            isUserAdmin ? 175.0 : 170.0,
            isUserAdmin ? 75.0 : 73.0,
            isUserAdmin ? 75.0 : 68.0,
            isUserAdmin ? 'Fitness Maintenance' : 'Muscle Building'
          ]
        );

        // Seed default alerts/reminders for the member
        const defaultReminders = [
          { type: 'wakeup', title: 'Wake Up Reminder', message: 'Time to rise and shine! Hydrate first.', reminder_time: '05:30' },
          { type: 'workout', title: 'Gym Reminder', message: 'Time to hit your daily workout target!', reminder_time: '06:00' },
          { type: 'protein', title: 'Protein Intake', message: 'Log your protein intake after your workout!', reminder_time: '08:00' },
          { type: 'water', title: 'Water Intake', message: 'Drink water! Keep your hydration levels high.', reminder_time: '12:00' }
        ];
        for (const r of defaultReminders) {
          const reminderExists = await queryGet('SELECT id FROM notifications WHERE user_id = ? AND type = ?', [m.id, r.type]);
          if (!reminderExists) {
            await queryRun(
              'INSERT INTO notifications (user_id, type, title, message, reminder_time, is_active) VALUES (?, ?, ?, ?, ?, ?)',
              [m.id, r.type, r.title, r.message, r.reminder_time, 1]
            );
          }
        }
      }
    }

    // Seed exercises if exercises table is empty
    const exercisesCount = await queryGet('SELECT COUNT(*) as count FROM exercises');
    const eCount = parseInt(exercisesCount?.count || exercisesCount?.COUNT || 0);

    if (eCount === 0) {
      console.log('Seeding exercise library...');
      const exerciseSeedData = [
        // Monday: Chest + Triceps
        {
          name: 'Push-ups',
          muscle_group: 'Chest',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Place hands flat on the floor, slightly wider than shoulder-width apart.',
            'Extend your legs straight back, keeping your weight on your toes.',
            'Lower your chest toward the floor until your elbows form a 90-degree angle.',
            'Push through your palms to return to the starting position.'
          ]),
          common_mistakes: JSON.stringify([
            'Sagging hips or letting the lower back arch.',
            'Flaring elbows outward at a 90-degree angle from the torso.',
            'Half reps (not lowering the body all the way).'
          ]),
          safety_tips: JSON.stringify([
            'Keep your core fully engaged to maintain a straight line from head to heels.',
            'Tuck your elbows to a 45-degree angle to protect your shoulders.'
          ]),
          beginner_tips: JSON.stringify([
            'Perform on your knees or against a sturdy wall if standard push-ups are too difficult.'
          ])
        },
        {
          name: 'Bench Press',
          muscle_group: 'Chest',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Lie flat on your back on a bench with your feet flat on the floor.',
            'Grip the barbell with hands slightly wider than shoulder-width.',
            'Unrack the bar and lower it slowly to your mid-chest.',
            'Press the bar straight back up to arm\'s length, locking your elbows.'
          ]),
          common_mistakes: JSON.stringify([
            'Bouncing the bar off your chest.',
            'Lifting feet off the floor during the lift.',
            'Incorrect elbow positioning (flaring too wide).'
          ]),
          safety_tips: JSON.stringify([
            'Always use a spotter when lifting heavy weights.',
            'Ensure the collars are secured on the bar.'
          ]),
          beginner_tips: JSON.stringify([
            'Start with just the bar (20 kg) to focus on learning the correct bar path.'
          ])
        },
        {
          name: 'Incline Dumbbell Press',
          muscle_group: 'Chest',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Sit on an incline bench angled at about 30 to 45 degrees.',
            'Hold a dumbbell in each hand at shoulder width with palms facing forward.',
            'Press the dumbbells straight up above your chest until arms are extended.',
            'Slowly lower the weights back down to chest level.'
          ]),
          common_mistakes: JSON.stringify([
            'Clashing the dumbbells together at the top of the movement.',
            'Bench angle too high, shifting the focus to your shoulders.'
          ]),
          safety_tips: JSON.stringify([
            'Do not drop the dumbbells at the end of the set; lower them to your thighs first.'
          ]),
          beginner_tips: JSON.stringify([
            'Keep the bench at 30 degrees to maximize upper chest activation while minimizing shoulder strain.'
          ])
        },
        {
          name: 'Pec Deck Fly',
          muscle_group: 'Chest',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Sit on the machine with your back flat against the pad.',
            'Hold the handles, keeping your elbows slightly bent.',
            'Bring your hands together in front of your chest in a hugging motion.',
            'Slowly return to the starting position, maintaining control.'
          ]),
          common_mistakes: JSON.stringify([
            'Letting the weights crash on the return.',
            'Bending the elbows too much, turning the fly into a press.'
          ]),
          safety_tips: JSON.stringify([
            'Do not let the handles pull your arms too far back, which overstretches the shoulder joints.'
          ]),
          beginner_tips: JSON.stringify([
            'Squeeze your chest at the peak contraction for 1 second on each rep.'
          ])
        },
        {
          name: 'Tricep Pushdown',
          muscle_group: 'Triceps',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Attach a rope or bar to a high cable pulley.',
            'Grasp the handle and tuck your elbows close to your torso.',
            'Extend your arms fully, pushing the cable down and locking out your triceps.',
            'Slowly return the pulley back to the starting position.'
          ]),
          common_mistakes: JSON.stringify([
            'Allowing elbows to flare outward or drift forward.',
            'Using your body weight to press the cable down instead of your triceps.'
          ]),
          safety_tips: JSON.stringify([
            'Keep a upright posture with your shoulders back and chest up.'
          ]),
          beginner_tips: JSON.stringify([
            'Focus on squeezing the triceps at the bottom of the movement.'
          ])
        },
        {
          name: 'Overhead Tricep Extension',
          muscle_group: 'Triceps',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Hold a dumbbell with both hands overhead, cupping the top plate with your palms.',
            'Lower the dumbbell behind your head by bending your elbows.',
            'Extend your arms to lift the dumbbell back to the starting position overhead.'
          ]),
          common_mistakes: JSON.stringify([
            'Arching your lower back excessively.',
            'Allowing your elbows to flare out to the sides.'
          ]),
          safety_tips: JSON.stringify([
            'Keep your abdominal muscles tight to stabilize your spine.'
          ]),
          beginner_tips: JSON.stringify([
            'Can be done seated to provide better back support and stability.'
          ])
        },
        // Tuesday: Back + Biceps
        {
          name: 'Lat Pulldown',
          muscle_group: 'Back',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Sit at a lat pulldown machine and adjust the knee pad.',
            'Grip the bar with hands wider than shoulder-width, palms facing forward.',
            'Pull the bar down toward your upper chest, squeezing your shoulder blades.',
            'Slowly return the bar to the start position with fully extended arms.'
          ]),
          common_mistakes: JSON.stringify([
            'Pulling the bar behind your neck.',
            'Leaning back excessively and using momentum.'
          ]),
          safety_tips: JSON.stringify([
            'Ensure the knee pads lock your thighs securely to prevent lifting.'
          ]),
          beginner_tips: JSON.stringify([
            'Think of pulling with your elbows rather than your hands to engage the lats.'
          ])
        },
        {
          name: 'Seated Cable Row',
          muscle_group: 'Back',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Sit at a cable row station with feet on platform, knees slightly bent.',
            'Grasp the attachment and sit upright with arms fully extended.',
            'Pull the handle toward your lower abdomen, squeezing your shoulder blades together.',
            'Extend your arms back to the starting position.'
          ]),
          common_mistakes: JSON.stringify([
            'Rounding your lower back during execution.',
            'Rocking back and forth to lift the weight.'
          ]),
          safety_tips: JSON.stringify([
            'Keep a neutral spine and slight bend in knees throughout the entire set.'
          ]),
          beginner_tips: JSON.stringify([
            'Keep your shoulders down; do not shrug them toward your ears.'
          ])
        },
        {
          name: 'Dumbbell Row',
          muscle_group: 'Back',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Place one knee and same-side hand on a flat bench.',
            'Keep your other foot flat on the floor, holding a dumbbell in that hand.',
            'Pull the dumbbell upward to your hip, keeping elbow tucked close to body.',
            'Lower the dumbbell back down to the starting position.'
          ]),
          common_mistakes: JSON.stringify([
            'Rounding the lower back.',
            'Pulling the dumbbell to the chest instead of the hip.'
          ]),
          safety_tips: JSON.stringify([
            'Keep your neck aligned with your spine; look down at the bench, not forward.'
          ]),
          beginner_tips: JSON.stringify([
            'Focus on keeping your torso stationary; do not twist your hips.'
          ])
        },
        {
          name: 'Barbell Curl',
          muscle_group: 'Biceps',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Stand upright holding a barbell with an underhand grip at shoulder-width.',
            'Keep your elbows close to your torso.',
            'Curl the bar upward toward your shoulders while keeping upper arms still.',
            'Slowly lower the bar back to the starting position.'
          ]),
          common_mistakes: JSON.stringify([
            'Swinging the body or leaning back to lift the weight.',
            'Allowing elbows to drift forward, engaging front shoulders.'
          ]),
          safety_tips: JSON.stringify([
            'Keep knees slightly bent to relieve pressure on the lower back.'
          ]),
          beginner_tips: JSON.stringify([
            'Control the lowering phase; it is just as important as the curling phase.'
          ])
        },
        {
          name: 'Hammer Curl',
          muscle_group: 'Biceps',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Stand upright holding dumbbells in both hands with a neutral grip (palms facing each other).',
            'Curl the weights upward while keeping elbows tucked at your sides.',
            'Slowly lower the dumbbells back down to the starting position.'
          ]),
          common_mistakes: JSON.stringify([
            'Using hip momentum.',
            'Not completing the full range of motion.'
          ]),
          safety_tips: JSON.stringify([
            'Avoid locking out your elbows aggressively at the bottom.'
          ]),
          beginner_tips: JSON.stringify([
            'Hammer curls target the brachialis and forearm, helping build arm thickness.'
          ])
        },
        // Wednesday: Legs
        {
          name: 'Bodyweight Squat',
          muscle_group: 'Legs',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Stand with feet shoulder-width apart, toes pointed slightly outward.',
            'Lower your hips back and down as if sitting in a chair.',
            'Keep your chest up and knees aligned with your toes.',
            'Press through your heels to return to standing position.'
          ]),
          common_mistakes: JSON.stringify([
            'Allowing knees to cave inward.',
            'Lifting heels off the floor.',
            'Rounding the back.'
          ]),
          safety_tips: JSON.stringify([
            'Keep your spine neutral and look forward, not down.'
          ]),
          beginner_tips: JSON.stringify([
            'Practice squatting onto a bench or chair to build confidence and form.'
          ])
        },
        {
          name: 'Barbell Squat',
          muscle_group: 'Legs',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Rest the barbell on your upper back/trapezius muscles.',
            'Unrack the bar and take two steps back, setting feet shoulder-width apart.',
            'Lower your body by bending at the hips and knees until thighs are parallel to the floor.',
            'Drive back up to the starting position, pushing through the mid-foot.'
          ]),
          common_mistakes: JSON.stringify([
            'Squatting shallow (not reaching parallel).',
            'Allowing knees to travel too far inward (knee valgus).',
            'Heels lifting off the ground.'
          ]),
          safety_tips: JSON.stringify([
            'Always squat in a safety rack with the catch bars set at the proper height.'
          ]),
          beginner_tips: JSON.stringify([
            'Focus on depth and form before adding heavy weights.'
          ])
        },
        {
          name: 'Leg Press',
          muscle_group: 'Legs',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Sit on the leg press machine and place feet hip-width apart on the sled.',
            'Release the safety locks and lower the sled slowly toward your chest.',
            'Press the sled back up by extending your legs, without locking out your knees.'
          ]),
          common_mistakes: JSON.stringify([
            'Locking out your knees at the top of the movement.',
            'Lowering the weight too far, lifting your tailbone off the seat.'
          ]),
          safety_tips: JSON.stringify([
            'Always keep the safety handles ready in case you need to lock the weight.'
          ]),
          beginner_tips: JSON.stringify([
            'Varying foot placement on the sled targets different areas of the legs.'
          ])
        },
        {
          name: 'Leg Curl',
          muscle_group: 'Legs',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Lie face down on a lying leg curl machine, aligning your knees with the pivot point.',
            'Place the roller pad just below your calf muscles.',
            'Curl your legs upward toward your glutes, keeping your hips flat on the bench.',
            'Slowly extend your legs back to the starting position.'
          ]),
          common_mistakes: JSON.stringify([
            'Arching your lower back to lift the weight.',
            'Using rapid momentum.'
          ]),
          safety_tips: JSON.stringify([
            'Keep your torso flat on the pad; do not lift your pelvis.'
          ]),
          beginner_tips: JSON.stringify([
            'Focus on the hamstring contraction at the top of the movement.'
          ])
        },
        {
          name: 'Standing Calf Raise',
          muscle_group: 'Legs',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Stand with the balls of your feet on a raised platform, heels hanging off.',
            'Lower your heels as far as possible to stretch the calves.',
            'Press through the balls of your feet to raise your heels as high as possible.',
            'Lower slowly back to the stretched position.'
          ]),
          common_mistakes: JSON.stringify([
            'Bouncing at the bottom of the movement.',
            'Bending knees, making it a leg exercise instead of calves.'
          ]),
          safety_tips: JSON.stringify([
            'Hold a handrail or wall for balance.'
          ]),
          beginner_tips: JSON.stringify([
            'Hold the top position for 2 seconds to maximize calf muscle fibers engagement.'
          ])
        },
        // Thursday: Shoulders
        {
          name: 'Dumbbell Shoulder Press',
          muscle_group: 'Shoulders',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Sit on a bench with back support, holding dumbbells at shoulder height with palms facing forward.',
            'Press the dumbbells straight up overhead until your arms are fully extended.',
            'Slowly lower the weights back down to shoulder level.'
          ]),
          common_mistakes: JSON.stringify([
            'Arching the lower back.',
            'Locking the elbows aggressively at the top.'
          ]),
          safety_tips: JSON.stringify([
            'Ensure the bench back is upright or at a 85-degree angle to support your spine.'
          ]),
          beginner_tips: JSON.stringify([
            'Keep your wrists stacked directly over your elbows throughout the movement.'
          ])
        },
        {
          name: 'Lateral Raise',
          muscle_group: 'Shoulders',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Stand upright holding dumbbells at your sides.',
            'With a slight bend in your elbows, raise the weights out to the sides.',
            'Raise until your arms are parallel to the floor (shoulder height).',
            'Lower the dumbbells slowly back to your sides.'
          ]),
          common_mistakes: JSON.stringify([
            'Swinging the weights or using torso momentum.',
            'Raising the weights higher than shoulder level.'
          ]),
          safety_tips: JSON.stringify([
            'Lead with your elbows and keep wrists slightly lower to prevent shoulder impingement.'
          ]),
          beginner_tips: JSON.stringify([
            'Use light weights; this exercise targets a small muscle group (lateral delts).'
          ])
        },
        {
          name: 'Front Raise',
          muscle_group: 'Shoulders',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Stand holding dumbbells in front of your thighs, palms facing your body.',
            'Raise the dumbbells forward to shoulder height with a slight elbow bend.',
            'Slowly lower the weights back down.'
          ]),
          common_mistakes: JSON.stringify([
            'Rocking the body to swing the weights.',
            'Using weights that are too heavy.'
          ]),
          safety_tips: JSON.stringify([
            'Keep your core braced to prevent leaning back.'
          ]),
          beginner_tips: JSON.stringify([
            'Can be done alternating left and right arms to focus on form.'
          ])
        },
        {
          name: 'Rear Delt Fly',
          muscle_group: 'Shoulders',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Bend forward at the hips with knees slightly bent, holding dumbbells below your chest.',
            'Keep a flat back and raise the dumbbells out to the sides, squeezing your rear delts.',
            'Lower the weights slowly back down.'
          ]),
          common_mistakes: JSON.stringify([
            'Rounding the lower back.',
            'Using your back/lats instead of rear deltoids.'
          ]),
          safety_tips: JSON.stringify([
            'Keep your spine neutral; look at a spot on the floor 3 feet in front of you.'
          ]),
          beginner_tips: JSON.stringify([
            'Think of pushing the dumbbells outward rather than lifting them up.'
          ])
        },
        {
          name: 'Shrugs',
          muscle_group: 'Shoulders',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Stand upright holding dumbbells at your sides.',
            'Lift your shoulders as high as possible toward your ears (shrugging).',
            'Hold the contraction for 1 second, then lower your shoulders back down.'
          ]),
          common_mistakes: JSON.stringify([
            'Rolling the shoulders in a circle (can cause neck/shoulder strain).',
            'Bending elbows to lift the weights.'
          ]),
          safety_tips: JSON.stringify([
            'Move the shoulders in a strict vertical up-and-down path.'
          ]),
          beginner_tips: JSON.stringify([
            'Look straight ahead; tilting your head down can strain the neck muscles.'
          ])
        },
        // Saturday: Core + Mobility
        {
          name: 'Plank',
          muscle_group: 'Core',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Place your forearms on the floor, elbows aligned under shoulders.',
            'Extend legs back, toes on floor, lifting hips to form a straight line.',
            'Brace your core and hold the position.'
          ]),
          common_mistakes: JSON.stringify([
            'Hips sagging down or lifting too high in the air.',
            'Holding your breath.'
          ]),
          safety_tips: JSON.stringify([
            'Do not strain your neck; keep your gaze on the floor between your hands.'
          ]),
          beginner_tips: JSON.stringify([
            'Start with 20-30 second holds, focusing on tight glutes and abs.'
          ])
        },
        {
          name: 'Leg Raises',
          muscle_group: 'Core',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Lie flat on your back with legs straight, hands under glutes for support.',
            'Slowly raise your legs toward the ceiling until they form a 90-degree angle.',
            'Lower your legs slowly back down, stopping just before they touch the floor.'
          ]),
          common_mistakes: JSON.stringify([
            'Allowing the lower back to arch off the floor.',
            'Letting legs drop quickly on the lowering phase.'
          ]),
          safety_tips: JSON.stringify([
            'If your lower back arches, don\'t lower your legs as far.'
          ]),
          beginner_tips: JSON.stringify([
            'Bend your knees slightly to make the movement easier for your lower back.'
          ])
        },
        {
          name: 'Mountain Climbers',
          muscle_group: 'Core',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Start in a push-up position with hands under shoulders.',
            'Drive your right knee toward your chest, then return it.',
            'Immediately drive your left knee toward your chest.',
            'Alternate knees rapidly, maintaining a flat back.'
          ]),
          common_mistakes: JSON.stringify([
            'Bouncing hips up and down.',
            'Not bringing knees fully forward.'
          ]),
          safety_tips: JSON.stringify([
            'Keep your shoulders directly over your hands to avoid wrists strain.'
          ]),
          beginner_tips: JSON.stringify([
            'Perform the exercise slowly first, focusing on pulling the knee with your abs.'
          ])
        },
        {
          name: 'Stretching',
          muscle_group: 'Mobility',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Perform a full-body static stretching routine including chest, lats, quads, hamstrings, and calves.',
            'Hold each stretch for 20 to 30 seconds while breathing deeply.'
          ]),
          common_mistakes: JSON.stringify([
            'Bouncing while stretching (can cause muscle micro-tears).',
            'Stretching to the point of pain.'
          ]),
          safety_tips: JSON.stringify([
            'Only stretch when muscles are warm, e.g., after a light core workout.'
          ]),
          beginner_tips: JSON.stringify([
            'Focus on breathing and releasing tension with each exhalation.'
          ])
        },
        // Sunday: Jogging
        {
          name: 'Outdoor Jogging',
          muscle_group: 'Cardio',
          difficulty: 'Beginner',
          instructions: JSON.stringify([
            'Start with a 5-minute fast walk to warm up.',
            'Jog at a steady, conversational pace where you can still speak in full sentences.',
            'Maintain an upright posture, landing on your mid-foot.',
            'Cool down with a 5-minute slow walk.'
          ]),
          common_mistakes: JSON.stringify([
            'Running too fast too soon, leading to early fatigue.',
            'Heel striking heavily, placing stress on knees.'
          ]),
          safety_tips: JSON.stringify([
            'Wear supportive running shoes.',
            'Stay hydrated and run in well-lit, safe paths.'
          ]),
          beginner_tips: JSON.stringify([
            'Use a run-walk method (e.g. jog for 2 mins, walk for 1 min) to build endurance.'
          ])
        }
      ];

      for (const e of exerciseSeedData) {
        await queryRun(
          'INSERT INTO exercises (name, muscle_group, difficulty, instructions, common_mistakes, safety_tips, beginner_tips) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [e.name, e.muscle_group, e.difficulty, e.instructions, e.common_mistakes, e.safety_tips, e.beginner_tips]
        );
      }
      console.log('Pre-seeded exercise library successfully!');
    }
  } catch (err) {
    console.error('Error during database initialization/seeding:', err.message);
  }
};

const db = { queryRun, queryGet, queryAll, initDatabase };
export default db;
