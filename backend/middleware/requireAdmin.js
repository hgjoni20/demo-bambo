// backend/middleware/requireAdmin.js
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ error: "Nuk je i autorizuar. Kyçu si admin." });
  }
  next();
}

module.exports = requireAdmin;