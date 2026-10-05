// Registre des clients autorisés à utiliser le flow OAuth "maison"
// (Authorization Code + PKCE). Exactement comme Google Cloud Console te fait
// enregistrer un client_id + des redirect_uri autorisées: sans ça, n'importe
// quelle app pourrait se faire passer pour Scool Manager et intercepter des
// codes d'autorisation.
//
// Pour ajouter un nouveau client (ex: une autre app desktop), ajouter une
// entrée ici avec les schémas de redirect_uri autorisés.

const CLIENTS = {
  students: {
    name: "Students",
    // Schéma de deep link Electron autorisé. On vérifie que redirect_uri
    // COMMENCE PAR l'un de ces préfixes, jamais une correspondance partielle
    // ailleurs dans la chaîne (protection contre les redirect_uri piégées).
    allowedRedirectPrefixes: ["students://auth/callback"],
  },
};

function getClient(clientId) {
  return CLIENTS[clientId] || null;
}

function isRedirectUriAllowed(clientId, redirectUri) {
  const client = getClient(clientId);

  if (!client || !redirectUri) return false;
  return client.allowedRedirectPrefixes.some((prefix) =>
    redirectUri.startsWith(prefix),
  );
}

module.exports = { getClient, isRedirectUriAllowed };
