const nodemailer = require("nodemailer");
const { user, pass } = require("../config/emailConfig");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
});

async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log("=================================");
    console.log("✅ Nodemailer is ready");
    console.log("📧 Sender:", user);
    console.log("=================================");
    return true;
  } catch (error) {
    console.log("=================================");
    console.log("❌ Nodemailer connection failed");
    console.log("Error:", error.message);
    console.log("=================================");
    return false;
  }
}

async function sendEmail({ to, replyTo, subject, text, html, attachments = [] }) {
  if (!to) throw new Error("Recipient email is required");
  const info = await transporter.sendMail({
    from: `"Manorama Charitable Trust" <${user}>`,
    to,
    replyTo: replyTo || to,
    subject,
    text,
    html,
    attachments,
  });
  console.log("=================================");
  console.log("✅ Email sent successfully");
  console.log("📧 From:", user);
  console.log("📧 To:", to);
  console.log("↩️ Reply-To:", replyTo || to);
  console.log("📝 Subject:", subject);
  console.log("📎 Attachments:", attachments.length);
  console.log("🆔 Message ID:", info.messageId);
  console.log("=================================");
  return info;
}

async function sendTestEmail() {
  return sendEmail({
    to: user,
    replyTo: user,
    subject: "Manorama Nodemailer Test",
    text: "Congratulations!\n\nNodemailer is working successfully.\n\nThis is a test email from Manorama Charitable Trust.",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px"><h2>Nodemailer Test Successful</h2><p>Congratulations!</p><p>Your Nodemailer email system is working successfully.</p></div>`,
  });
}

module.exports = { sendEmail, verifyEmailConnection, sendTestEmail };
