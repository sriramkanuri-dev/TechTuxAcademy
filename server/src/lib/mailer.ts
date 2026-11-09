import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendMail({ to, subject, html, text }: MailOptions) {
  if (!transporter) {
    console.log('\n─────────── EMAIL (dev preview) ───────────');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('────────────────────────────────────────────\n');
    return;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, html, text });
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#08080d;font-family:Inter,Arial,sans-serif;color:#e2e8f0">
  <div style="max-width:560px;margin:32px auto;background:#101018;border:1px solid #26263a;border-radius:16px;overflow:hidden">
    <div style="padding:24px 32px;border-bottom:1px solid #26263a">
      <span style="font-size:18px;font-weight:700;color:#a78bfa">TechTuxAcademy</span>
      <span style="font-size:11px;color:#64748b;margin-left:8px">Learn. Build. Innovate.</span>
    </div>
    <div style="padding:32px">
      <h1 style="font-size:20px;margin:0 0 16px;color:#f8fafc">${title}</h1>
      ${body}
    </div>
    <div style="padding:20px 32px;border-top:1px solid #26263a;font-size:12px;color:#64748b">
      TechTuxAcademy · techtuxacademy.online
    </div>
  </div></body></html>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${config.clientUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to,
    subject: 'Verify your TechTuxAcademy email',
    text: `Hi ${name}, verify your email by visiting: ${link}`,
    html: layout(
      `Welcome, ${name}!`,
      `<p style="color:#94a3b8;line-height:1.6">Confirm your email address to unlock certificates, progress syncing and your learner profile.</p>
       <a href="${link}" style="display:inline-block;margin-top:12px;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#fff;text-decoration:none;font-weight:600">Verify email</a>
       <p style="color:#64748b;font-size:12px;margin-top:20px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>`
    ),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${config.clientUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to,
    subject: 'Reset your TechTuxAcademy password',
    text: `Hi ${name}, reset your password here: ${link}`,
    html: layout(
      'Reset your password',
      `<p style="color:#94a3b8;line-height:1.6">Hi ${name}, we received a request to reset your password.</p>
       <a href="${link}" style="display:inline-block;margin-top:12px;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#fff;text-decoration:none;font-weight:600">Choose a new password</a>
       <p style="color:#64748b;font-size:12px;margin-top:20px">This link expires in 1 hour. If you didn't request it, you can safely ignore this email.</p>`
    ),
  });
}
