require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet'); 

const menuRouter = require('./routes/menu');
const adminRouter = require('./routes/admin');
const admMenuRouter = require('./routes/adm-menu');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

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