const express = require('express');
const router = express.Router();
const db = require('./db'); // përdor lidhjen e përbashkët me SQLite


// READ: Merr të gjitha produktet nga menu_items për panelin e adminit
router.get('/', (req, res) => {

  console.log('🔥 ADM-MENU U THIRR!');

  db.all(`SELECT * FROM menu_items`, [], (err, rows) => {

    if (err) {
      console.error('❌ Gabim gjatë leximit të menu_items:', err.message);
      return res.status(500).json({ error: err.message });
    }

    console.log('📦 Numri i produkteve:', rows.length);

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


      console.log('✅ Produktet u formatizuan me sukses');

      res.json(formattedProducts);


    } catch (parseErr) {

      console.error(
        '❌ Gabim gjatë formatimit të të dhënave:',
        parseErr.message
      );

      res.status(500).json({
        error: parseErr.message
      });

    }

  });

});


module.exports = router;