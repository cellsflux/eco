const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { Schema } = mongoose;

// Un document par session/device. On ne stocke jamais le refresh token en
// clair, seulement son hash. La rotation crée un nouveau document et marque
// l'ancien "replacedBy" au lieu de le supprimer directement, avec une courte
// fenêtre de grâce pour absorber les appels concurrents (double-refresh au
// démarrage de l'app, requêtes réseau en parallèle, etc.).
const refreshTokenSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, select: false },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String, select: false },
    // Fenêtre de grâce: après rotation, l'ancien token reste valide encore
    // quelques secondes pour ne pas casser un refresh concurrent légitime.
    graceUntil: { type: Date },
  },
  { timestamps: true },
);

refreshTokenSchema.statics.hashToken = function hashToken(plainToken) {
  return bcrypt.hash(plainToken, 10);
};

// Méthode dédiée et volontairement séparée de User.compareOTP: ne JAMAIS
// réutiliser compareOTP() ici, c'est exactement le bug qui a fait tout
// révoquer par erreur en prod.
refreshTokenSchema.methods.compareRefreshToken =
  async function compareRefreshToken(plainToken) {
    if (!this.tokenHash) return false;
    return bcrypt.compare(plainToken, this.tokenHash);
  };

refreshTokenSchema.methods.isActive = function isActive() {
  const now = Date.now();
  if (this.revokedAt && (!this.graceUntil || this.graceUntil.getTime() < now)) {
    return false;
  }
  return this.expiresAt.getTime() > now;
};

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
