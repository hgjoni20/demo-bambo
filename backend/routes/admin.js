const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const sharp = require("sharp");
const db = require("./db");
const { rateLimit } = require('express-rate-limit');


//limit per madhesine e skedarit deri ne 10Mb 
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024 
  }
});

//limituesi i tentativave te password
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Shume Tentativa te gabuara ju lutem prisni 15 minuta" }
});

const requireAdmin = require('../middleware/requireAdmin');
const bcrypt = require('bcrypt');


router.get('/check', requireAdmin, (req, res) => {
  res.json({ loggedIn: true });
});

//reset password function here 
router.put('/password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;


  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Plotësoni fjalëkalimin aktual dhe atë të ri." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere." });
  }

  try {

    db.get(`SELECT * FROM admin LIMIT 1`, async (err, admin) => {
      if (err) {
        return res.status(500).json({ error: "Gabim në databazë." });
      }

      if (!admin) {
        return res.status(404).json({ error: "Llogaria e adminit nuk u gjet." });
      }

     
      const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: "Fjalëkalimi aktual është i pasaktë." });
      }

    
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      db.run(
        `UPDATE admin SET password_hash = ? WHERE id = ?`,
        [newPasswordHash, admin.id],
        function (updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: "Dështoi përditësimi i fjalëkalimit." });
          }

          return res.json({ success: true, message: "Fjalëkalimi u ndryshua me sukses!" });
        }
      );
    });
  } catch (error) {
    return res.status(500).json({ error: "Ndodhi një gabim i brendshëm në server." });
  }
});

// router per krahasimin e hashit me password nga admin pannel
router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Fut fjalëkalimin." });
  }

 
  db.get(`SELECT * FROM admin LIMIT 1`, async (err, admin) => {
    if (err || !admin) {
      return res.status(401).json({ error: "Gabim në sistem." });
    }

    const now = Date.now();
    

    if (admin.lockout_until && admin.lockout_until > now) {
      const minutesLeft = Math.ceil((admin.lockout_until - now) / 60000);
      return res.status(429).json({ 
        error: `Shumë tentativa të gabuara. Paneli është i bllokuar për edhe ${minutesLeft} minuta.` 
      });
    }

  
    const match = await bcrypt.compare(password, admin.password_hash);
    
    if (!match) {
    
      const newAttempts = (admin.failed_attempts || 0) + 1;
      let lockoutTime = null;

  
      if (newAttempts >= 20) {
        lockoutTime = now + (15 * 60 * 1000); 
      }

      db.run(
        `UPDATE admin SET failed_attempts = ?, lockout_until = ? WHERE id = ?`,
        [newAttempts, lockoutTime, admin.id]
      );

      return res.status(401).json({ error: "Fjalëkalim i gabuar." });
    }

    db.run(
      `UPDATE admin SET failed_attempts = 0, lockout_until = NULL WHERE id = ?`,
      [admin.id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: "Gabim në databazë." });
        }
        
        req.session.isAdmin = true;
        res.json({ success: true, message: "Je loguar me sukses!" });
      }
    );
  });
});

// router i cili ben kerkesen e pastrimit te cookie isAdminLoggedIn
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

//router i menaxhimit te fotove dhe uploads 
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


function getLangValue(arr, lang) {
  if (!Array.isArray(arr)) return "";

  const item = arr.find((obj) => obj[lang] !== undefined);

  return item ? item[lang] : "";
}


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

    // Ndajmë garniturat sipas gjuhës në formatin e duhur
    const garnishesSq = garnishObj.map(g => ({ name: g.sq || "", price: Number(g.price) || 0 }));
    const garnishesIt = garnishObj.map(g => ({ name: g.it || g.sq || "", price: Number(g.price) || 0 }));
    const garnishesEn = garnishObj.map(g => ({ name: g.en || g.sq || "", price: Number(g.price) || 0 }));

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

            JSON.stringify(garnishesSq),
            JSON.stringify(garnishesIt),
            JSON.stringify(garnishesEn),

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