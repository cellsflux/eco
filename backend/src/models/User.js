const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fname: {
      type: String,
      trim: true,
      default: "",
    },
    lname: {
      type: String,
      trim: true,
      default: "",
    },
    // unique+sparse: plusieurs users peuvent avoir username vide ("") tant
    // que le profil n'est pas complété (ex: draft OAuth), mais deux users ne
    // peuvent pas avoir le même username une fois choisi.
    username: {
      type: String,
      trim: true,
      default: "",
    },

    profile: {
      type: String,
      trim: true,
      default: "",
    },
    dataOfBrith: {
      type: Date,
    },
    gander: {
      type: String,
      trim: true,
      default: "",
    },
    // Un compte est "complet" une fois que le stepper d'inscription a été
    // terminé (fname/lname/username/dataOfBrith renseignés). Tant que c'est
    // false, l'utilisateur doit être renvoyé sur le stepper au lieu de
    // pouvoir utiliser l'app normalement.
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    // Absent si l'utilisateur s'est inscrit uniquement via Google/Apple
    passwordHash: {
      type: String,
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ---- OTP (vérification email à l'inscription + reconnexion sensible) ----
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpLastSentAt: { type: Date, select: false },
    otpPurpose: {
      type: String,
      enum: ["signup", "login"],
      select: false,
    },

    // ---- Reset password ----
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpiresAt: { type: Date, select: false },

    // ---- OAuth ----
    googleId: { type: String, index: true, sparse: true },
    appleId: { type: String, index: true, sparse: true },
    avatarUrl: { type: String, default: "" },

    provider: {
      type: String,
      enum: ["password", "google", "apple"],
      default: "password",
    },

    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Unicité du username uniquement quand il est renseigné (évite que tous les
// comptes avec username: "" se percutent sur l'unicité).
userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: "string", $ne: "" } } },
);

// ---------- Password ----------
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.comparePassword = async function comparePassword(
  plainPassword,
) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ---------- OTP ----------
// IMPORTANT: méthode dédiée et isolée de tout ce qui touche aux refresh tokens.
// (cf. bug historique où compareOTP() était appelée à la place de
// compareRefreshToken() sur RefreshToken.js -> ne JAMAIS mélanger les deux).
userSchema.methods.setOTP = async function setOTP(plainOtp, purpose) {
  const salt = await bcrypt.genSalt(10);
  this.otpHash = await bcrypt.hash(plainOtp, salt);
  this.otpExpiresAt = new Date(
    Date.now() + Number(process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000,
  );
  this.otpAttempts = 0;
  this.otpLastSentAt = new Date();
  this.otpPurpose = purpose;
};

userSchema.methods.compareOTP = async function compareOTP(plainOtp) {
  if (!this.otpHash || !this.otpExpiresAt) return false;
  if (this.otpExpiresAt.getTime() < Date.now()) return false;
  return bcrypt.compare(plainOtp, this.otpHash);
};

userSchema.methods.clearOTP = function clearOTP() {
  this.otpHash = undefined;
  this.otpExpiresAt = undefined;
  this.otpAttempts = 0;
  this.otpPurpose = undefined;
};

// ---------- Reset password ----------
userSchema.methods.setResetToken = async function setResetToken(plainToken) {
  const salt = await bcrypt.genSalt(10);
  this.resetPasswordTokenHash = await bcrypt.hash(plainToken, salt);
  this.resetPasswordExpiresAt = new Date(
    Date.now() +
      Number(process.env.RESET_TOKEN_EXPIRES_MINUTES || 30) * 60 * 1000,
  );
};

userSchema.methods.compareResetToken = async function compareResetToken(
  plainToken,
) {
  if (!this.resetPasswordTokenHash || !this.resetPasswordExpiresAt)
    return false;
  if (this.resetPasswordExpiresAt.getTime() < Date.now()) return false;
  return bcrypt.compare(plainToken, this.resetPasswordTokenHash);
};

userSchema.methods.clearResetToken = function clearResetToken() {
  this.resetPasswordTokenHash = undefined;
  this.resetPasswordExpiresAt = undefined;
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    username: this.username,
    sname: this.fname,
    lname: this.lname,
    gender: this.gander,
    photo: this.avatarUrl,
    email: this.email,
    dataOfBrith: this.dataOfBrith,
    isEmailVerified: this.isEmailVerified,
    isProfileComplete: this.isProfileComplete,
    provider: this.provider,
  };
};

module.exports = mongoose.model("User", userSchema);
