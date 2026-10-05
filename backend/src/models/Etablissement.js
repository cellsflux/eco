const mongoose = require("mongoose");

const { Schema } = mongoose;

const SUBSCRIPTION_STATUSES = ["none", "trial", "active", "expired"];

const EtablissementSchema = new Schema(
  {
    owen: { type: Schema.Types.ObjectId, ref: "User", index: true },
    users: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: {
          type: [String],
          enum: [
            "enseignant",
            "responsablefin",
            "responsable_inscription",
            "directeur",
            "planificateur_horraire",
          ],
        },
      },
    ],
    name: { type: String, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Stocké côté backend (voir uploadLogo dans le controller) — chemin
    // absolu servant le fichier depuis /uploads. Même nom de champ des deux
    // côtés (backend et modèle Electron), aucune transformation au sync.
    logo: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "primaire",
        "secondaire",
        "maternel",
        "creush",
        "complexe_scolaire",
      ],
    },
    pays: String,
    province: String,
    ville: String,
    adresse_complete: { type: String },
    phone: { type: String },
    email: { type: String },
    website: { type: String },
    description: { type: String },
    owener_name: String,
    owener_phone: String,
    token: String,
    /**configuration de l'etablissement */
    maticule_prefix: { type: String },
    matricule_lengh: { type: Number },
    money: [
      {
        name: { type: String },
        symbole: { type: String },
        Taux_dollar: { type: String },
      },
    ],

    // IMPORTANT: ces deux champs sont désormais RÉELLEMENT PERSISTÉS (pas
    // seulement calculés à la lecture) — exactement comme le modèle Electron
    // (realm-mongoose-orm) les attend. `refreshSubscriptionFields()`
    // (ci-dessous) les recalcule et les écrit à chaque fois qu'un document
    // est créé ou relu, pour qu'ils ne divergent jamais entre les deux côtés.
    subscriptionStatus: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "none",
    },
    trialEndsAt: { type: Date, default: null },

    /** Abonement informations */
    abonement: [
      {
        amount: { type: Number },
        // NOTE: corrigé — un schéma source avait `devise: { Type: String }`
        // (T majuscule), que Mongoose ne reconnaît pas comme définition de
        // type: ça transforme silencieusement `devise` en sous-objet
        // `{ Type: "..." }` au lieu d'une simple chaîne. Le modèle Electron
        // avait exactement le même bug — corrigé aux deux endroits.
        devise: { type: String },
        from_method: { type: String },
        description: { type: String },
        date_debut: { type: Date },
        date_fin: { type: Date },
      },
    ],
  },
  { timestamps: true },
);

// NOTE: pas de contrainte d'unicité sur `owen` — un utilisateur peut
// posséder ou appartenir à PLUSIEURS établissements (chacun avec son propre
// essai gratuit / abonnement). Seul le `slug` reste unique.

// ---------------------------------------------------------------------------
// Abonnement / essai gratuit
// ---------------------------------------------------------------------------

EtablissementSchema.methods.getCurrentAbonement =
  function getCurrentAbonement() {
    if (!this.abonement || this.abonement.length === 0) return null;
    return this.abonement[this.abonement.length - 1];
  };

function computeSubscriptionStatus(current) {
  if (!current) return "none";
  const isExpired = current.date_fin && current.date_fin.getTime() < Date.now();
  if (isExpired) return "expired";
  return Number(current.amount) === 0 ? "trial" : "active";
}

/**
 * Recalcule `subscriptionStatus` et `trialEndsAt` à partir du dernier
 * abonnement et les ÉCRIT sur le document (en mémoire — appeler `.save()`
 * ensuite si le changement doit être persisté). Aucune tâche planifiée
 * (cron) n'est nécessaire: on l'appelle simplement à chaque lecture
 * (getMine, génération de code OAuth, etc.), donc le statut ne peut jamais
 * rester "trial" après expiration plus de le temps d'un aller-retour.
 * Renvoie `true` si une valeur a changé (pour éviter un `.save()` inutile).
 */
EtablissementSchema.methods.refreshSubscriptionFields =
  function refreshSubscriptionFields() {
    const current = this.getCurrentAbonement();
    const nextStatus = computeSubscriptionStatus(current);
    const nextTrialEndsAt = current?.date_fin || null;

    const changed =
      this.subscriptionStatus !== nextStatus ||
      (this.trialEndsAt?.getTime() || null) !==
        (nextTrialEndsAt?.getTime() || null);

    this.subscriptionStatus = nextStatus;
    this.trialEndsAt = nextTrialEndsAt;

    return changed;
  };

/**
 * Renvoie le rôle de `userId` dans cet établissement ("proprietaire" s'il en
 * est le owen, sinon le(s) rôle(s) déclarés dans `users`, sinon null).
 */
EtablissementSchema.methods.getRoleFor = function getRoleFor(userId) {
  if (!userId) return null;
  if (this.owen && this.owen.toString() === userId.toString()) {
    return "proprietaire";
  }
  const entry = (this.users || []).find(
    (u) => u.user && u.user.toString() === userId.toString(),
  );
  return entry ? entry.role : null;
};

EtablissementSchema.methods.toPublicJSON = function toPublicJSON(forUserId) {
  return {
    id: this._id.toString(),
    owen: this.owen,
    users: this.users,
    name: this.name,
    slug: this.slug,
    logo: this.logo,
    type: this.type,
    pays: this.pays,
    province: this.province,
    ville: this.ville,
    adresse_complete: this.adresse_complete,
    phone: this.phone,
    email: this.email,
    website: this.website,
    description: this.description,
    owener_name: this.owener_name,
    owener_phone: this.owener_phone,
    maticule_prefix: this.maticule_prefix,
    matricule_lengh: this.matricule_lengh,
    money: this.money,
    subscriptionStatus: this.subscriptionStatus,
    trialEndsAt: this.trialEndsAt,
    abonement: this.abonement,
    // Pas un champ du modèle: ajouté en plus, jamais un renommage d'un champ
    // existant — indique le rôle de l'appelant dans cet établissement.
    role: this.getRoleFor(forUserId),
  };
};

module.exports = mongoose.model("Etablisssment", EtablissementSchema);
