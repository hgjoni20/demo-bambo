const errorHandler = (err, req, res, next) => {
  console.error('Gabim i papritur në server:', err.message || err);
  
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({ 
    error: 'Ndodhi një gabim i papritur në server.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

module.exports = errorHandler;