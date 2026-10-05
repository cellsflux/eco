const { z } = require("zod");

const emailSchema = z.string().trim().toLowerCase().email("Email invalide.");
const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Mot de passe trop long.");

const nameSchema = z.string().trim().min(1, "Champ requis.").max(50);
const usernameSchema = z
  .string()
  .trim()
  .min(3, "3 caractères minimum.")
  .max(24, "24 caractères maximum.")
  .regex(/^[a-zA-Z0-9_.]+$/, "Lettres, chiffres, '_' et '.' uniquement.");
const genderSchema = z.enum(["homme", "femme", "autre", "prefere_ne_pas_dire"]);
const dobSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Date invalide.")
  .refine((v) => {
    const age = (Date.now() - new Date(v).getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 13;
  }, "Vous devez avoir au moins 13 ans.");

// Signup "classique": tout le stepper est soumis en une seule fois à la fin.
// Le mot de passe est obligatoire pour un signup classique, mais optionnel
// si oauthDraftToken est fourni (le compte est déjà "vérifié" par
// Google/Apple ; l'utilisateur peut choisir d'ajouter un mot de passe plus
// tard depuis son profil).
const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema.optional(),
    fname: nameSchema,
    lname: nameSchema,
    username: usernameSchema,
    dataOfBrith: dobSchema,
    gander: genderSchema,
    profile: z.string().trim().max(500).optional(),
    oauthDraftToken: z.string().min(10).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.oauthDraftToken && !data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Le mot de passe est requis.",
      });
    }
  });

const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6, "Le code doit contenir 6 chiffres."),
  purpose: z.enum(["signup", "login"]).default("signup"),
});

const resendOtpSchema = z.object({
  email: emailSchema,
  purpose: z.enum(["signup", "login"]).default("signup"),
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  token: z.string().min(10),
  newPassword: passwordSchema,
});

const googleAuthSchema = z.object({
  idToken: z.string().min(10),
});

const appleAuthSchema = z.object({
  identityToken: z.string().min(10),
  // Apple ne fournit le nom qu'à la toute première connexion, côté client.
  fullName: z.string().trim().max(80).optional(),
});

const checkUsernameSchema = z.object({
  username: usernameSchema,
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

module.exports = {
  signupSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  appleAuthSchema,
  refreshSchema,
  checkUsernameSchema,
};
