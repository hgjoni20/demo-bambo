require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const path = require('path');
const session = require('express-session'); // 1. import lart

const menuRouter = require('./routes/menu');
const adminRouter = require('./routes/admin');
const admMenuRouter = require('./routes/adm-menu');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. SESSION KËTU — PARA çdo route, edhe statik edhe API
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// 3. TANI routes admin e KANË req.session gati kur arrijnë këtu
app.use('/api/admin/all-products', admMenuRouter);
app.use('/api/admin', adminRouter);
app.use('/api/menu', menuRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('❌ Gabim i papritur në server:', err);
  res.status(500).json({ error: 'Ndodhi një gabim i papritur në server.' });
});

app.listen(PORT, () => {
  console.log(`Serveri po punon në ${PORT}`);
});