const verifyAppleToken = require("verify-apple-id-token").default;

/**
 * Vérifie un identityToken Apple (Sign in with Apple) envoyé par le client.
 * Apple ne renvoie le nom qu'une seule fois, à la toute première connexion:
 * le client doit donc transmettre `fullName` séparément lors de ce premier
 * appel (voir controller) et on ne pourra plus jamais le récupérer ensuite.
 */
async function verifyAppleIdentityToken(identityToken) {
  const payload = await verifyAppleToken({
    idToken: identityToken,
    clientId: process.env.APPLE_CLIENT_ID,
  });

  if (!payload || !payload.email) {
    throw new Error("Token Apple invalide");
  }

  return {
    appleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

module.exports = { verifyAppleIdentityToken };
