import { Router } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../lib/errors';
import { contactSchema, newsletterSchema, validate } from '../lib/validation';
import { formLimiter } from '../middleware/rateLimit';

const router = Router();

router.post(
  '/newsletter',
  formLimiter,
  validate(newsletterSchema),
  asyncHandler(async (req, res) => {
    const { email, name } = req.body;
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, name: name ?? null },
      update: { active: true, name: name ?? undefined },
    });
    res.status(201).json({ message: 'You are subscribed. Welcome to the TechTuxAcademy community!' });
  })
);

router.post(
  '/contact',
  formLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    await prisma.contactMessage.create({ data: req.body });
    res.status(201).json({ message: 'Message received. Our team will reply within 1–2 business days.' });
  })
);

export default router;
