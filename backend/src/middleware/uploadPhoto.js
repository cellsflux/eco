const { createImageUploader } = require("./imageUpload");

// Photos de profil utilisateur — voir imageUpload.js pour la logique commune.
const uploadPhoto = createImageUploader("avatars");

module.exports = { uploadPhoto };
