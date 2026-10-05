const { z } = require("zod");

const ETABLISSEMENT_TYPES = [
  "primaire",
  "secondaire",
  "maternel",
  "creush",
  "complexe_scolaire",
];

const PAYMENT_METHODS = ["mobile_money", "carte", "virement", "cash", "autre"];

// Le formulaire est envoyé en multipart/form-data (pour porter le fichier du
// logo), donc TOUTES les valeurs texte arrivent en string ici, même les
// nombres et booléens — d'où les z.coerce.* ci-dessous.
const createEtablissementSchema = z
  .object({
    name: z.string().trim().min(2, "2 caractères minimum.").max(120),
    type: z.enum(ETABLISSEMENT_TYPES),
    pays: z.string().trim().min(1, "Champ requis.").max(80),
    province: z.string().trim().min(1, "Champ requis.").max(80),
    ville: z.string().trim().min(1, "Champ requis.").max(80),
    adresseComplete: z.string().trim().max(300).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().email("Email invalide.").optional().or(z.literal("")),
    website: z.string().trim().max(200).optional().or(z.literal("")),
    description: z.string().trim().max(1000).optional(),
    ownerName: z.string().trim().max(120).optional(),
    ownerPhone: z.string().trim().max(30).optional(),
    deviseName: z.string().trim().max(40).optional(),
    deviseSymbole: z.string().trim().max(10).optional(),

    // Préfixe collé devant chaque numéro de matricule élève généré par
    // l'app (ex: "ETS" -> ETS-000123). Optionnel, purement cosmétique.
    matriculePrefix: z.string().trim().max(12).optional(),
    // Nombre de chiffres que la partie numérique du matricule doit toujours
    // avoir (ex: 6 -> 000123 au lieu de 123). Bornes larges mais sensées.
    matriculeLength: z.coerce.number().int().min(1).max(12).optional(),

    // Choix fait à la création: continuer l'essai gratuit de 7 jours, ou
    // déclarer une intention de paiement immédiat. IMPORTANT: tant qu'aucune
    // passerelle de paiement réelle n'est branchée (Stripe, Mobile Money
    // API...), "paid" ne fait qu'ENREGISTRER cette intention — voir le
    // commentaire dans le controller.
    subscriptionChoice: z.enum(["trial", "paid"]).default("trial"),
    paymentAmount: z.coerce.number().positive().optional(),
    paymentDevise: z.string().trim().max(10).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    // Durée couverte par ce paiement déclaré, en jours (30 = mensuel,
    // 365 = annuel, etc.).
    paymentPeriodDays: z.coerce.number().int().positive().max(3650).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.subscriptionChoice === "paid") {
      if (!data.paymentAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentAmount"],
          message: "Montant requis pour un abonnement payant.",
        });
      }
      if (!data.paymentMethod) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentMethod"],
          message: "Méthode de paiement requise.",
        });
      }
      if (!data.paymentPeriodDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentPeriodDays"],
          message: "Durée de l'abonnement requise.",
        });
      }
    }
  });

module.exports = { createEtablissementSchema, PAYMENT_METHODS };
