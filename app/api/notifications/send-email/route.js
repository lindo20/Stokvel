import nodemailer from "nodemailer";

// Sends one notification email via Gmail SMTP, using a mailbox you already
// own (no domain to verify). This route only handles transport — the
// caller (see lib/notifications.js) decides who gets emailed and records
// the outcome in notification_deliveries.
//
// Without GMAIL_USER/GMAIL_APP_PASSWORD set, this deliberately reports
// failure rather than pretending to send. Set them in .env.local:
//   GMAIL_USER=youraccount@gmail.com
//   GMAIL_APP_PASSWORD=the 16-character app password (not your login password)
// An app password requires 2-Step Verification to be enabled on the Google
// account, then Google Account -> Security -> App passwords.
let cachedTransporter;

function getTransporter() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return cachedTransporter;
}

export async function POST(request) {
  const { to, subject, text } = await request.json();

  if (!to || !subject || !text) {
    return Response.json({ ok: false, error: "Missing to, subject, or text." }, { status: 400 });
  }

  const transporter = getTransporter();
  if (!transporter) {
    return Response.json({ ok: false, error: "Email provider not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local." });
  }

  try {
    await transporter.sendMail({
      from: `Stokvel <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message || "Could not send the email." });
  }
}
