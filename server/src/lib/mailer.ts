import nodemailer from 'nodemailer';
import { config } from '../config';

/**
 * Email is optional infrastructure: a temporary SMTP outage must never break
 * registration, login or password resets. Every send is best-effort and returns
 * a boolean instead of throwing.
 */
export const mailConfigured = Boolean(
  config.smtp.host && config.smtp.user && config.smtp.pass
);

const transporter = mailConfigured
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
      pool: true,
      maxConnections: 2,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    })
  : null;

export interface MailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').slice(0, 200);
}

function siteUrl(): string {
  return config.publicSiteUrl.replace(/\/+$/, '');
}

async function sendMail({ to, subject, html, text }: MailOptions): Promise<MailResult> {
  if (!transporter) {
    // Dev convenience only. Production must never print reset links or tokens.
    if (!config.isProd) {
      console.log('\n─────────── EMAIL (dev preview) ───────────');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(text);
      console.log('────────────────────────────────────────────\n');
      return { ok: true, skipped: true };
    }
    console.warn(`[mail] SMTP not configured; skipped "${subject}" to ${to}`);
    return { ok: false, skipped: true, error: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({ from: config.smtp.from, to, subject, html, text });
    return { ok: true };
  } catch (error) {
    // Never log credentials; nodemailer errors contain the SMTP response only.
    console.error(`[mail] delivery failed for "${subject}" to ${to}: ${safeError(error)}`);
    return { ok: false, error: safeError(error) };
  }
}

/** Used by the operator script and health checks. Never returns credentials. */
export async function verifyMailer(): Promise<MailResult> {
  if (!transporter) return { ok: false, skipped: true, error: 'SMTP not configured' };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin:8px 0 4px;padding:13px 22px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:#ffffff;text-decoration:none;font-weight:600;font-size:14px">${label}</a>`;
}

function fallbackLink(href: string): string {
  return `<p style="color:#64748b;font-size:12px;line-height:1.6;margin-top:18px">If the button does not work, copy this link into your browser:<br><a href="${href}" style="color:#a78bfa;word-break:break-all">${href}</a></p>`;
}

function layout(title: string, body: string): string {
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
      TechTuxAcademy · <a href="${siteUrl()}" style="color:#a78bfa;text-decoration:none">techtuxacademy.online</a><br>
      You are receiving this because of activity on your TechTuxAcademy account.
    </div>
  </div></body></html>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const link = `${siteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);
  return sendMail({
    to,
    subject: 'Verify your TechTuxAcademy email',
    text: `Hi ${name}, verify your email by visiting: ${link}`,
    html: layout(
      `Welcome, ${safeName}!`,
      `<p style="color:#94a3b8;line-height:1.6">Confirm your email address to unlock certificates, progress syncing and your learner profile.</p>
       ${button('Verify email', link)}
       ${fallbackLink(link)}
       <p style="color:#64748b;font-size:12px;margin-top:18px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>`
    ),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);
  return sendMail({
    to,
    subject: 'Reset your TechTuxAcademy password',
    text: `Hi ${name}, reset your password here (valid for 30 minutes): ${link}`,
    html: layout(
      'Reset your password',
      `<p style="color:#94a3b8;line-height:1.6">Hi ${safeName}, we received a request to reset the password for your TechTuxAcademy account.</p>
       <p style="color:#94a3b8;line-height:1.6">Click the button below to choose a new password. This link can only be used once.</p>
       ${button('Choose a new password', link)}
       ${fallbackLink(link)}
       <p style="color:#f59e0b;font-size:12px;margin-top:18px">This link expires in 30 minutes.</p>
       <p style="color:#64748b;font-size:12px;margin-top:8px">If you did not request a password reset, you can safely ignore this email — your password will not change. If you receive several of these emails, someone may be trying to access your account.</p>`
    ),
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  const safeName = escapeHtml(name);
  const when = new Date().toUTCString();
  return sendMail({
    to,
    subject: 'Your TechTuxAcademy password was changed',
    text: `Hi ${name}, your TechTuxAcademy password was changed on ${when}. If this wasn't you, reset your password immediately.`,
    html: layout(
      'Your password was changed',
      `<p style="color:#94a3b8;line-height:1.6">Hi ${safeName}, the password for your TechTuxAcademy account was changed on <strong style="color:#e2e8f0">${when}</strong>.</p>
       <p style="color:#94a3b8;line-height:1.6">All other signed-in sessions have been signed out.</p>
       <p style="color:#f59e0b;font-size:13px;line-height:1.6;margin-top:18px">If you did not make this change, reset your password immediately and contact us.</p>
       ${button('Reset password', `${siteUrl()}/forgot-password`)}`
    ),
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const safeName = escapeHtml(name);
  const link = `${siteUrl()}/courses`;
  return sendMail({
    to,
    subject: 'Welcome to TechTuxAcademy',
    text: `Hi ${name}, welcome to TechTuxAcademy. Start learning at ${link}`,
    html: layout(
      `Welcome aboard, ${safeName}!`,
      `<p style="color:#94a3b8;line-height:1.6">Your TechTuxAcademy account is ready. Explore structured courses, practical tutorials and verifiable certificates.</p>
       <ul style="color:#94a3b8;line-height:1.8;padding-left:18px">
         <li>Browse the course catalogue and enrol in a path that fits you.</li>
         <li>Track lessons and download your certificate when you finish.</li>
         <li>Read tutorials and blog notes written for real-world work.</li>
       </ul>
       ${button('Start learning', link)}
       ${fallbackLink(link)}`
    ),
  });
}

export async function sendAdminNewRegistrationEmail(
  to: string,
  newUser: { name: string; email: string; createdAt?: Date }
) {
  const link = `${siteUrl()}/admin`;
  return sendMail({
    to,
    subject: `New TechTuxAcademy registration: ${newUser.name}`,
    text: `A new account was created: ${newUser.name} <${newUser.email}> at ${(newUser.createdAt || new Date()).toUTCString()}.`,
    html: layout(
      'New registration',
      `<p style="color:#94a3b8;line-height:1.6">A new learner account was created.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;color:#e2e8f0">
         <tr><td style="padding:8px 0;color:#64748b">Name</td><td style="padding:8px 0">${escapeHtml(newUser.name)}</td></tr>
         <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0">${escapeHtml(newUser.email)}</td></tr>
         <tr><td style="padding:8px 0;color:#64748b">Created</td><td style="padding:8px 0">${(newUser.createdAt || new Date()).toUTCString()}</td></tr>
       </table>
       ${button('Open admin dashboard', link)}`
    ),
  });
}
