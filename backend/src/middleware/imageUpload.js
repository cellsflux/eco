const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// "Stocké momentanément sur le backend": pas de S3/CDN pour l'instant, juste
// le disque local du serveur, servi en statique via /uploads (voir
// server.js). Simple et suffisant pour démarrer; à remplacer par un vrai
// stockage objet (S3, Cloudinary, etc.) si le volume augmente — les champs
// qui stockent l'URL (`logo`, `photo`) resteront de simples strings des deux
// côtés (backend + Electron), donc ce changement futur n'impacterait aucun
// autre code.
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

/**
 * Crée un middleware multer dédié à un sous-dossier d'/uploads (ex: "logos",
 * "avatars"). `req.params.id` est utilisé comme préfixe de nom de fichier
 * quand il existe (upload après création, sur une ressource déjà identifiée);
 * sinon (upload PENDANT la création, avant qu'un id existe) un identifiant
 * aléatoire est généré à la place.
 */
function createImageUploader(subfolder) {
  const uploadDir = path.join(__dirname, "../../uploads", subfolder);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      const base = req.params?.id || crypto.randomBytes(8).toString("hex");
      cb(null, `${base}-${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        return cb(new Error("Format d'image non supporté (png, jpeg, webp, svg uniquement)."));
      }
      cb(null, true);
    },
  });
}

/**
 * URL absolue pour un fichier servi depuis /uploads/<subpath>. Utilisée pour
 * que `logo`/`photo` soient toujours des URLs complètes, utilisables aussi
 * bien depuis le web que depuis Electron (qui n'est pas sur la même origine
 * que le backend).
 */
function buildPublicUploadUrl(req, subpath) {
  const baseUrl = process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/${subpath}`;
}

module.exports = { createImageUploader, buildPublicUploadUrl };
