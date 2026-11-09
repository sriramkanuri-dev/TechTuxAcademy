import { Router } from 'express';
import { requireAdmin } from '../lib/auth';
import { ApiError, asyncHandler } from '../lib/errors';
import { upload } from '../middleware/upload';

const router = Router();

router.post(
  '/admin/uploads',
  requireAdmin,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Choose an image to upload.');
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size,
      message: 'Image uploaded.',
    });
  })
);

export default router;
