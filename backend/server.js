require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet'); 
const cors = require('cors');
const errorHandler = require("./middleware/error");

const menuRouter = require('./routes/menu');
const adminRouter = require('./routes/admin');
const admMenuRouter = require('./routes/adm-menu');

const app = express();
const PORT = process.env.PORT || 3000;

// E detyrueshme për platformat si Render që përdorin proxy për HTTPS
app.set('trust proxy', 1);

// Konfigurimi i CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://demo-bambo.onrender.com' 
    : 'http://localhost:3000',
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  }
}));

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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});