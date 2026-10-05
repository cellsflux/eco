const { verifyAccessToken } = require("../utils/tokens");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Non authentifié." });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expirée ou invalide." });
  }
}

module.exports = { requireAuth };
