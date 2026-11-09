import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { verificationUrl } from './certificates';

export interface CertificatePdfInput {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  categoryName?: string;
  issuedAt: Date;
  difficulty?: string;
}

const PURPLE = '#8b5cf6';
const BLUE = '#3b82f6';
const CYAN = '#22d3ee';
const INK = '#08080d';
const MUTED = '#94a3b8';
const WHITE = '#f8fafc';

export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  const qrBuffer = await QRCode.toBuffer(verificationUrl(input.certificateId), {
    type: 'png',
    width: 400,
    margin: 1,
    color: { dark: INK, light: '#ffffff' },
  });

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title: `TechTuxAcademy Certificate — ${input.courseTitle}`,
      Author: 'TechTuxAcademy',
      Subject: `Certificate of Completion for ${input.studentName}`,
      Keywords: `TechTuxAcademy, certificate, ${input.certificateId}`,
    },
  });

  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const width = doc.page.width;
  const height = doc.page.height;

  // Base
  doc.rect(0, 0, width, height).fill(INK);

  // Ambient glow blobs
  doc.save();
  doc.fillOpacity(0.16).circle(width - 60, 30, 240).fill(PURPLE);
  doc.fillOpacity(0.12).circle(40, height - 30, 220).fill(CYAN);
  doc.fillOpacity(0.1).circle(width / 2, height + 90, 260).fill(BLUE);
  doc.restore();

  // Border frame
  doc.save();
  doc.lineWidth(1).strokeColor('#2b2b40').roundedRect(28, 28, width - 56, height - 56, 16).stroke();
  doc.lineWidth(2).strokeColor(PURPLE).roundedRect(38, 38, width - 76, height - 76, 12).stroke();
  doc.restore();

  // Corner accent marks
  const accent = (x: number, y: number, dx: number, dy: number) => {
    doc.save();
    doc.lineWidth(4).strokeColor(CYAN);
    doc.moveTo(x, y + dy * 26).lineTo(x, y).lineTo(x + dx * 26, y).stroke();
    doc.restore();
  };
  accent(52, 52, 1, 1);
  accent(width - 52, 52, -1, 1);
  accent(52, height - 52, 1, -1);
  accent(width - 52, height - 52, -1, -1);

  // Brand
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(19).text('TechTuxAcademy', 0, 66, {
    align: 'center',
    width,
  });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8.5).text('LEARN. BUILD. INNOVATE.', 0, 92, {
    align: 'center',
    width,
    characterSpacing: 2,
  });

  // Title
  doc
    .fillColor(CYAN)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('CERTIFICATE OF COMPLETION', 0, 136, { align: 'center', width, characterSpacing: 3 });

  doc.fillColor(MUTED).font('Helvetica').fontSize(11).text('This certificate is proudly presented to', 0, 164, {
    align: 'center',
    width,
  });

  // Student name
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(38).text(input.studentName, 80, 190, {
    align: 'center',
    width: width - 160,
    ellipsis: true,
  });

  doc
    .save()
    .lineWidth(1.5)
    .strokeColor(PURPLE)
    .moveTo(width / 2 - 130, 246)
    .lineTo(width / 2 + 130, 246)
    .stroke()
    .restore();

  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(11)
    .text('for successfully completing the course', 0, 264, { align: 'center', width });

  // Course title
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(23).text(input.courseTitle, 90, 290, {
    align: 'center',
    width: width - 180,
    height: 62,
    ellipsis: true,
  });

  if (input.categoryName) {
    doc
      .fillColor(CYAN)
      .font('Helvetica')
      .fontSize(9.5)
      .text(input.categoryName.toUpperCase(), 0, 358, { align: 'center', width, characterSpacing: 1.5 });
  }

  // Footer details
  const date = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(input.issuedAt);

  const baseline = height - 118;
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(8)
    .text('DATE OF ISSUE', 90, baseline, { characterSpacing: 1 });
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10.5).text(date, 90, baseline + 14);

  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(8)
    .text('CERTIFICATE ID', 90, baseline + 40, { characterSpacing: 1 });
  doc
    .fillColor(WHITE)
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .text(input.certificateId, 90, baseline + 54);

  // Signature
  doc
    .save()
    .lineWidth(1)
    .strokeColor('#3b3b52')
    .moveTo(width / 2 - 85, baseline + 62)
    .lineTo(width / 2 + 85, baseline + 62)
    .stroke()
    .restore();
  doc
    .fillColor(WHITE)
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .text('TechTuxAcademy', width / 2 - 90, baseline + 68, { width: 180, align: 'center' });
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7.5)
    .text('ACADEMY TEAM', width / 2 - 90, baseline + 83, { width: 180, align: 'center', characterSpacing: 1 });

  // QR
  const qrSize = 88;
  const qrX = width - 90 - qrSize;
  const qrY = height - 118;
  doc.save().roundedRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10, 6).fill('#ffffff').restore();
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(7)
    .text('Scan to verify', qrX - 8, qrY + qrSize + 6, { width: qrSize + 16, align: 'center' });

  // Bottom microcopy
  doc
    .fillColor('#64748b')
    .font('Helvetica')
    .fontSize(7)
    .text(
      `Verify this certificate at ${verificationUrl(input.certificateId)}`,
      0,
      height - 52,
      { align: 'center', width }
    );

  doc.end();
  return finished;
}
