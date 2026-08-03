// backend/routes/db.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Rruga drejt databazës:
// __dirname = backend/routes
// ..         = backend
// db/menu.db = backend/db/menu.db
const dbPath = path.join(__dirname, '..', 'db', 'menu.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Gabim në lidhjen me SQLite:', err.message);
  } else {
    console.log('✅ Lidhur me databazën SQLite (menu.db) me sukses!');
  }
});

// Krijimi i tabelës vetëm një herë
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
      console.error('❌ Gabim gjatë krijimit të tabelës "products":', err.message);
    } else {
      console.log('✅ Tabela "products" është gati.');
    }
  }
);

module.exports = db;