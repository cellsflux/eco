const Etablissement = require("../models/Etablissement");

/**
 * Recalcule et persiste subscriptionStatus/trialEndsAt sur chaque document
 * si nécessaire (essai expiré depuis la dernière lecture, etc.). Appelé sur
 * tout chemin qui renvoie un établissement, pour que ces champs stockés ne
 * divergent jamais de la réalité — et donc jamais entre le backend et une
 * copie locale (Electron) synchronisée à partir d'eux.
 */
async function refreshAndSaveIfNeeded(etab) {
  if (etab.refreshSubscriptionFields()) {
    await etab.save();
  }
  return etab;
}

/**
 * Tous les établissements d'un utilisateur, qu'il en soit propriétaire
 * (`owen`) ou simplement membre du staff (`users.user`). Un utilisateur peut
 * désormais appartenir à plusieurs établissements.
 */
async function findEtablissementsForUser(userId) {
  if (!userId) return [];
  const etabs = await Etablissement.find({
    $or: [{ owen: userId }, { "users.user": userId }],
  }).sort({ createdAt: -1 });

  return Promise.all(etabs.map(refreshAndSaveIfNeeded));
}

/**
 * Un établissement précis, uniquement si `userId` y a effectivement accès
 * (propriétaire ou staff). Utilisé avant de générer un code OAuth pour
 * Electron: on ne doit jamais pouvoir connecter l'app à un établissement
 * auquel on n'appartient pas, même en devinant son id.
 */
async function findEtablissementByIdForUser(userId, etablissementId) {
  if (!userId || !etablissementId) return null;
  const etab = await Etablissement.findOne({
    _id: etablissementId,
    $or: [{ owen: userId }, { "users.user": userId }],
  });
  if (!etab) return null;
  return refreshAndSaveIfNeeded(etab);
}

module.exports = { findEtablissementsForUser, findEtablissementByIdForUser };
