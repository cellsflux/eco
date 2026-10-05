const crypto = require("crypto");
const Etablissement = require("../models/Etablissement");
const {
  findEtablissementsForUser,
  findEtablissementByIdForUser,
} = require("../services/etablissement.service");
const { buildPublicUploadUrl } = require("../middleware/imageUpload");

const TRIAL_DAYS = 7;

function slugify(input) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function generateUniqueSlug(name) {
  const base = slugify(name) || "etablissement";
  let slug = base;
  let attempt = 0;

  while (await Etablissement.exists({ slug })) {
    attempt += 1;
    slug = `${base}-${crypto.randomBytes(2).toString("hex")}`;
    if (attempt > 5) break;
  }

  return slug;
}

/**
 * Construit l'entrée `abonement` initiale selon le choix fait à la création.
 *
 * ⚠️ "paid" n'est PAS relié à une vraie passerelle de paiement pour
 * l'instant (pas de Stripe/Mobile Money API branché) — ça enregistre
 * uniquement l'intention déclarée par l'utilisateur (montant, devise,
 * méthode). C'est délibérément visible ici plutôt que caché: avant
 * d'ouvrir ça à de vrais clients, il faut brancher une vérification de
 * paiement réelle avant de considérer l'abonnement comme "active".
 */
function buildInitialAbonement(input, now) {
  if (input.subscriptionChoice === "paid") {
    const periodMs = input.paymentPeriodDays * 24 * 60 * 60 * 1000;
    return {
      amount: input.paymentAmount,
      devise: input.paymentDevise || "USD",
      from_method: input.paymentMethod,
      description: `Abonnement déclaré (${input.paymentPeriodDays} jours) — paiement non vérifié par une passerelle`,
      date_debut: now,
      date_fin: new Date(now.getTime() + periodMs),
    };
  }

  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return {
    amount: 0,
    devise: input.deviseName || "USD",
    from_method: "essai_gratuit",
    description: `Essai gratuit de ${TRIAL_DAYS} jours`,
    date_debut: now,
    date_fin: trialEnd,
  };
}

// ---------------------------------------------------------------------------
// POST /api/etablissements — création complète: toutes les infos du modèle,
// logo optionnel envoyé dans la même requête (multipart), et choix entre
// essai gratuit ou abonnement payant déclaré.
// Un utilisateur peut créer plusieurs établissements: pas de vérification
// "en possède déjà un" ici.
// ---------------------------------------------------------------------------
async function create(req, res, next) {
  try {
    const {
      name,
      type,
      pays,
      province,
      ville,
      adresseComplete,
      phone,
      email,
      website,
      description,
      ownerName,
      ownerPhone,
      deviseName,
      deviseSymbole,
      matriculePrefix,
      matriculeLength,
    } = req.validated;

    const slug = await generateUniqueSlug(name);
    const now = new Date();

    const etablissement = new Etablissement({
      owen: req.user._id,
      users: [{ user: req.user._id, role: ["directeur"] }],
      name,
      slug,
      // Envoyé dans la même requête multipart que le reste du formulaire —
      // voir la route (uploadLogo.single("logo") avant validate()).
      logo: req.file
        ? buildPublicUploadUrl(req, `logos/${req.file.filename}`)
        : "",
      type,
      pays,
      province,
      ville,
      adresse_complete: adresseComplete || "",
      phone: phone || "",
      email: email || "",
      website: website || "",
      description: description || "",
      owener_name: ownerName || `${req.user.fname} ${req.user.lname}`.trim(),
      owener_phone: ownerPhone || "",
      maticule_prefix: matriculePrefix || "",
      matricule_lengh: matriculeLength || undefined,
      money: deviseName
        ? [{ name: deviseName, symbole: deviseSymbole || "", Taux_dollar: "1" }]
        : [],
      abonement: [buildInitialAbonement(req.validated, now)],
    });

    etablissement.refreshSubscriptionFields();
    await etablissement.save();

    return res.status(201).json({
      etablissement: etablissement.toPublicJSON(req.user._id),
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/etablissements/me — TOUS les établissements de l'utilisateur
// (propriétaire ou staff), pour la sélection côté web/Electron.
// ---------------------------------------------------------------------------
async function getMine(req, res, next) {
  try {
    const etabs = await findEtablissementsForUser(req.user._id);
    return res.status(200).json({
      etablissements: etabs.map((e) => e.toPublicJSON(req.user._id)),
    });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/etablissements/:id/logo — changer le logo APRÈS création
// (requireAuth + appartenance à l'établissement). Le logo à la création
// passe par create() ci-dessus; cet endpoint sert à le remplacer plus tard.
// ---------------------------------------------------------------------------
async function uploadLogoHandler(req, res, next) {
  try {
    const etab = await findEtablissementByIdForUser(
      req.user._id,
      req.params.id,
    );

    if (!etab) {
      return res.status(403).json({
        error: "Établissement introuvable ou vous n'y avez pas accès.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu." });
    }

    etab.logo = buildPublicUploadUrl(req, `logos/${req.file.filename}`);
    await etab.save();

    return res
      .status(200)
      .json({ etablissement: etab.toPublicJSON(req.user._id) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, getMine, uploadLogo: uploadLogoHandler };
