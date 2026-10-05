const crypto = require("crypto");

function base64url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateAuthorizationCode() {
  return crypto.randomBytes(32).toString("hex");
}

// S256: challenge = base64url(sha256(verifier)). "plain": challenge = verifier
// (accepté mais déconseillé, comme chez Google).
function verifyPKCE(codeVerifier, codeChallenge, method) {
  if (!codeVerifier || !codeChallenge) return false;

  if (method === "plain") {
    return codeVerifier === codeChallenge;
  }

  const computed = base64url(crypto.createHash("sha256").update(codeVerifier).digest());
  return computed === codeChallenge;
}

module.exports = { generateAuthorizationCode, verifyPKCE, base64url };
