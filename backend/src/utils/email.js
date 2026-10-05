const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    /*host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,*/
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

function baseTemplate({ title, message, code }) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f4f4f5; padding:32px;">
    <div style="max-width:420px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e5e7eb;">
      <div style="padding:28px 28px 8px 28px;">
        <div style="width:44px;height:44px;border-radius:12px;background:#111827;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">CF</div>
        <h1 style="font-size:18px;color:#111827;margin:20px 0 6px 0;">${title}</h1>
        <p style="font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 20px 0;">${message}</p>
        ${
          code
            ? `<div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#111827;text-align:center;background:#f9fafb;border-radius:12px;padding:16px 0;margin-bottom:20px;">${code}</div>`
            : ""
        }
      </div>
      <div style="border-top:1px solid #f3f4f6;padding:16px 28px;text-align:center;">
        <span style="font-size:12px;color:#9ca3af;">Sécurisé par CellsFlux</span>
      </div>
    </div>
  </div>`;
}

async function sendOTPEmail(to, otp, purpose) {
  const subject =
    purpose === "signup"
      ? "Votre code de vérification CellsFlux"
      : "Votre code de connexion CellsFlux";

  const html = baseTemplate({
    title: subject,
    message:
      "Entrez ce code dans l'application pour continuer. Il expire dans " +
      `${process.env.OTP_EXPIRES_MINUTES || 10} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    code: otp,
  });

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

async function sendResetPasswordEmail(to, resetUrl) {
  const html = baseTemplate({
    title: "Réinitialisation du mot de passe",
    message: `Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans ${
      process.env.RESET_TOKEN_EXPIRES_MINUTES || 30
    } minutes.<br/><br/><a href="${resetUrl}" style="color:#111827;font-weight:600;">Réinitialiser mon mot de passe</a><br/><br/>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email, votre mot de passe restera inchangé.`,
  });

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Réinitialisez votre mot de passe CellsFlux",
    html,
  });
}

module.exports = { sendOTPEmail, sendResetPasswordEmail };
