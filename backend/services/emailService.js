// services/emailService.js
const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   parseInt(process.env.EMAIL_PORT, 10),
    secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
    auth:   { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls:    { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });

// ── Shared HTML shell ─────────────────────────────────────────────────────────
const shell = (body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PrintMixBox</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background:#f5f6f8; color:#0f1117; }
    .wrap { max-width:560px; margin:32px auto; }
    .header { background:#2563eb; padding:28px 36px; border-radius:8px 8px 0 0; }
    .header-brand { display:flex; align-items:center; gap:10px; }
    .header h1 { font-size:18px; font-weight:700; color:#fff; letter-spacing:-0.3px; }
    .header p  { font-size:12px; color:rgba(255,255,255,0.65); margin-top:2px; }
    .body { background:#ffffff; padding:36px; border:1px solid #e2e5ea; border-top:none; border-radius:0 0 8px 8px; }
    .body p { font-size:14px; line-height:1.65; color:#374151; margin-bottom:14px; }
    .cred-box { background:#f9fafb; border:1px solid #e2e5ea; border-radius:8px; padding:20px 24px; margin:20px 0; }
    .cred-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e2e5ea; }
    .cred-row:last-child { border-bottom:none; }
    .cred-label { font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; }
    .cred-value { font-size:15px; font-weight:600; color:#0f1117; font-family:'Courier New',monospace; letter-spacing:1px; }
    .cred-value.highlight { color:#2563eb; }
    .alert-box { background:#eff4ff; border:1px solid #c7d9fd; border-radius:8px; padding:14px 18px; margin:20px 0; }
    .alert-box p { font-size:13px; color:#1d4ed8; margin:0; }
    .btn { display:inline-block; background:#2563eb; color:#fff; padding:12px 28px; border-radius:6px; font-size:14px; font-weight:600; text-decoration:none; margin-top:8px; }
    .footer { margin-top:24px; text-align:center; font-size:12px; color:#9ca3af; padding-top:16px; border-top:1px solid #e2e5ea; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-brand">
        <span style="font-size:20px;">🖨️</span>
        <div>
          <h1>PrintMixBox</h1>
          <p>IoT Printing &amp; Box Branding Platform</p>
        </div>
      </div>
    </div>
    <div class="body">${body}</div>
    <div class="footer">© ${new Date().getFullYear()} PrintMixBox. This is an automated message.</div>
  </div>
</body>
</html>`;

// ── Send credentials to approved company ──────────────────────────────────────
const sendCredentialsEmail = async ({
  to, companyName, companyCode, username, tempPassword,
}) => {
  const transporter = createTransporter();

  const html = shell(`
    <p>Hello,</p>
    <p>
      Your company registration for <strong>${companyName}</strong> on the PrintMixBox platform
      has been <strong style="color:#16a34a;">approved</strong> by our admin team.
    </p>
    <p>Please use the credentials below to sign in. You will be prompted to change your password on first login.</p>

    <div class="cred-box">
      <div class="cred-row">
        <span class="cred-label">Company Code</span>
        <span class="cred-value highlight">${companyCode}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Username</span>
        <span class="cred-value">${username}</span>
      </div>
      <div class="cred-row">
        <span class="cred-label">Temporary Password</span>
        <span class="cred-value">${tempPassword}</span>
      </div>
    </div>

    <div class="alert-box">
      <p>⚠️ This is a temporary password. You must change it after your first login for security reasons.</p>
    </div>

    <p>Click the button below to sign in to your dashboard:</p>
    <a href="${process.env.FRONTEND_URL}/login" class="btn">Sign In to Dashboard →</a>

    <p style="margin-top:20px; font-size:13px; color:#6b7280;">
      If you did not register for PrintMixBox, please ignore this email.
    </p>
  `);

  const info = await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: `[PrintMixBox] Your account credentials — ${companyCode}`,
    html,
    text: `PrintMixBox Account Approved\n\nCompany: ${companyName}\nCompany Code: ${companyCode}\nUsername: ${username}\nTemporary Password: ${tempPassword}\n\nLogin at: ${process.env.FRONTEND_URL}/login`,
  });

  console.log(`📧  Credentials email sent to ${to} [${info.messageId}]`);
  return info;
};

// ── Send registration received acknowledgement ─────────────────────────────────
const sendRegistrationAckEmail = async ({ to, companyName }) => {
  const transporter = createTransporter();

  const html = shell(`
    <p>Hello,</p>
    <p>
      Thank you for registering <strong>${companyName}</strong> on the PrintMixBox platform.
    </p>
    <p>
      Your application has been received and is currently <strong>pending admin review</strong>.
      Once approved, you will receive a separate email with your login credentials.
    </p>
    <p>This usually takes 1–2 business days. If you have any questions, please contact our support team.</p>
    <p style="margin-top:20px; color:#6b7280; font-size:13px;">The PrintMixBox Team</p>
  `);

  const info = await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject: `[PrintMixBox] Registration received — ${companyName}`,
    html,
    text: `Thank you for registering ${companyName}. Your application is pending admin review. You will receive credentials once approved.`,
  });

  console.log(`📧  Registration ack sent to ${to}`);
  return info;
};

const verifyEmailConnection = async () => {
  try {
    const t = createTransporter();
    await t.verify();
    console.log('✅  Email service (SMTP) connected');
  } catch (err) {
    console.warn(`⚠️   Email service unavailable: ${err.message}`);
  }
};

module.exports = {
  sendCredentialsEmail,
  sendRegistrationAckEmail,
  verifyEmailConnection,
};