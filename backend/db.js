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
  console.log('Detected PostgreSQL database configuration. Connecting to Neon/Cloud DB...');
  pgClient = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Required for Neon cloud database SSL connections
  });
  pgClient.connect().then(() => {
    console.log('Connected to PostgreSQL successfully!');
  }).catch(err => {
    console.error('PostgreSQL connection failed:', err.message);
  });
} else {
  const dbPath = path.join(__dirname, 'database.sqlite');
  console.log('No DATABASE_URL found. Falling back to local SQLite at:', dbPath);
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
  // Convert AUTOINCREMENT
  script = script.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
  // Convert DATETIME
  script = script.replace(/DATETIME/gi, 'TIMESTAMP');
  return script;
}

// Helper wrappers to use Promises across both database drivers
export const queryRun = (sql, params = []) => {
  if (isPostgres) {
    return new Promise(async (resolve, reject) => {
      try {
        let pgSql = translateQuery(sql);
        // Append RETURNING id for insert statements to fetch auto-generated primary keys
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
    // 1. Members Table
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

    // Seed default users if the table is empty
    const membersCount = await queryGet('SELECT COUNT(*) as count FROM members');
    // In PostgreSQL count returns a string, so we parse it
    const count = parseInt(membersCount?.count || membersCount?.COUNT || 0);

    if (count === 0) {
      console.log('Seeding default members into the database...');
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      const defaultPasswordHash = bcrypt.hashSync('password123', 10);

      // Add Admin
      await queryRun(
        'INSERT INTO members (name, mobile, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin User', '9999999999', 'admin', adminPasswordHash, 'admin', 'active']
      );

      // Add Default Members 1 to 5
      const defaultMembers = [
        { name: 'Vikas', mobile: '9876543210', username: 'member1' },
        { name: 'Rahul', mobile: '9876543211', username: 'member2' },
        { name: 'Amit', mobile: '9876543212', username: 'member3' },
        { name: 'Sandeep', mobile: '9876543213', username: 'member4' },
        { name: 'Deepak', mobile: '9876543214', username: 'member5' }
      ];

      for (const m of defaultMembers) {
        await queryRun(
          'INSERT INTO members (name, mobile, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
          [m.name, m.mobile, m.username, defaultPasswordHash, 'member', 'active']
        );
      }
      console.log('Seeding completed successfully!');
    }
  } catch (err) {
    console.error('Error during database initialization/seeding:', err.message);
  }
};

const db = { queryRun, queryGet, queryAll, initDatabase };
export default db;
