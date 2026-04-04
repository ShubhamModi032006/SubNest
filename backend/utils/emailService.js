const nodemailer = require("nodemailer");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const allowDevFallback = process.env.ALLOW_EMAIL_DEV_FALLBACK === "true";

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends an email using Nodemailer.
 * @param {Object} options - Mail options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body of the email
 * @param {string} [options.text] - Plain text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    if (isProduction || !allowDevFallback) {
      throw new Error("Email service is not configured.");
    }

    // Dev fallback: keep auth flow working without SMTP credentials.
    console.warn("⚠️ EMAIL_USER/EMAIL_PASS missing. Skipping real email send in development.");
    return { success: true, messageId: "dev-fallback-no-smtp" };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"SubNest Auth" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text: text || "",
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send email:", error.message, error.response || "");

    if (!isProduction && allowDevFallback) {
      console.warn("⚠️ Falling back to dev mode email success to avoid blocking reset flow.");
      return { success: true, messageId: "dev-fallback-send-failed" };
    }

    throw new Error("Failed to send email. Please try again later.");
  }
};

/**
 * Sends a password reset email.
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 * @param {string} userName - Recipient's name
 */
const sendPasswordResetEmail = async (to, token, userName) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { color: #333333; font-size: 24px; }
        .body-text { color: #555555; font-size: 16px; line-height: 1.6; }
        .btn { display: inline-block; margin: 24px 0; padding: 14px 28px; background-color: #6c63ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; }
        .btn:hover { background-color: #574fd6; }
        .footer { margin-top: 32px; font-size: 13px; color: #999999; text-align: center; }
        .warning { color: #e74c3c; font-size: 14px; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <p class="body-text">Hi <strong>${userName}</strong>,</p>
        <p class="body-text">
          We received a request to reset your password for your SubNest account.
          Click the button below to reset your password:
        </p>
        <div style="text-align: center;">
          <a href="${resetLink}" class="btn">Reset My Password</a>
        </div>
        <p class="body-text">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #6c63ff; word-break: break-all;">${resetLink}</a>
        </p>
        <p class="warning">⚠️ This link will expire in <strong>1 hour</strong>.</p>
        <p class="body-text">
          If you did not request a password reset, you can safely ignore this email.
          Your password will remain unchanged.
        </p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SubNest. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${userName},\n\nReset your password by visiting:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`;

  return sendEmail({ to, subject: "Reset Your SubNest Password", html, text });
};

module.exports = { sendEmail, sendPasswordResetEmail };
