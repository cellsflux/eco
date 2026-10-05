const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { createRefreshSession } = require("../services/session.service");
const { findEtablissementsForUser } = require("../services/etablissement.service");
const { buildPublicUploadUrl } = require("../middleware/imageUpload");
const { sendOTPEmail, sendResetPasswordEmail } = require("../utils/email");
const { verifyGoogleIdToken } = require("../utils/googleAuth");
const { verifyAppleIdentityToken } = require("../utils/appleAuth");
const {
  generateNumericOTP,
  generateUrlSafeToken,
  signOAuthDraftToken,
  verifyOAuthDraftToken,
} = require("../utils/tokens");

const REFRESH_COOKIE_NAME = "cf_refresh";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
};

// ---------------------------------------------------------------------------
// Helpers de session
// ---------------------------------------------------------------------------

async function issueSession(user, req, res) {
  const { accessToken, refreshToken, expiresAt } = await createRefreshSession(user, req);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...REFRESH_COOKIE_OPTIONS,
    expires: expiresAt,
  });

  return { accessToken, refreshToken };
}

/**
 * À chaque fois qu'une session s'ouvre (OTP validé, refresh, Google/Apple
 * pour un compte existant), on renvoie systématiquement `user` ET
 * `etablissements` (tableau, un utilisateur peut en avoir plusieurs)
 * ensemble — le frontend web sait immédiatement s'il doit proposer la
 * création d'établissement (essai gratuit 7 jours) ou afficher le tableau
 * de bord, sans appel supplémentaire.
 */
async function buildSessionPayload(user) {
  const etabs = await findEtablissementsForUser(user._id);
  return {
    user: user.toPublicJSON(),
    etablissements: etabs.map((e) => e.toPublicJSON(user._id)),
  };
}

function parseCompoundToken(compound) {
  const idx = compound.indexOf(".");
  if (idx === -1) return null;
  return { id: compound.slice(0, idx), secret: compound.slice(idx + 1) };
}

function isProfileComplete(user) {
  return Boolean(user.fname && user.lname && user.username && user.dataOfBrith);
}

// ---------------------------------------------------------------------------
// Signup (stepper complet soumis en une fois) -> envoi OTP, ou session
// directe si ça termine un flow Google/Apple (déjà vérifié par le provider).
// ---------------------------------------------------------------------------

async function signup(req, res, next) {
  try {
    const {
      email,
      password,
      fname,
      lname,
      username,
      dataOfBrith,
      gander,
      profile,
      oauthDraftToken,
    } = req.validated;

    // Cas 1: ce signup termine un flow Google/Apple pour un compte qui
    // n'existait pas encore. Le draft token, signé par le backend au moment
    // du callback OAuth, prouve que l'email a déjà été vérifié par le
    // provider -> pas besoin d'OTP, session ouverte directement.
    if (oauthDraftToken) {
      let draft;
      try {
        draft = verifyOAuthDraftToken(oauthDraftToken);
      } catch {
        return res.status(400).json({ error: "Session d'inscription expirée, recommencez." });
      }

      if (draft.email !== email) {
        return res.status(400).json({ error: "Email incohérent avec la connexion Google/Apple." });
      }

      const existing = await User.findOne({
        $or: [{ email }, { [`${draft.provider}Id`]: draft.providerId }],
      });
      if (existing) {
        return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
      }

      const user = new User({
        email,
        fname,
        lname,
        username,
        dataOfBrith,
        gander,
        profile: profile || "",
        avatarUrl: draft.avatarUrl || "",
        provider: draft.provider,
        [`${draft.provider}Id`]: draft.providerId,
        isEmailVerified: true,
        isProfileComplete: true,
      });

      if (password) {
        await user.setPassword(password);
      }

      user.lastLoginAt = new Date();
      await user.save();

      const { accessToken } = await issueSession(user, req, res);
      return res.status(200).json({ accessToken, ...(await buildSessionPayload(user)) });
    }

    // Cas 2: signup classique email + mot de passe -> vérification OTP.
    let user = await User.findOne({ email });

    if (user && user.isEmailVerified) {
      return res.status(409).json({ error: "Un compte existe déjà avec cet email." });
    }

    const usernameTaken = await User.findOne({ username, email: { $ne: email } });
    if (usernameTaken) {
      return res.status(409).json({ error: "Ce nom d'utilisateur est déjà pris.", code: "USERNAME_TAKEN" });
    }

    if (!user) {
      user = new User({ email, provider: "password" });
    }

    await user.setPassword(password);
    user.fname = fname;
    user.lname = lname;
    user.username = username;
    user.dataOfBrith = dataOfBrith;
    user.gander = gander;
    user.profile = profile || "";
    user.isProfileComplete = isProfileComplete(user);

    const otp = generateNumericOTP(6);
    await user.setOTP(otp, "signup");
    await user.save();

    await sendOTPEmail(email, otp, "signup");

    return res.status(200).json({
      message: "Un code de vérification a été envoyé par email.",
      email,
      otpExpiresInMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Disponibilité du username (appelé pendant le stepper, avant submit)
// ---------------------------------------------------------------------------

async function checkUsername(req, res, next) {
  try {
    const { username } = req.validated;
    const exists = await User.exists({ username });
    return res.status(200).json({ available: !exists });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Vérification OTP (signup ou login) -> émet les tokens de session
// ---------------------------------------------------------------------------

async function verifyOtp(req, res, next) {
  try {
    const { email, otp, purpose } = req.validated;

    const user = await User.findOne({ email }).select(
      "+otpHash +otpExpiresAt +otpAttempts +otpPurpose",
    );

    if (!user || !user.otpHash) {
      return res.status(400).json({ error: "Aucun code en attente pour cet email." });
    }

    if (user.otpPurpose !== purpose) {
      return res.status(400).json({ error: "Code invalide pour cette action." });
    }

    if (user.otpAttempts >= Number(process.env.OTP_MAX_ATTEMPTS || 5)) {
      return res.status(429).json({ error: "Trop de tentatives. Demandez un nouveau code." });
    }

    const isValid = await user.compareOTP(otp);

    if (!isValid) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ error: "Code invalide ou expiré." });
    }

    user.clearOTP();
    if (purpose === "signup") {
      user.isEmailVerified = true;
    }
    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = await issueSession(user, req, res);

    return res.status(200).json({
      accessToken,
      ...(await buildSessionPayload(user)),
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Renvoi OTP (avec cooldown anti-spam)
// ---------------------------------------------------------------------------

async function resendOtp(req, res, next) {
  try {
    const { email, purpose } = req.validated;

    const user = await User.findOne({ email }).select("+otpLastSentAt");

    if (!user) {
      return res.status(200).json({ message: "Si ce compte existe, un code a été envoyé." });
    }

    const cooldown = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 45) * 1000;
    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < cooldown) {
      const waitSeconds = Math.ceil(
        (cooldown - (Date.now() - user.otpLastSentAt.getTime())) / 1000,
      );
      return res.status(429).json({ error: `Veuillez patienter ${waitSeconds}s avant de redemander un code.` });
    }

    const otp = generateNumericOTP(6);
    await user.setOTP(otp, purpose);
    await user.save();
    await sendOTPEmail(email, otp, purpose);

    return res.status(200).json({ message: "Un nouveau code a été envoyé." });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Login (email + password) -> déclenche un OTP de connexion
// ---------------------------------------------------------------------------

async function login(req, res, next) {
  try {
    const { email, password } = req.validated;

    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      return res.status(404).json({
        error: "Aucun compte trouvé avec cet email.",
        code: "ACCOUNT_NOT_FOUND",
      });
    }

    if (!user.passwordHash) {
      return res.status(409).json({
        error: `Ce compte utilise déjà ${user.provider === "google" ? "Google" : "Apple"} pour se connecter.`,
        code: "OAUTH_ONLY",
        provider: user.provider,
      });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({
        error: "Mot de passe incorrect.",
        code: "WRONG_PASSWORD",
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: "Email non vérifié.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const otp = generateNumericOTP(6);
    await user.setOTP(otp, "login");
    await user.save();
    await sendOTPEmail(email, otp, "login");

    return res.status(200).json({
      message: "Un code de vérification a été envoyé par email.",
      requiresOtp: true,
      email: user.email,
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Forgot / Reset password
// ---------------------------------------------------------------------------

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.validated;

    const user = await User.findOne({ email });

    if (!user || user.provider !== "password") {
      return res.status(200).json({
        message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
      });
    }

    const rawToken = generateUrlSafeToken();
    await user.setResetToken(rawToken);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?email=${encodeURIComponent(
      email,
    )}&token=${rawToken}`;

    await sendResetPasswordEmail(email, resetUrl);

    return res.status(200).json({
      message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.",
    });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, token, newPassword } = req.validated;

    const user = await User.findOne({ email }).select(
      "+resetPasswordTokenHash +resetPasswordExpiresAt",
    );

    if (!user) {
      return res.status(400).json({ error: "Lien invalide ou expiré." });
    }

    const validToken = await user.compareResetToken(token);
    if (!validToken) {
      return res.status(400).json({ error: "Lien invalide ou expiré." });
    }

    await user.setPassword(newPassword);
    user.clearResetToken();
    await user.save();

    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );

    return res.status(200).json({ message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Google / Apple
// ---------------------------------------------------------------------------
// RÈGLE IMPORTANTE: on ne crée JAMAIS un User directement ici. Si le compte
// existe déjà (par providerId ou par email), on ouvre une session. Sinon on
// renvoie un "draft" signé (voir tokens.signOAuthDraftToken) et c'est le
// frontend qui doit envoyer l'utilisateur sur le stepper d'inscription pour
// compléter fname/lname/username/dataOfBrith/gander avant qu'un compte soit
// réellement créé (via POST /api/auth/signup avec oauthDraftToken).
// ---------------------------------------------------------------------------

async function googleAuth(req, res, next) {
  try {
    const { idToken } = req.validated;
    const profile = await verifyGoogleIdToken(idToken);

    const user = await User.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email }],
    });

    if (!user) {
      const draftToken = signOAuthDraftToken({
        provider: "google",
        providerId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      });

      return res.status(200).json({
        requiresProfile: true,
        draftToken,
        prefill: { email: profile.email, name: profile.name, avatarUrl: profile.avatarUrl },
      });
    }

    if (!user.googleId) {
      user.googleId = profile.googleId;
      user.isEmailVerified = true;
      if (!user.avatarUrl) user.avatarUrl = profile.avatarUrl;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = await issueSession(user, req, res);
    return res.status(200).json({ accessToken, ...(await buildSessionPayload(user)) });
  } catch (err) {
    return res.status(401).json({ error: "Connexion Google échouée." });
  }
}

async function appleAuth(req, res, next) {
  try {
    const { identityToken, fullName } = req.validated;
    const profile = await verifyAppleIdentityToken(identityToken);

    const user = await User.findOne({
      $or: [{ appleId: profile.appleId }, { email: profile.email }],
    });

    if (!user) {
      const draftToken = signOAuthDraftToken({
        provider: "apple",
        providerId: profile.appleId,
        email: profile.email,
        name: fullName || "",
        avatarUrl: "",
      });

      return res.status(200).json({
        requiresProfile: true,
        draftToken,
        prefill: { email: profile.email, name: fullName || "" },
      });
    }

    if (!user.appleId) {
      user.appleId = profile.appleId;
      user.isEmailVerified = user.isEmailVerified || profile.emailVerified;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken } = await issueSession(user, req, res);
    return res.status(200).json({ accessToken, ...(await buildSessionPayload(user)) });
  } catch (err) {
    return res.status(401).json({ error: "Connexion Apple échouée." });
  }
}

// ---------------------------------------------------------------------------
// Refresh / Logout / Me
// ---------------------------------------------------------------------------

async function refresh(req, res, next) {
  try {
    const compound = req.cookies?.[REFRESH_COOKIE_NAME] || req.validated?.refreshToken;

    if (!compound) {
      return res.status(401).json({ error: "Session absente." });
    }

    const parsed = parseCompoundToken(compound);
    if (!parsed) {
      return res.status(401).json({ error: "Session invalide." });
    }

    const doc = await RefreshToken.findById(parsed.id).select("+tokenHash +replacedByTokenHash");

    if (!doc) {
      return res.status(401).json({ error: "Session invalide." });
    }

    // Utilise EXCLUSIVEMENT compareRefreshToken() ici, jamais compareOTP().
    const validSecret = await doc.compareRefreshToken(parsed.secret);

    if (!validSecret || !doc.isActive()) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
      return res.status(401).json({ error: "Session expirée, reconnectez-vous." });
    }

    const user = await User.findById(doc.user);
    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    doc.revokedAt = new Date();
    doc.graceUntil = new Date(Date.now() + 10 * 1000);
    await doc.save();

    const { accessToken } = await issueSession(user, req, res);

    return res.status(200).json({ accessToken, ...(await buildSessionPayload(user)) });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    const compound = req.cookies?.[REFRESH_COOKIE_NAME];

    if (compound) {
      const parsed = parseCompoundToken(compound);
      if (parsed) {
        await RefreshToken.findByIdAndUpdate(parsed.id, { revokedAt: new Date() });
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    return res.status(200).json({ message: "Déconnecté." });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    return res.status(200).json(await buildSessionPayload(req.user));
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/me/photo — photo de profil de l'utilisateur connecté.
// Appelé juste après la vérification OTP lors de l'inscription (une fois la
// session ouverte) si une photo a été choisie dans le stepper, ou plus tard
// depuis le profil pour la changer. Même mécanisme de stockage que le logo
// d'établissement (voir middleware/imageUpload.js).
// ---------------------------------------------------------------------------
async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu." });
    }

    req.user.avatarUrl = buildPublicUploadUrl(req, `avatars/${req.file.filename}`);
    await req.user.save();

    return res.status(200).json(await buildSessionPayload(req.user));
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  signup,
  checkUsername,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
  appleAuth,
  refresh,
  logout,
  me,
  uploadPhoto,
  REFRESH_COOKIE_NAME,
};
