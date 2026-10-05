const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

// Le refresh token n'est PAS un JWT: c'est une chaîne aléatoire opaque dont
// seul le hash est stocké en base (voir RefreshToken.js). Ça évite toute
// confusion de type avec les access tokens et empêche de "décoder" un refresh
// token côté client.
function generateOpaqueRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function refreshTokenExpiryDate() {
  const raw = process.env.JWT_REFRESH_EXPIRES || "30d";
  const match = /^(\d+)([smhd])$/.exec(raw);
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const amount = match ? Number(match[1]) : 30;
  const unit = match ? match[2] : "d";
  return new Date(Date.now() + amount * (ms[unit] || ms.d));
}

function generateNumericOTP(length = 6) {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i += 1) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

function generateUrlSafeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function signOAuthDraftToken(draft) {
  // Très courte durée de vie: ce token ne sert qu'à porter, de façon signée
  // et infalsifiable, les infos déjà vérifiées par Google/Apple (email,
  // provider, providerId) jusqu'à la fin du stepper d'inscription. Le client
  // ne peut pas fabriquer ni modifier ces infos lui-même.
  return jwt.sign({ type: "oauth_draft", ...draft }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
}

function verifyOAuthDraftToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  if (decoded.type !== "oauth_draft") {
    throw new Error("Token de brouillon OAuth invalide.");
  }
  return decoded;
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateOpaqueRefreshToken,
  refreshTokenExpiryDate,
  generateNumericOTP,
  generateUrlSafeToken,
  signOAuthDraftToken,
  verifyOAuthDraftToken,
};
