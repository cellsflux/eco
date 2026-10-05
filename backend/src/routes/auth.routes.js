const express = require("express");
const rateLimit = require("express-rate-limit");

const controller = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { uploadPhoto } = require("../middleware/uploadPhoto");
const {
  signupSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  appleAuthSchema,
  refreshSchema,
  checkUsernameSchema,
} = require("../validators/auth.validators");

const router = express.Router();

// Anti brute-force sur les endpoints sensibles (OTP / login / reset)
const strictLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives, réessayez plus tard." },
});

router.post("/signup", strictLimiter, validate(signupSchema), controller.signup);
router.post("/check-username", validate(checkUsernameSchema), controller.checkUsername);
router.post("/verify-otp", strictLimiter, validate(verifyOtpSchema), controller.verifyOtp);
router.post("/resend-otp", strictLimiter, validate(resendOtpSchema), controller.resendOtp);
router.post("/login", strictLimiter, validate(loginSchema), controller.login);

router.post(
  "/forgot-password",
  strictLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword,
);
router.post(
  "/reset-password",
  strictLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword,
);

router.post("/google", strictLimiter, validate(googleAuthSchema), controller.googleAuth);
router.post("/apple", strictLimiter, validate(appleAuthSchema), controller.appleAuth);

router.post("/refresh", validate(refreshSchema), controller.refresh);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);
router.post("/me/photo", requireAuth, uploadPhoto.single("photo"), controller.uploadPhoto);

module.exports = router;
