const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Helper to run query returning Promise
const queryRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const queryGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const queryAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const initDB = async () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Users Table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'patient',
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Doctors Table
      db.run(`
        CREATE TABLE IF NOT EXISTS doctors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          specialty TEXT NOT NULL,
          qualification TEXT NOT NULL,
          experience INTEGER NOT NULL,
          fee REAL NOT NULL,
          rating REAL NOT NULL,
          review_count INTEGER DEFAULT 0,
          clinic_address TEXT NOT NULL,
          city TEXT NOT NULL,
          available_days TEXT NOT NULL,
          avatar TEXT,
          bio TEXT
        )
      `);

      // Appointments Table with Late Cancellation Fee Columns
      db.run(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          doctor_id INTEGER NOT NULL,
          patient_name TEXT NOT NULL,
          patient_phone TEXT NOT NULL,
          appointment_date TEXT NOT NULL,
          time_slot TEXT NOT NULL,
          symptoms TEXT,
          is_emergency INTEGER DEFAULT 0,
          status TEXT DEFAULT 'Confirmed',
          cancellation_fee REAL DEFAULT 0,
          cancellation_reason TEXT,
          cancelled_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (patient_id) REFERENCES users(id),
          FOREIGN KEY (doctor_id) REFERENCES doctors(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });

      // System Logs Table
      db.run(`
        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  });
};

module.exports = {
  db,
  queryRun,
  queryGet,
  queryAll,
  initDB
};
