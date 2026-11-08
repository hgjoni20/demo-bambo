const express = require('express');
const router = express.Router();
const db = require('./db'); 

// READ: Merr të gjitha produktet nga menu_items për panelin e adminit
router.get('/', (req, res) => {

  db.all(`SELECT * FROM menu_items`, [], (err, rows) => {

    if (err) {
      console.error('Gabim gjatë leximit:', err.message);
      return res.status(500).json({ error: err.message });
    }

    try {

      const formattedProducts = rows.map((row) => {

        return {

          id: row.original_json_id || row.id,

          name: [
            {
              en: row.name_en || ""
            },
            {
              sq: row.name_sq || ""
            },
            {
              it: row.name_it || ""
            }
          ],


          category: [
            {
              en: row.category_en || ""
            },
            {
              sq: row.category_sq || ""
            },
            {
              it: row.category_it || ""
            }
          ],


          description: [
            {
              en: row.description_en || ""
            },
            {
              sq: row.description_sq || ""
            },
            {
              it: row.description_it || ""
            }
          ],


          Price: {
            normal: row.price,
            family: row.price_family || null
          },


          Granishes: row.garnishes_sq
            ? JSON.parse(row.garnishes_sq)
            : [],


          image: row.image || "assets/banneri.webp"

        };

      });

      res.json(formattedProducts);


    } catch (parseErr) {

      console.error(
        'Gabim gjatë formatimit të të dhënave:',
        parseErr.message
      );

      res.status(500).json({
        error: parseErr.message
      });

    }

  });

});


module.exports = router;