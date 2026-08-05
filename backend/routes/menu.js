const express = require('express');
const router = express.Router();
const sqlite3 = require('../.gitignore/node_modules/sqlite3/lib/sqlite3').verbose();
const path = require('path');

// Lidhja me databazën menu.db
const dbPath = path.join(__dirname, '../db/menu.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("Gabim në lidhjen me databazën për API:", err.message);
  }
});

router.get('/', (req, res) => {
  const query = `SELECT * FROM menu_items`;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Gabim në server gjatë leximit të databazës" });
    }

    // Transformimi i rreshtave të SQLite në strukturën e dëshiruar JSON
   const formattedMenu = rows.map(row => {
  return {
    id: row.original_json_id || row.id,
    category: [
      { en: row.category_en || "" },
      { sq: row.category_sq || "" },
      { it: row.category_it || "" }
    ],
    name: [
      { en: row.name_en || "" },
      { sq: row.name_sq || "" },
      { it: row.name_it || "" }
    ],
    description: [
      { en: row.description_en || "" },
      { sq: row.description_sq || "" },
      { it: row.description_it || "" }
    ],
    Price: row.price_family
      ? { normal: row.price, family: row.price_family }
      : { normal: row.price },

    image: row.image || "",

    Granishes: row.garnishes_sq
      ? JSON.parse(row.garnishes_sq)
      : null
  };
});

    res.json(formattedMenu);
  });
});

module.exports = router;