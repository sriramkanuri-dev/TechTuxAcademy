/**
 * Idempotently ensure a primary administrator exists.
 *
 *   ADMIN_EMAIL=sriramkanuri4@gmail.com npm run admin:set -w server
 *
 * - Existing account: promotes to ADMIN (no duplicate is created) and can
 *   optionally reset the password when ADMIN_PASSWORD is set.
 * - New account: creates one with ADMIN role. When ADMIN_PASSWORD is omitted a
 *   cryptographically random password is generated and deliberately NOT printed;
 *   use the "Forgot password?" flow to choose your own.
 *
 * No secret is ever written to the repository or to stdout.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const name = (process.env.ADMIN_NAME || 'TechTuxAcademy Admin').trim();
const providedPassword = process.env.ADMIN_PASSWORD || '';
const providedName = Boolean(process.env.ADMIN_NAME);

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('ADMIN_EMAIL must be a valid email address.');
  process.exit(1);
}

try {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const data = {
      role: 'ADMIN',
      disabled: false,
      emailVerified: true,
      ...(providedName ? { name } : {}),
    };
    if (providedPassword) {
      data.passwordHash = await bcrypt.hash(providedPassword, 12);
      data.passwordChangedAt = new Date();
    }
    await prisma.user.update({ where: { id: existing.id }, data });
    console.log(`Admin ensured for existing account: ${email}`);
    console.log(
      providedPassword
        ? 'Password was updated from ADMIN_PASSWORD (not printed).'
        : 'Password unchanged.'
    );
  } else {
    const password = providedPassword || crypto.randomBytes(32).toString('base64url');
    await prisma.user.create({
      data: {
        name,
        email,
        role: 'ADMIN',
        emailVerified: true,
        passwordHash: await bcrypt.hash(password, 12),
        passwordChangedAt: new Date(),
      },
    });
    console.log(`Admin account created: ${email}`);
    console.log(
      providedPassword
        ? 'Password set from ADMIN_PASSWORD (not printed).'
        : 'A random password was generated and discarded. Use "Forgot password?" to set one.'
    );
  }

  const admins = await prisma.user.count({ where: { role: 'ADMIN', disabled: false } });
  console.log(`Active administrators: ${admins}`);
} finally {
  await prisma.$disconnect();
}
