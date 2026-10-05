const express = require("express");
const rateLimit = require("express-rate-limit");

const controller = require("../controllers/oauth.controller");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { generateCodeSchema, exchangeTokenSchema } = require("../validators/oauth.validators");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives, réessayez plus tard." },
});

router.post("/code", limiter, requireAuth, validate(generateCodeSchema), controller.generateCode);
router.post("/token", limiter, validate(exchangeTokenSchema), controller.exchangeToken);

module.exports = router;
