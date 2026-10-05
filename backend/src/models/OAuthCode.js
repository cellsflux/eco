const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { Schema } = mongoose;

// Un document par code d'autorisation émis (flow "Authorization Code + PKCE",
// le même mécanisme que Google/GitHub utilisent pour leurs apps tierces).
// Le code lui-même n'est jamais stocké en clair, seulement son hash, et il
// est à usage unique + très courte durée de vie (60s).
const oauthCodeSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Établissement choisi par l'utilisateur pour cette connexion Electron.
    // Obligatoire: impossible de générer un code sans savoir quel
    // établissement l'app doit connecter (cf. génération du code).
    etablissement: { type: Schema.Types.ObjectId, ref: "Etablisssment", required: true },
    codeHash: { type: String, required: true, select: false },
    clientId: { type: String, required: true },
    redirectUri: { type: String, required: true },
    codeChallenge: { type: String, required: true },
    codeChallengeMethod: { type: String, enum: ["S256", "plain"], default: "S256" },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

oauthCodeSchema.statics.hashCode = function hashCode(plainCode) {
  return bcrypt.hash(plainCode, 10);
};

oauthCodeSchema.methods.compareCode = async function compareCode(plainCode) {
  if (!this.codeHash) return false;
  return bcrypt.compare(plainCode, this.codeHash);
};

module.exports = mongoose.model("OAuthCode", oauthCodeSchema);
