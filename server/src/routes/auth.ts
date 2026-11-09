import { Router } from 'express';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../db';
import { config } from '../config';
import { ApiError, asyncHandler } from '../lib/errors';
import {
  clearSessionCookie,
  hashPassword,
  publicUser,
  randomToken,
  requireAuth,
  setSessionCookie,
  signSession,
  verifyPassword,
} from '../lib/auth';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  validate,
} from '../lib/validation';
import { sendPasswordResetEmail, sendVerificationEmail } from '../lib/mailer';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, preferredLanguage } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, 'An account with this email already exists. Try signing in.');

    const verificationToken = randomToken();
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        preferredLanguage: preferredLanguage ?? 'en',
        emailVerificationToken: verificationToken,
        emailVerificationExpires: hoursFromNow(24),
      },
    });

    sendVerificationEmail(user.email, user.name, verificationToken).catch((error) =>
      console.error('[mail] verification email failed:', error.message)
    );

    setSessionCookie(res, signSession(user));
    res.status(201).json({
      user: publicUser(user),
      message: 'Welcome to TechTuxAcademy! Check your inbox to verify your email.',
    });
  })
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new ApiError(401, 'Incorrect email or password.');
    }
    if (user.disabled) {
      throw new ApiError(403, 'This account has been disabled. Please contact support.');
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Incorrect email or password.');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    setSessionCookie(res, signSession(updated));
    res.json({ user: publicUser(updated), message: 'Signed in successfully.' });
  })
);

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ message: 'Signed out.' });
});

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ user: req.user ? publicUser(req.user) : null });
  })
);

router.get(
  '/csrf',
  asyncHandler(async (_req, res) => {
    res.json({ csrfToken: res.locals.csrfToken });
  })
);

router.post(
  '/verify-email',
  validate(z.object({ token: z.string().min(20) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: req.body.token },
    });
    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new ApiError(400, 'This verification link is invalid or has expired.');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    res.json({ message: 'Email verified. Your account is fully activated.' });
  })
);

router.post(
  '/resend-verification',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    if (req.user.emailVerified) throw new ApiError(400, 'Your email is already verified.');

    const token = randomToken();
    await prisma.user.update({
      where: { id: req.user.id },
      data: { emailVerificationToken: token, emailVerificationExpires: hoursFromNow(24) },
    });
    await sendVerificationEmail(req.user.email, req.user.name, token);
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  })
);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (user && !user.disabled) {
      const token = randomToken();
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpires: hoursFromNow(1) },
      });
      await sendPasswordResetEmail(user.email, user.name, token);
    }
    res.json({
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  })
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({ where: { passwordResetToken: req.body.token } });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new ApiError(400, 'This reset link is invalid or has expired.');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(req.body.password),
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    res.json({ message: 'Password updated. You can now sign in with your new password.' });
  })
);

router.put(
  '/profile',
  requireAuth,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: req.body,
    });
    res.json({ user: publicUser(updated), message: 'Profile updated.' });
  })
);

router.put(
  '/password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, 'Authentication required.');
    const { currentPassword, newPassword } = req.body;
    if (req.user.passwordHash) {
      if (!currentPassword) throw new ApiError(400, 'Enter your current password.');
      const valid = await verifyPassword(currentPassword, req.user.passwordHash);
      if (!valid) throw new ApiError(400, 'Your current password is incorrect.');
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    res.json({ message: 'Password changed successfully.' });
  })
);

router.post(
  '/google',
  authLimiter,
  validate(googleSchema),
  asyncHandler(async (req, res) => {
    if (!googleClient) {
      throw new ApiError(503, 'Google sign-in is not configured on this deployment.');
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new ApiError(401, 'Could not verify your Google account.');
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] },
    });

    if (user) {
      if (user.disabled) throw new ApiError(403, 'This account has been disabled.');
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.sub,
          emailVerified: true,
          avatar: user.avatar ?? payload.picture ?? null,
          lastLoginAt: new Date(),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: payload.name || payload.email.split('@')[0],
          email: payload.email.toLowerCase(),
          googleId: payload.sub,
          avatar: payload.picture ?? null,
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    setSessionCookie(res, signSession(user));
    res.json({ user: publicUser(user), message: 'Signed in with Google.' });
  })
);

export default router;
