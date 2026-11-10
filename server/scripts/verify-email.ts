/**
 * Verify the configured SMTP transport without revealing credentials.
 *
 *   npm run mail:verify -w server
 *
 * Exits non-zero when SMTP is not configured or Google/the provider rejects the
 * login, so it is safe to use in a deploy check.
 */
import 'dotenv/config';
import { mailConfigured, verifyMailer } from '../src/lib/mailer';

if (!mailConfigured) {
  console.error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS).');
  process.exit(1);
}

const result = await verifyMailer();
if (result.ok) {
  console.log('SMTP connection: OK');
  process.exit(0);
}

console.error(`SMTP connection: FAILED (${result.error || 'unknown error'})`);
process.exit(1);
