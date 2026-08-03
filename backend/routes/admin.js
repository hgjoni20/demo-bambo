const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
const db = require("./db");

const upload = multer({ storage: multer.memoryStorage() });
const requireAdmin = require('../middleware/requireAdmin');
const bcrypt = require('bcrypt');


router.get('/check', requireAdmin, (req, res) => {
  res.json({ loggedIn: true });
});


router.post('/login', async (req, res) => {
  const { password } = req.body;
  const match = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!match) return res.status(401).json({ error: "Fjalëkalim i gabuar!" });
  req.session.isAdmin = true;
  res.json({ success: true });
});

// Route për logout — PA requireAdmin gjithashtu.
// FIX: logout duhet të funksionojë GJITHMONË, edhe nëse session-i ka skaduar
// tashmë ose s'është valid — përndryshe useri merr gabim kur shtyp "Dil".
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});


router.use((req, res, next) => {
  console.log("🔥 ADMIN ROUTE:", req.method, req.originalUrl);
  next();
});

function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function generateImageName(uploadDir) {

  let counter = 1;
  let filename;

  do {

    filename = `bambo-${counter}.webp`;

    counter++;

  } while (
    fs.existsSync(
      path.join(uploadDir, filename)
    )
  );

  return filename;
}

// Merr vlerën sipas gjuhës nga array JSON
function getLangValue(arr, lang) {
  if (!Array.isArray(arr)) return "";

  const item = arr.find((obj) => obj[lang] !== undefined);

  return item ? item[lang] : "";
}

// CREATE PRODUCT
// FIX: shtuar "requireAdmin" — më parë KUSHDO mund të thërriste këtë endpoint
// direkt (p.sh. me Postman/fetch), pa u loguar fare, sepse asnjë kontroll
// autentikimi s'ekzistonte në backend (vetëm në frontend, që s'mbron asgjë).
router.post("/products", requireAdmin, upload.single("imageFile"), async (req, res) => {
  try {
    const {
      name,
      category,
      price_normal,
      price_family,
      description,
      garnishes,
    } = req.body;

    if (!name || !category || !price_normal) {
      return res.status(400).json({
        error: "Emri, kategoria dhe çmimi janë të detyrueshëm.",
      });
    }

    if (!isValidJSON(name) || !isValidJSON(category)) {
      return res.status(400).json({
        error: "JSON i pavlefshëm.",
      });
    }

    const nameObj = JSON.parse(name);
    const categoryObj = JSON.parse(category);

    const descriptionObj = description ? JSON.parse(description) : [];

    const garnishObj = garnishes ? JSON.parse(garnishes) : [];

    let imagePath = "assets/banneri.webp";

    if (req.file) {

  const uploadDir =
    path.join(__dirname, '../../frontend/assets/uploads');


  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }


  const filename = generateImageName(uploadDir);


  await sharp(req.file.buffer)
    .resize(800, 800, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(
      path.join(uploadDir, filename)
    );


  imagePath = `assets/uploads/${filename}`;
}

    const query = `

      INSERT INTO menu_items
      (
        category_sq,
        category_it,
        category_en,

        name_sq,
        name_it,
        name_en,

        description_sq,
        description_it,
        description_en,

        price,
        price_family,

        image,

        garnishes_sq,
        garnishes_it,
        garnishes_en
      )

      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)

    `;

    db.run(
      query,
      [
        getLangValue(categoryObj, "sq"),
        getLangValue(categoryObj, "it"),
        getLangValue(categoryObj, "en"),

        getLangValue(nameObj, "sq"),
        getLangValue(nameObj, "it"),
        getLangValue(nameObj, "en"),

        getLangValue(descriptionObj, "sq"),
        getLangValue(descriptionObj, "it"),
        getLangValue(descriptionObj, "en"),

        Number(price_normal),
        price_family ? Number(price_family) : null,

        imagePath,

        JSON.stringify(garnishObj),
        JSON.stringify(garnishObj),
        JSON.stringify(garnishObj),
      ],

      function (err) {
        if (err) {
          console.error("❌ INSERT ERROR:", err.message);

          return res.status(500).json({
            error: err.message,
          });
        }

        res.json({
          success: true,
          id: this.lastID,
          message: "Produkti u shtua me sukses!",
        });
      },
    );
  } catch (err) {
    console.error("❌ POST ERROR:", err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// UPDATE PRODUCT
// FIX: shtuar "requireAdmin" — njësoj si te POST, PUT ishte i hapur për këdo.
router.put("/products/:id", requireAdmin, upload.single("imageFile"), async (req, res) => {
  try {
    const productId = req.params.id;

    const {
      name,
      category,
      price_normal,
      price_family,
      description,
      garnishes,
    } = req.body;

    const nameObj = JSON.parse(name);
    const categoryObj = JSON.parse(category);

    const descriptionObj = description ? JSON.parse(description) : [];

    const garnishObj = garnishes ? JSON.parse(garnishes) : [];

    db.get(
      `SELECT image FROM menu_items WHERE id=?`,
      [productId],

      async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (!row)
          return res.status(404).json({
            error: "Produkti nuk u gjet",
          });

        let imagePath = row.image;

        if (req.file) {
          const filename = `bambo-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

          const uploadDir = path.join(
            __dirname,
            "../../frontend/assets/uploads",
          );

          if (!fs.existsSync(uploadDir))
            fs.mkdirSync(uploadDir, { recursive: true });

          await sharp(req.file.buffer)
            .resize(800, 800, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toFile(path.join(uploadDir, filename));

          if (row.image && !row.image.includes("banneri.webp")) {
            const oldPath = path.join(__dirname, "../../frontend", row.image);

            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          }

          imagePath = `assets/uploads/${filename}`;
        }

        const query = `

UPDATE menu_items SET

category_sq=?,
category_it=?,
category_en=?,

name_sq=?,
name_it=?,
name_en=?,

description_sq=?,
description_it=?,
description_en=?,

price=?,
price_family=?,

image=?,

garnishes_sq=?,
garnishes_it=?,
garnishes_en=?

WHERE id=?

`;

        db.run(
          query,

          [
            getLangValue(categoryObj, "sq"),
            getLangValue(categoryObj, "it"),
            getLangValue(categoryObj, "en"),

            getLangValue(nameObj, "sq"),
            getLangValue(nameObj, "it"),
            getLangValue(nameObj, "en"),

            getLangValue(descriptionObj, "sq"),
            getLangValue(descriptionObj, "it"),
            getLangValue(descriptionObj, "en"),

            Number(price_normal),
            price_family ? Number(price_family) : null,

            imagePath,

            JSON.stringify(garnishObj),
            JSON.stringify(garnishObj),
            JSON.stringify(garnishObj),

            productId,
          ],

          function (err) {
            if (err)
              return res.status(500).json({
                error: err.message,
              });

            res.json({
              success: true,
              message: "Produkti u përditësua!",
            });
          },
        );
      },
    );
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message,
    });
  }
});

// DELETE PRODUCT
// FIX: shtuar "requireAdmin" — njësoj si te POST/PUT, DELETE ishte më i
// rrezikshmi nga të tre, sepse fshin edhe të dhëna edhe fotot fizike nga disku.
router.delete("/products/:id", requireAdmin, (req, res) => {
  const id = req.params.id;

  db.get(
    `SELECT image FROM menu_items WHERE id=?`,
    [id],

    (err, row) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          error: "Produkti nuk u gjet",
        });
      }

      //
      // FSHIJ FOTO FIZIKE
      //

      if (row.image && row.image.startsWith("assets/uploads/")) {
        const imagePath = path.join(__dirname, "../../frontend", row.image);

        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);

            console.log("🗑️ Fotoja u fshi:", imagePath);
          } catch (deleteErr) {
            console.error("Gabim gjatë fshirjes së fotos:", deleteErr.message);
          }
        }
      }

      //
      // FSHIJ PRODUKTIN NGA DB
      //

      db.run(
        `DELETE FROM menu_items WHERE id=?`,
        [id],

        function (err) {
          if (err) {
            return res.status(500).json({
              error: err.message,
            });
          }

          res.json({
            success: true,

            message: "Produkti dhe fotografia u fshinë me sukses!",
          });
        },
      );
    },
  );
});

module.exports = router;