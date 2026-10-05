const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Vérifie un id_token Google envoyé par le client (mobile/web) et retourne
 * le profil vérifié. Ne JAMAIS faire confiance à un email/nom envoyé "en clair"
 * par le client: seul l'id_token signé par Google fait foi.
 */
async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw new Error("Token Google invalide");
  }

  if (!payload.email_verified) {
    throw new Error("Email Google non vérifié");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    avatarUrl: payload.picture || "",
  };
}

module.exports = { verifyGoogleIdToken };
