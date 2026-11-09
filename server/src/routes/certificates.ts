import { Router } from 'express';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../lib/errors';
import { certificateInclude, getPublicCertificate } from '../services/certificates';
import { renderCertificatePdf } from '../services/certificatePdf';

const router = Router();

function present(certificate: NonNullable<Awaited<ReturnType<typeof getPublicCertificate>>>) {
  return {
    certificateId: certificate.certificateId,
    studentName: certificate.user.name,
    courseTitle: certificate.course.title,
    courseTitleTe: certificate.course.titleTe,
    courseSlug: certificate.course.slug,
    category: certificate.course.category.name,
    difficulty: certificate.course.difficulty,
    issuedAt: certificate.issuedAt,
    revoked: certificate.revoked,
    revokedAt: certificate.revokedAt,
    status: certificate.revoked ? 'revoked' : 'valid',
  };
}

router.get(
  '/verify/:certificateId',
  asyncHandler(async (req, res) => {
    const certificate = await getPublicCertificate(req.params.certificateId);
    if (!certificate) throw new ApiError(404, 'No certificate matches that ID.');
    res.json({ valid: !certificate.revoked, certificate: present(certificate) });
  })
);

router.get(
  '/verify',
  asyncHandler(async (req, res) => {
    const id = String(req.query.id || '').trim();
    if (!id) throw new ApiError(400, 'Provide a certificate ID to verify.');
    const certificate = await getPublicCertificate(id);
    if (!certificate) throw new ApiError(404, 'No certificate matches that ID.');
    res.json({ valid: !certificate.revoked, certificate: present(certificate) });
  })
);

router.get(
  '/:certificateId/pdf',
  asyncHandler(async (req, res) => {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateId: req.params.certificateId },
      include: certificateInclude,
    });
    if (!certificate) throw new ApiError(404, 'Certificate not found.');
    if (certificate.revoked) {
      throw new ApiError(410, 'This certificate has been revoked and can no longer be downloaded.');
    }

    const pdf = await renderCertificatePdf({
      certificateId: certificate.certificateId,
      studentName: certificate.user.name,
      courseTitle: certificate.course.title,
      categoryName: certificate.course.category.name,
      issuedAt: certificate.issuedAt,
      difficulty: certificate.course.difficulty,
    });

    const safeName = certificate.course.title.replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 60);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="TechTuxAcademy-${safeName}-${certificate.certificateId}.pdf"`
    );
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.send(pdf);
  })
);

export default router;
