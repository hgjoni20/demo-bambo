const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db', 'menu.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Gabim në lidhjen me databazen:', err.message);
  } else {
  }
});

db.run(
  `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_normal REAL NOT NULL,
    price_family REAL,
    description TEXT,
    garnishes TEXT,
    image TEXT NOT NULL
  )
  `,
  (err) => {
    if (err) {
      console.error('Gabim gjatë krijimit të tabeles:', err.message);
    } else {
    }
  }
);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    password_hash TEXT NOT NULL
  )`, (err) => {
    if (!err) {
    }
  });
});

module.exports = db;