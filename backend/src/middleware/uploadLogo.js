const { createImageUploader } = require("./imageUpload");

// Logos d'établissement — voir imageUpload.js pour la logique commune.
const uploadLogo = createImageUploader("logos");

module.exports = { uploadLogo };
