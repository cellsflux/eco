const UserModel = require("../models/User");

const GenerateUsername = async (name = "") => {
  // Supprime tous les espaces et met en majuscules
  const baseUsername = name.replace(/\s+/g, "").toUpperCase();
  // Vérifie si le username est disponible
  const exists = await UserModel.exists({
    username: baseUsername,
  });
  // S'il n'existe pas, on le retourne directement
  if (!exists) {
    return baseUsername;
  }
  // Sinon, on génère un username avec un nombre aléatoire
  let username;

  do {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    username = `${baseUsername}${randomNumber}`;

    const usernameExists = await UserModel.exists({
      username,
    });

    if (!usernameExists) {
      return username;
    }
  } while (true);
};

module.exports = GenerateUsername;
