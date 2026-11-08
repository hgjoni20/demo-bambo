const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../db/menu.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

router.get('/', (req, res, next) => {
  const query = `SELECT * FROM menu_items`;

  db.all(query, [], (err, rows) => {
    if (err) {
      return next(err);
    }
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
        garnishes: [
          { sq: row.garnishes_sq || "" },
          { it: row.garnishes_it || "" },
          { en: row.garnishes_en || "" }
        ]
      };
    });
    // E-Tag generator for caching and the client will take a response 304
    // if nothing changed or the server will serve the new changes and 
    // sends new data on clinet cache 
    const jsonString = JSON.stringify(formattedMenu);
    const hash = crypto.createHash('md5').update(jsonString).digest('hex');
    const etagValue = `"${hash}"`; 

    res.setHeader('ETag', etagValue);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    if (req.headers['if-none-match'] === etagValue) {
      return res.status(304).end();
    }
    res.json(formattedMenu);
  });
});

module.exports = router;