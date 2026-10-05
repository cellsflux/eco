const { z } = require("zod");

const generateCodeSchema = z.object({
  clientId: z.string().min(1),
  redirectUri: z.string().url().or(z.string().regex(/^[a-zA-Z0-9.+-]+:\/\/.+$/)),
  codeChallenge: z.string().min(20),
  codeChallengeMethod: z.enum(["S256", "plain"]).default("S256"),
  state: z.string().optional(),
  // Obligatoire: impossible d'authentifier l'app Electron sans savoir quel
  // établissement l'utilisateur veut y connecter.
  etablissementId: z.string().min(1, "Sélectionnez un établissement."),
});

const exchangeTokenSchema = z.object({
  grantType: z.literal("authorization_code").default("authorization_code"),
  code: z.string().min(10),
  clientId: z.string().min(1),
  redirectUri: z.string().min(1),
  codeVerifier: z.string().min(43).max(128),
});

module.exports = { generateCodeSchema, exchangeTokenSchema };
