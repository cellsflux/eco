const RefreshToken = require("../models/RefreshToken");
const {
  signAccessToken,
  generateOpaqueRefreshToken,
  refreshTokenExpiryDate,
} = require("../utils/tokens");

/**
 * Crée un couple access/refresh token pour un utilisateur, sans toucher à la
 * réponse HTTP (pas de cookie posé ici). Utilisé par:
 * - auth.controller.issueSession() -> pose ensuite le refresh en cookie httpOnly
 *   (session web classique / Electron webview de login).
 * - oauth.controller.exchangeToken() -> renvoie les tokens directement dans
 *   le JSON (l'app Electron elle-même, en dehors du webview, n'a pas accès
 *   au cookie du navigateur et doit stocker ses propres tokens, ex: via
 *   electron-store/keytar).
 */
async function createRefreshSession(user, req) {
  const accessToken = signAccessToken(user);

  const secret = generateOpaqueRefreshToken();
  const doc = await RefreshToken.create({
    user: user._id,
    tokenHash: "placeholder",
    userAgent: req.headers["user-agent"] || "",
    ip: req.ip,
    expiresAt: refreshTokenExpiryDate(),
  });

  doc.tokenHash = await RefreshToken.hashToken(secret);
  await doc.save();

  const refreshToken = `${doc._id.toString()}.${secret}`;

  return { accessToken, refreshToken, expiresAt: doc.expiresAt };
}

module.exports = { createRefreshSession };
