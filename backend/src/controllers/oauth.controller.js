const OAuthCode = require("../models/OAuthCode");
const User = require("../models/User");
const { isRedirectUriAllowed } = require("../config/oauthClients");
const { generateAuthorizationCode, verifyPKCE } = require("../utils/pkce");
const { createRefreshSession } = require("../services/session.service");
const { findEtablissementByIdForUser } = require("../services/etablissement.service");

const CODE_TTL_MS = 60 * 1000; // 60s, comme un vrai authorization code

// ---------------------------------------------------------------------------
// POST /api/oauth/code  (requireAuth: l'utilisateur vient de se connecter
// dans le webview web/Electron avec email+OTP ou Google/Apple)
//
// Génère un code d'autorisation court, lié à cet utilisateur + à
// l'établissement qu'il a choisi de connecter + au code_challenge fourni par
// le client (PKCE), exactement comme Google le fait pour ses apps tierces.
//
// IMPORTANT: `etablissementId` est obligatoire. Impossible de générer un
// code — donc impossible pour Electron de terminer l'authentification —
// sans qu'un établissement précis ait été sélectionné et validé comme
// appartenant à cet utilisateur.
// ---------------------------------------------------------------------------
async function generateCode(req, res, next) {
  try {
    const { clientId, redirectUri, codeChallenge, codeChallengeMethod, etablissementId } =
      req.validated;

    if (!isRedirectUriAllowed(clientId, redirectUri)) {
      return res.status(400).json({ error: "client_id ou redirect_uri non autorisé." });
    }

    const etab = await findEtablissementByIdForUser(req.user._id, etablissementId);
    if (!etab) {
      return res.status(403).json({
        error: "Établissement introuvable ou vous n'y avez pas accès.",
        code: "ETABLISSEMENT_FORBIDDEN",
      });
    }

    const secret = generateAuthorizationCode();
    const doc = await OAuthCode.create({
      user: req.user._id,
      etablissement: etab._id,
      codeHash: "placeholder",
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    doc.codeHash = await OAuthCode.hashCode(secret);
    await doc.save();

    const code = `${doc._id.toString()}.${secret}`;

    return res.status(200).json({ code });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/oauth/token  (endpoint PUBLIC, appelé par l'app Electron
// elle-même après avoir reçu le `code` sur son deep link)
//
// Échange code + code_verifier contre un vrai couple access/refresh token,
// ET l'établissement précis qui a été choisi au moment de la génération du
// code (pas "un établissement au hasard" de l'utilisateur — celui-là,
// spécifiquement). Renvoyés en JSON (pas de cookie: Electron n'est pas dans
// le contexte du navigateur qui a fait le login) -> l'app doit les stocker
// elle-même (ex: electron-store / keytar) puis utiliser refreshToken via
// POST /api/auth/refresh { refreshToken } pour renouveler sa session.
// ---------------------------------------------------------------------------
async function exchangeToken(req, res, next) {
  try {
    const { code, clientId, redirectUri, codeVerifier } = req.validated;

    const idx = code.indexOf(".");
    if (idx === -1) {
      return res.status(400).json({ error: "invalid_grant" });
    }
    const docId = code.slice(0, idx);
    const secret = code.slice(idx + 1);

    const doc = await OAuthCode.findById(docId).select("+codeHash");

    if (!doc || doc.usedAt || doc.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "invalid_grant", detail: "Code expiré ou déjà utilisé." });
    }

    const validSecret = await doc.compareCode(secret);
    if (!validSecret) {
      return res.status(400).json({ error: "invalid_grant" });
    }

    // Le client_id et redirect_uri fournis ici doivent matcher EXACTEMENT
    // ceux utilisés lors de la génération du code (anti code-injection).
    if (doc.clientId !== clientId || doc.redirectUri !== redirectUri) {
      return res.status(400).json({ error: "invalid_grant", detail: "client_id/redirect_uri incohérents." });
    }

    const pkceValid = verifyPKCE(codeVerifier, doc.codeChallenge, doc.codeChallengeMethod);
    if (!pkceValid) {
      return res.status(400).json({ error: "invalid_grant", detail: "code_verifier invalide." });
    }

    doc.usedAt = new Date();
    await doc.save();

    const [user, etab] = await Promise.all([
      User.findById(doc.user),
      findEtablissementByIdForUser(doc.user, doc.etablissement),
    ]);

    if (!user) {
      return res.status(400).json({ error: "invalid_grant", detail: "Utilisateur introuvable." });
    }
    if (!etab) {
      // L'utilisateur a pu perdre l'accès à l'établissement entre la
      // génération du code et l'échange (retiré du staff, etc.).
      return res.status(400).json({
        error: "invalid_grant",
        detail: "Établissement devenu inaccessible.",
      });
    }

    const { accessToken, refreshToken } = await createRefreshSession(user, req);

    return res.status(200).json({
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      user: user.toPublicJSON(),
      etablissement: etab.toPublicJSON(user._id),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { generateCode, exchangeToken };
