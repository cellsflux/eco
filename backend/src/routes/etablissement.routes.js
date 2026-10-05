const express = require("express");
const controller = require("../controllers/etablissement.controller");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { uploadLogo } = require("../middleware/uploadLogo");
const { createEtablissementSchema } = require("../validators/etablissement.validators");

const router = express.Router();

router.get("/me", requireAuth, controller.getMine);
router.post(
  "/",
  requireAuth,
  uploadLogo.single("logo"),
  validate(createEtablissementSchema),
  controller.create,
);
router.post("/:id/logo", requireAuth, uploadLogo.single("logo"), controller.uploadLogo);

module.exports = router;
