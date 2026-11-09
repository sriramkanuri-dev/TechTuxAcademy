import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { config } from '../../config';
import type {
  CodeBlock,
  CommandSpec,
  ConceptSpec,
  DiagramSpec,
  FormulaSpec,
  LessonContentPlan,
} from './types';

type FontKind = 'body' | 'bold' | 'oblique' | 'mono' | 'monoBold' | 'telugu';
type DocKind = 'notes' | 'cheatsheet';

export interface PdfResult {
  buffer: Buffer;
  pageCount: number;
}

interface OutlineEntry {
  key: string;
  title: string;
  level: 1 | 2;
}

interface WriteOptions {
  size?: number;
  kind?: FontKind;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  width?: number;
  x?: number;
  lineGap?: number;
  continued?: boolean;
  lineBreak?: boolean;
  ellipsis?: boolean;
}

const COLORS = {
  ink: '#1e293b',
  muted: '#64748b',
  faint: '#94a3b8',
  accent: '#2563eb',
  accent2: '#7c3aed',
  accent3: '#0891b2',
  border: '#dbe3ee',
  panel: '#f1f5f9',
  panelAlt: '#f8fafc',
  codeBg: '#0f172a',
  codeTitle: '#93c5fd',
  codeText: '#e2e8f0',
  warning: '#b45309',
  warningBg: '#fffbeb',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  success: '#047857',
  successBg: '#ecfdf5',
};

const TELUGU = /[\u0c00-\u0c7f]/;

function hasTelugu(value: string): boolean {
  return TELUGU.test(value);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

class ResourcePdf {
  private doc: PDFKit.PDFDocument;
  private kind: DocKind;
  private plan: LessonContentPlan;
  private outline: OutlineEntry[];
  private pages: Map<string, number> = new Map();
  private pageNo = 1;
  private readonly left: number;
  private readonly right: number;
  private readonly top: number;
  private readonly bottom: number;
  private readonly contentWidth: number;
  private readonly pageHeight: number;
  private readonly pageWidth: number;
  private readonly headerLabel: string;
  private readonly generatedLabel: string;

  constructor(plan: LessonContentPlan, kind: DocKind, outline: OutlineEntry[]) {
    this.plan = plan;
    this.kind = kind;
    this.outline = outline;

    const fontDir = config.resourceFontDir;
    const required = {
      body: 'DejaVuSans.ttf',
      bold: 'DejaVuSans-Bold.ttf',
      oblique: 'DejaVuSans-Oblique.ttf',
      mono: 'DejaVuSansMono.ttf',
      monoBold: 'DejaVuSansMono-Bold.ttf',
      telugu: 'Lohit-Telugu.ttf',
    };
    for (const [key, file] of Object.entries(required)) {
      const absolute = path.join(fontDir, file);
      if (!fs.existsSync(absolute)) {
        throw new Error(`PDF font missing: ${absolute} (${key})`);
      }
    }

    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 62, left: 52, right: 52 },
      bufferPages: true,
      info: {
        Title:
          kind === 'notes'
            ? `${plan.lesson.title} — Lesson Notes`
            : `${plan.lesson.title} — Command Cheat Sheet`,
        Author: 'TechTuxAcademy',
        Subject: `${plan.course.title} · ${plan.course.category.name}`,
        Keywords: [
          'TechTuxAcademy',
          plan.course.title,
          plan.lesson.title,
          plan.course.category.name,
          ...plan.course.tags,
        ].join(', '),
        Creator: 'TechTuxAcademy Resource Engine',
        Producer: 'TechTuxAcademy',
      },
    });

    this.doc.registerFont('body', path.join(fontDir, 'DejaVuSans.ttf'));
    this.doc.registerFont('bold', path.join(fontDir, 'DejaVuSans-Bold.ttf'));
    this.doc.registerFont('oblique', path.join(fontDir, 'DejaVuSans-Oblique.ttf'));
    this.doc.registerFont('mono', path.join(fontDir, 'DejaVuSansMono.ttf'));
    this.doc.registerFont('monoBold', path.join(fontDir, 'DejaVuSansMono-Bold.ttf'));
    this.doc.registerFont('telugu', path.join(fontDir, 'Lohit-Telugu.ttf'));

    this.pageWidth = this.doc.page.width;
    this.pageHeight = this.doc.page.height;
    this.left = this.doc.page.margins.left;
    this.right = this.doc.page.margins.right;
    this.top = this.doc.page.margins.top;
    this.bottom = this.doc.page.margins.bottom;
    this.contentWidth = this.pageWidth - this.left - this.right;
    this.headerLabel = `${plan.course.title} · ${plan.lesson.title}`;
    this.generatedLabel = formatDate(plan.generatedAt);

    this.drawTitlePage();
    this.reserveTocPages();
  }

  // ── primitives ──────────────────────────────────────────────────────
  private font(kind: FontKind, size: number): void {
    this.doc.font(kind).fontSize(size);
  }

  private write(text: string, options: WriteOptions = {}): void {
    const { size = 10.5, kind = 'body', color = COLORS.ink, align = 'left', width, x, lineGap = 2.5 } =
      options;
    const useTelugu = hasTelugu(text);
    const chosen: FontKind = useTelugu ? 'telugu' : kind;
    this.font(chosen, useTelugu ? size + 0.5 : size);
    this.doc.fillColor(color);
    const textOptions: PDFKit.Mixins.TextOptions = {
      align,
      lineGap,
      lineBreak: options.lineBreak ?? true,
      continued: options.continued ?? false,
      ellipsis: options.ellipsis ?? false,
    };
    if (width !== undefined) textOptions.width = width;
    if (x !== undefined) {
      this.doc.text(text, x, this.doc.y, textOptions);
    } else {
      this.doc.text(text, textOptions);
    }
  }

  private newPage(): void {
    this.doc.addPage();
    this.pageNo += 1;
    this.doc.x = this.left;
    this.doc.y = this.top;
  }

  private ensureSpace(height: number): void {
    if (this.doc.y + height > this.pageHeight - this.bottom) {
      this.newPage();
    }
  }

  private record(key: string): void {
    this.pages.set(key, this.pageNo);
  }

  private rule(color = COLORS.border, width = 0.8): void {
    const y = this.doc.y;
    this.doc
      .moveTo(this.left, y)
      .lineTo(this.left + this.contentWidth, y)
      .lineWidth(width)
      .strokeColor(color)
      .stroke();
  }

  // ── title page ──────────────────────────────────────────────────────
  private drawTitlePage(): void {
    const doc = this.doc;
    const isCheat = this.kind === 'cheatsheet';
    const accent = doc
      .linearGradient(0, 0, this.pageWidth, this.pageHeight)
      .stop(0, '#a78bfa')
      .stop(0.5, '#3b82f6')
      .stop(1, '#22d3ee');

    // Left accent rail.
    doc.rect(0, 0, 9, this.pageHeight).fill(accent);

    // Soft background panel.
    doc.rect(9, 0, this.pageWidth - 9, 250).fill('#f8fafc');
    doc.rect(9, 250, this.pageWidth - 9, 2).fill(accent);

    this.drawLogo(this.left, 64, 58);

    doc.font('bold').fontSize(21).fillColor(COLORS.ink).text('TechTuxAcademy', this.left + 72, 70, {
      width: this.contentWidth - 72,
      lineBreak: false,
    });
    doc
      .font('body')
      .fontSize(9.5)
      .fillColor(COLORS.muted)
      .text('Learn. Build. Innovate.', this.left + 72, 96, {
        width: this.contentWidth - 72,
        lineBreak: false,
      });

    // Badge.
    const badgeLabel = isCheat ? 'COMMAND CHEAT SHEET' : 'LESSON NOTES';
    const badgeWidth = doc.font('bold').fontSize(8.5).widthOfString(badgeLabel) + 20;
    doc.roundedRect(this.left, 140, badgeWidth, 22, 11).fill(COLORS.accent);
    doc
      .font('bold')
      .fontSize(8.5)
      .fillColor('#ffffff')
      .text(badgeLabel, this.left + 10, 146, { lineBreak: false });

    // Title.
    const titleY = 205;
    doc.font('bold').fontSize(30).fillColor(COLORS.ink).text(this.plan.lesson.title, this.left, titleY, {
      width: this.contentWidth,
      lineGap: 2,
    });
    let cursor = doc.y + 6;

    if (this.plan.lesson.titleTe && hasTelugu(this.plan.lesson.titleTe)) {
      doc.font('telugu').fontSize(17).fillColor(COLORS.muted).text(this.plan.lesson.titleTe, this.left, cursor, {
        width: this.contentWidth,
      });
      cursor = doc.y + 4;
    }

    if (isCheat) {
      doc
        .font('body')
        .fontSize(11)
        .fillColor(COLORS.muted)
        .text(
          'Every command, flag and expected result from this lesson, organised for quick reference at the terminal.',
          this.left,
          cursor + 4,
          { width: this.contentWidth - 30 }
        );
      cursor = doc.y;
    }

    // Course / lesson metadata block.
    const metaY = Math.max(cursor + 26, 360);
    doc.roundedRect(this.left, metaY, this.contentWidth, 132, 8).fill('#ffffff').strokeColor(COLORS.border).lineWidth(1).stroke();
    doc.rect(this.left, metaY, 4, 132).fill(COLORS.accent2);

    let rowY = metaY + 16;
    const metaRow = (label: string, value: string) => {
      doc.font('bold').fontSize(8).fillColor(COLORS.faint).text(label.toUpperCase(), this.left + 18, rowY, {
        width: 90,
        lineBreak: false,
      });
      doc.font('body').fontSize(10.5).fillColor(COLORS.ink).text(value, this.left + 112, rowY - 1, {
        width: this.contentWidth - 130,
      });
      rowY = doc.y + 10;
    };
    metaRow('Course', this.plan.course.title);
    metaRow('Lesson', `${this.plan.lesson.order + 1} of ${this.plan.course.title}`);
    metaRow('Instructor', this.plan.course.instructor.name);
    metaRow('Level', this.plan.course.difficulty.charAt(0) + this.plan.course.difficulty.slice(1).toLowerCase());

    // Footer block.
    const footY = this.pageHeight - 150;
    doc.rect(this.left, footY, this.contentWidth, 1).fill(COLORS.border);
    doc
      .font('body')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        `Generated ${this.generatedLabel} · Version 1 · ${this.plan.course.category.name}`,
        this.left,
        footY + 12,
        { width: this.contentWidth }
      );
    doc
      .font('body')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        '© TechTuxAcademy. This resource is provided to enrolled learners for personal study. Do not redistribute.',
        this.left,
        footY + 28,
        { width: this.contentWidth }
      );
    doc
      .font('bold')
      .fontSize(9)
      .fillColor(COLORS.accent)
      .text('https://techtuxacademy.online', this.left, footY + 50, { width: this.contentWidth });

    this.doc.y = this.top;
  }

  private drawLogo(x: number, y: number, size: number): void {
    const doc = this.doc;
    const s = size / 64;
    const gradient = doc
      .linearGradient(x, y, x + size, y + size)
      .stop(0, '#a78bfa')
      .stop(0.5, '#3b82f6')
      .stop(1, '#22d3ee');

    doc.save();
    doc.roundedRect(x, y, size, size, 16 * s).fill('#0b0b14');
    doc.lineWidth(2 * s).strokeColor(gradient);
    doc.roundedRect(x, y, size, size, 16 * s).stroke();
    doc.lineWidth(5 * s).strokeColor(gradient).lineCap('round');
    doc.moveTo(x + 18 * s, y + 21 * s).lineTo(x + 46 * s, y + 21 * s).stroke();
    doc.moveTo(x + 32 * s, y + 21 * s).lineTo(x + 32 * s, y + 44 * s).stroke();
    doc.lineWidth(2 * s).strokeColor('#22d3ee');
    doc.moveTo(x + 32 * s, y + 33 * s).lineTo(x + 42 * s, y + 33 * s).lineTo(x + 42 * s, y + 42 * s).stroke();
    doc.fillColor('#22d3ee').circle(x + 18 * s, y + 21 * s, 3 * s).fill();
    doc.fillColor('#a78bfa').circle(x + 46 * s, y + 21 * s, 3 * s).fill();
    doc.fillColor('#3b82f6').circle(x + 32 * s, y + 44 * s, 3 * s).fill();
    doc.restore();
  }

  // ── table of contents ───────────────────────────────────────────────
  private reserveTocPages(): void {
    const lineHeight = 17;
    const usable = this.pageHeight - this.top - this.bottom - 90;
    const perPage = Math.max(1, Math.floor(usable / lineHeight));
    const pages = Math.max(1, Math.ceil(this.outline.length / perPage));
    for (let i = 0; i < pages; i++) this.newPage();
    // Content begins on a fresh page after the reserved TOC pages.
    this.newPage();
  }

  private fillToc(): void {
    const entries = this.outline.filter((entry) => this.pages.has(entry.key));
    if (!entries.length) return;
    let pageIndex = 1; // 0-based: page 2 is the first TOC page
    let y = this.top + 54;
    const lineHeight = 17;
    const bottom = this.pageHeight - this.bottom;

    this.doc.switchToPage(pageIndex);
    this.doc.font('bold').fontSize(20).fillColor(COLORS.ink).text('Table of Contents', this.left, this.top, {
      width: this.contentWidth,
      lineBreak: false,
    });
    this.doc.rect(this.left, this.top + 30, 42, 3).fill(COLORS.accent);

    for (const entry of entries) {
      if (y + lineHeight > bottom) {
        pageIndex += 1;
        y = this.top + 30;
        this.doc.switchToPage(pageIndex);
      }
      const pageNumber = this.pages.get(entry.key)!;
      const indent = entry.level === 2 ? 16 : 0;
      const size = entry.level === 2 ? 9.5 : 10.5;
      const color = entry.level === 2 ? COLORS.muted : COLORS.ink;
      const titleWidth = this.contentWidth - 44 - indent;
      this.font(entry.level === 2 ? 'body' : 'bold', size);
      this.doc.fillColor(color);
      const title = entry.title.length > 82 ? `${entry.title.slice(0, 79)}…` : entry.title;
      this.doc.text(title, this.left + indent, y, { width: titleWidth, lineBreak: false, ellipsis: true });
      const textWidth = Math.min(this.doc.widthOfString(title), titleWidth - 6);
      const dotStart = this.left + indent + textWidth + 5;
      const dotEnd = this.left + this.contentWidth - 34;
      if (dotEnd > dotStart) {
        this.doc
          .moveTo(dotStart, y + size * 0.75)
          .lineTo(dotEnd, y + size * 0.75)
          .lineWidth(0.5)
          .strokeColor('#cbd5e1')
          .stroke();
      }
      this.font('bold', 10);
      this.doc.fillColor(COLORS.ink);
      this.doc.text(String(pageNumber), this.left + this.contentWidth - 28, y, {
        width: 28,
        align: 'right',
        lineBreak: false,
      });
      y += lineHeight;
    }
  }

  // ── headings & text ─────────────────────────────────────────────────
  private heading1(title: string, key?: string): void {
    this.ensureSpace(74);
    const y = this.doc.y + 8;
    this.doc.rect(this.left, y, 4, 23).fill(COLORS.accent);
    this.doc.font('bold').fontSize(18).fillColor(COLORS.ink).text(title, this.left + 12, y, {
      width: this.contentWidth - 12,
    });
    this.doc.y = Math.max(this.doc.y, y + 27);
    this.doc.moveDown(0.25);
    this.rule();
    this.doc.moveDown(0.7);
    if (key) this.record(key);
  }

  private heading2(title: string, key?: string): void {
    this.ensureSpace(52);
    this.doc.moveDown(0.3);
    this.font('bold', 13);
    this.doc.fillColor(COLORS.accent2).text(title, this.left, this.doc.y, { width: this.contentWidth });
    this.doc.moveDown(0.35);
    if (key) this.record(key);
  }

  private paragraph(text: string, options: WriteOptions = {}): void {
    if (!text) return;
    this.ensureSpace(24);
    this.write(text, { size: 10.5, lineGap: 2.6, ...options });
    this.doc.moveDown(0.45);
  }

  private bullets(items: string[], options: { color?: string; size?: number } = {}): void {
    const size = options.size ?? 10.5;
    for (const item of items) {
      this.ensureSpace(22);
      const startY = this.doc.y;
      this.doc.fillColor(options.color ?? COLORS.accent).circle(this.left + 4, startY + 5.4, 2).fill();
      this.write(item, { x: this.left + 14, width: this.contentWidth - 14, size, lineGap: 2.2 });
      this.doc.moveDown(0.22);
    }
    this.doc.moveDown(0.2);
  }

  private numbered(items: string[]): void {
    items.forEach((item, index) => {
      this.ensureSpace(24);
      const startY = this.doc.y;
      this.font('bold', 9.5);
      this.doc.fillColor(COLORS.accent).text(String(index + 1).padStart(2, '0'), this.left, startY + 1, {
        width: 20,
        lineBreak: false,
      });
      this.write(item, { x: this.left + 24, width: this.contentWidth - 24, size: 10.5, lineGap: 2.2 });
      this.doc.moveDown(0.3);
    });
    this.doc.moveDown(0.2);
  }

  private callout(
    title: string | null,
    lines: string[],
    tone: { color: string; background: string }
  ): void {
    if (!lines.length && !title) return;
    const padding = 11;
    const innerWidth = this.contentWidth - padding * 2 - 6;
    const titleHeight = title ? 18 : 0;
    this.font('body', 10);
    let bodyHeight = 0;
    for (const line of lines) {
      bodyHeight += this.doc.heightOfString(line, { width: innerWidth, lineGap: 2 }) + 4;
    }
    const total = padding * 2 + titleHeight + bodyHeight;
    this.ensureSpace(total + 12);
    const y = this.doc.y;
    this.doc.roundedRect(this.left, y, this.contentWidth, total, 6).fill(tone.background);
    this.doc.rect(this.left, y, 4, total).fill(tone.color);
    let cursor = y + padding;
    if (title) {
      this.font('bold', 11);
      this.doc.fillColor(tone.color).text(title, this.left + padding + 5, cursor, {
        width: innerWidth,
        lineBreak: false,
      });
      cursor += titleHeight;
    }
    for (const line of lines) {
      this.write(line, { x: this.left + padding + 5, width: innerWidth, size: 10, lineGap: 2 });
      cursor = this.doc.y + 4;
      this.doc.y = cursor;
    }
    this.doc.y = y + total + 10;
  }

  private table(headers: string[], rows: string[][], widths?: number[]): void {
    if (!rows.length) return;
    const padding = 6;
    const colWidths =
      widths && widths.length === headers.length
        ? widths.map((width) => width * this.contentWidth)
        : headers.map(() => this.contentWidth / headers.length);
    const fontSize = 8.8;

    const drawHeader = (top: number): number => {
      this.doc.rect(this.left, top, this.contentWidth, 23).fill('#e2e8f0');
      let x = this.left;
      headers.forEach((header, index) => {
        this.font('bold', 8.8);
        this.doc.fillColor(COLORS.ink).text(header, x + padding, top + 7, {
          width: colWidths[index] - padding * 2,
          lineBreak: false,
          ellipsis: true,
        });
        x += colWidths[index];
      });
      return top + 23;
    };

    this.ensureSpace(50);
    let y = drawHeader(this.doc.y);
    rows.forEach((row, rowIndex) => {
      this.font('body', fontSize);
      const heights = row.map((cell, index) =>
        this.doc.heightOfString(cell, { width: colWidths[index] - padding * 2, lineGap: 1.5 })
      );
      const rowHeight = Math.max(...heights, fontSize) + padding * 2;
      if (y + rowHeight > this.pageHeight - this.bottom) {
        this.newPage();
        y = drawHeader(this.doc.y);
      }
      if (rowIndex % 2 === 1) {
        this.doc.rect(this.left, y, this.contentWidth, rowHeight).fill(COLORS.panelAlt);
      }
      let x = this.left;
      row.forEach((cell, index) => {
        this.font('body', fontSize);
        this.doc.fillColor(COLORS.ink).text(cell, x + padding, y + padding, {
          width: colWidths[index] - padding * 2,
          lineGap: 1.5,
        });
        x += colWidths[index];
      });
      this.doc
        .moveTo(this.left, y + rowHeight)
        .lineTo(this.left + this.contentWidth, y + rowHeight)
        .lineWidth(0.5)
        .strokeColor(COLORS.border)
        .stroke();
      y += rowHeight;
    });

    this.doc.y = y + 10;
  }

  private codeBlock(block: CodeBlock): void {
    const padding = 10;
    const size = 8.2;
    const innerWidth = this.contentWidth - padding * 2;
    this.font('mono', size);
    const codeHeight = this.doc.heightOfString(block.code, { width: innerWidth, lineGap: 1 });
    const titleHeight = block.title ? 17 : 0;
    const total = padding * 2 + titleHeight + codeHeight;
    this.ensureSpace(Math.min(total + 14, this.pageHeight - this.top - this.bottom));
    const y = this.doc.y;
    this.doc.roundedRect(this.left, y, this.contentWidth, total, 5).fill(COLORS.codeBg);
    let cursor = y + padding;
    if (block.title) {
      this.font('monoBold', 9);
      this.doc.fillColor(COLORS.codeTitle).text(block.title, this.left + padding, cursor, {
        width: innerWidth,
        lineBreak: false,
        ellipsis: true,
      });
      cursor += titleHeight;
    }
    this.font('mono', size);
    this.doc.fillColor(COLORS.codeText).text(block.code, this.left + padding, cursor, {
      width: innerWidth,
      lineGap: 1,
    });
    this.doc.y = y + total + 8;
    if (block.explanation?.length) {
      for (const line of block.explanation) {
        this.write(line, { x: this.left + 4, width: this.contentWidth - 4, size: 9, color: COLORS.muted, lineGap: 1.5 });
        this.doc.moveDown(0.1);
      }
      this.doc.moveDown(0.2);
    }
  }

  private formulaBlock(formula: FormulaSpec): void {
    const padding = 10;
    const innerWidth = this.contentWidth - padding * 2;
    this.font('body', 10);
    const formulaHeight = this.doc.heightOfString(formula.formula, { width: innerWidth, lineGap: 2 });
    const explanationHeight = this.doc.heightOfString(formula.explanation, { width: innerWidth, lineGap: 2 });
    const total = padding * 2 + 16 + formulaHeight + explanationHeight + 8;
    this.ensureSpace(total + 10);
    const y = this.doc.y;
    this.doc.roundedRect(this.left, y, this.contentWidth, total, 6).fill(COLORS.panel);
    this.doc.rect(this.left, y, 4, total).fill(COLORS.accent3);
    this.font('bold', 10.5);
    this.doc.fillColor(COLORS.ink).text(formula.name, this.left + padding + 4, y + padding, {
      width: innerWidth,
      lineBreak: false,
    });
    this.font('mono', 10.5);
    this.doc.fillColor(COLORS.accent).text(formula.formula, this.left + padding + 4, y + padding + 17, {
      width: innerWidth,
      lineGap: 2,
    });
    this.font('body', 9.5);
    this.doc.fillColor(COLORS.muted).text(
      formula.explanation,
      this.left + padding + 4,
      this.doc.y + 4,
      { width: innerWidth, lineGap: 2 }
    );
    this.doc.y = y + total + 10;
  }

  private diagramBlock(diagram: DiagramSpec): void {
    const height = 150;
    this.ensureSpace(height + 34);
    const y = this.doc.y;
    this.doc.roundedRect(this.left, y, this.contentWidth, height, 8).fill('#ffffff');
    this.doc.roundedRect(this.left, y, this.contentWidth, height, 8).lineWidth(1).strokeColor(COLORS.border).stroke();
    this.font('bold', 9.5);
    this.doc.fillColor(COLORS.muted).text(diagram.title, this.left + 12, y + 10, {
      width: this.contentWidth - 24,
      lineBreak: false,
      ellipsis: true,
    });
    this.drawDiagram(diagram.kind, this.left + 18, y + 34, this.contentWidth - 36, height - 48);
    this.doc.y = y + height + 6;
    if (diagram.caption) {
      this.write(diagram.caption, { x: this.left, width: this.contentWidth, size: 9, color: COLORS.muted, lineGap: 1.5 });
      this.doc.moveDown(0.5);
    } else {
      this.doc.moveDown(0.4);
    }
  }

  private drawDiagram(
    kind: DiagramSpec['kind'],
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const drawBox = (
      bx: number,
      by: number,
      bw: number,
      bh: number,
      label: string,
      fill = COLORS.panel,
      stroke = COLORS.border
    ) => {
      this.doc.roundedRect(bx, by, bw, bh, 5).fill(fill);
      this.doc.roundedRect(bx, by, bw, bh, 5).lineWidth(1).strokeColor(stroke).stroke();
      this.font('bold', 8);
      this.doc.fillColor(COLORS.ink).text(label, bx + 4, by + bh / 2 - 5, {
        width: bw - 8,
        align: 'center',
        lineBreak: false,
        ellipsis: true,
      });
    };
    const arrow = (x1: number, y1: number, x2: number, y2: number) => {
      this.doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(1.4).strokeColor(COLORS.accent).stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = 5;
      this.doc
        .moveTo(x2, y2)
        .lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6))
        .lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6))
        .closePath()
        .fill(COLORS.accent);
    };

    if (kind === 'layers') {
      const labels = ['Interface', 'Application logic', 'Runtime & services', 'Foundation'];
      const bandHeight = height / labels.length - 4;
      labels.forEach((label, index) => {
        const by = y + index * (bandHeight + 4);
        this.doc.rect(x, by, width, bandHeight).fill(index % 2 ? COLORS.panel : COLORS.panelAlt);
        this.doc.rect(x, by, width, bandHeight).lineWidth(0.8).strokeColor(COLORS.border).stroke();
        this.font('bold', 8.5);
        this.doc.fillColor(COLORS.ink).text(label, x + 10, by + bandHeight / 2 - 5, {
          width: width - 20,
          lineBreak: false,
        });
      });
      return;
    }

    if (kind === 'pipeline' || kind === 'rtl-flow') {
      const labels =
        kind === 'pipeline'
          ? ['Input', 'Process', 'Validate', 'Output']
          : ['RTL', 'Simulate', 'Synthesize', 'Layout'];
      const boxWidth = width / 4 - 8;
      labels.forEach((label, index) => {
        const bx = x + index * (boxWidth + 10);
        drawBox(bx, y + height / 2 - 18, boxWidth, 36, label, index === 1 ? '#dbeafe' : COLORS.panel);
        if (index < labels.length - 1) arrow(bx + boxWidth + 1, y + height / 2, bx + boxWidth + 9, y + height / 2);
      });
      return;
    }

    if (kind === 'client-server') {
      const labels = ['Client', 'API', 'Data store'];
      const boxWidth = width / 3 - 14;
      labels.forEach((label, index) => {
        const bx = x + index * (boxWidth + 20);
        drawBox(bx, y + height / 2 - 22, boxWidth, 44, label, index === 1 ? '#dbeafe' : COLORS.panel);
        if (index < 2) arrow(bx + boxWidth + 2, y + height / 2, bx + boxWidth + 18, y + height / 2);
      });
      return;
    }

    if (kind === 'network') {
      const labels = ['Application', 'Transport', 'Internet', 'Link'];
      const bandHeight = height / labels.length - 3;
      labels.forEach((label, index) => {
        const by = y + index * (bandHeight + 3);
        drawBox(x, by, width, bandHeight, label, index % 2 ? COLORS.panelAlt : COLORS.panel);
      });
      return;
    }

    if (kind === 'filesystem') {
      const labels = ['/', '/etc', '/var', '/home'];
      const boxWidth = width / 4 - 8;
      labels.forEach((label, index) => {
        const bx = x + index * (boxWidth + 10);
        drawBox(bx, y + 12, boxWidth, 34, label, index === 0 ? '#dbeafe' : COLORS.panel);
        this.doc
          .moveTo(x + width / 2, y + 4)
          .lineTo(bx + boxWidth / 2, y + 12)
          .lineWidth(1)
          .strokeColor(COLORS.border)
          .stroke();
      });
      return;
    }

    if (kind === 'stack-heap') {
      drawBox(x, y + 10, width / 2 - 8, height - 20, 'Stack', COLORS.panel);
      drawBox(x + width / 2 + 8, y + 10, width / 2 - 8, height - 20, 'Heap', COLORS.panelAlt);
      arrow(x + width / 2 + 2, y + height / 2, x + width / 2 + 6, y + height / 2);
      return;
    }

    if (kind === 'timeline') {
      const lineY = y + height / 2;
      this.doc.moveTo(x + 10, lineY).lineTo(x + width - 10, lineY).lineWidth(2).strokeColor(COLORS.border).stroke();
      const labels = ['Start', 'Checkpoint', 'Action', 'Result'];
      labels.forEach((label, index) => {
        const cx = x + 10 + (index * (width - 20)) / (labels.length - 1);
        this.doc.fillColor(COLORS.accent).circle(cx, lineY, 4).fill();
        this.font('bold', 8);
        this.doc.fillColor(COLORS.ink).text(label, cx - 40, lineY + 10, {
          width: 80,
          align: 'center',
          lineBreak: false,
        });
      });
      return;
    }

    if (kind === 'circuit') {
      drawBox(x + 10, y + height / 2 - 16, width / 4, 32, 'Source');
      drawBox(x + width / 2 - 40, y + height / 2 - 16, 80, 32, 'Component', '#dbeafe');
      drawBox(x + width - width / 4 - 10, y + height / 2 - 16, width / 4, 32, 'Ground');
      arrow(x + 10 + width / 4, y + height / 2, x + width / 2 - 42, y + height / 2);
      arrow(x + width / 2 + 42, y + height / 2, x + width - width / 4 - 12, y + height / 2);
      return;
    }

    // generic / flow
    const labels = kind === 'flow' ? ['Start', 'Action', 'Decision', 'Result'] : ['Concept', 'Apply', 'Verify', 'Share'];
    const boxWidth = width / 2 - 10;
    const boxHeight = height / 2 - 8;
    labels.forEach((label, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const bx = x + col * (boxWidth + 20);
      const by = y + row * (boxHeight + 14);
      drawBox(bx, by, boxWidth, boxHeight, label, index === 2 ? '#dbeafe' : COLORS.panel);
      if (index < labels.length - 1) {
        const nx = x + ((index + 1) % 2) * (boxWidth + 20);
        const ny = y + Math.floor((index + 1) / 2) * (boxHeight + 14);
        arrow(
          bx + (col === 0 ? boxWidth : 0),
          by + boxHeight / 2,
          nx + (col === 0 ? 0 : boxWidth),
          ny + boxHeight / 2
        );
      }
    });
  }

  // ── chrome ──────────────────────────────────────────────────────────
  private applyChrome(): void {
    const total = this.pageNo;
    const footerY = this.pageHeight - 44;
    for (let index = 1; index < total; index++) {
      this.doc.switchToPage(index);
      const pageNumber = index + 1;
      this.doc
        .moveTo(this.left, 36)
        .lineTo(this.left + this.contentWidth, 36)
        .lineWidth(0.5)
        .strokeColor(COLORS.border)
        .stroke();
      this.font('body', 7.5);
      this.doc.fillColor(COLORS.muted).text('TechTuxAcademy', this.left, 24, {
        width: this.contentWidth / 2,
        lineBreak: false,
      });
      this.doc.fillColor(COLORS.faint).text(this.headerLabel, this.left + this.contentWidth / 2, 24, {
        width: this.contentWidth / 2,
        align: 'right',
        lineBreak: false,
        ellipsis: true,
      });

      this.doc
        .moveTo(this.left, footerY - 8)
        .lineTo(this.left + this.contentWidth, footerY - 8)
        .lineWidth(0.5)
        .strokeColor(COLORS.border)
        .stroke();
      this.doc.fillColor(COLORS.muted).text(
        `Generated ${this.generatedLabel} · © ${new Date().getFullYear()} TechTuxAcademy`,
        this.left,
        footerY,
        { width: this.contentWidth * 0.7, lineBreak: false, ellipsis: true }
      );
      this.doc.fillColor(COLORS.ink).text(`Page ${pageNumber} of ${total}`, this.left + this.contentWidth * 0.7, footerY, {
        width: this.contentWidth * 0.3,
        align: 'right',
        lineBreak: false,
      });
    }
  }

  // ── renderers ───────────────────────────────────────────────────────
  renderNotes(): void {
    const plan = this.plan;

    this.heading1('Introduction', 'introduction');
    plan.introduction.forEach((text) => this.paragraph(text));

    this.heading1('Learning Objectives', 'objectives');
    this.bullets(plan.objectives);

    this.heading1('Prerequisites', 'prerequisites');
    this.bullets(plan.prerequisites, { color: COLORS.accent2 });

    this.heading1('Key Concepts', 'concepts');
    plan.concepts.forEach((concept, index) => {
      this.renderConcept(concept, `concept-${index}`);
    });

    this.heading1('Step-by-Step Guide', 'steps');
    this.numbered(plan.steps);

    if (plan.formulas.length) {
      this.heading1('Formulas & Calculations', 'formulas');
      plan.formulas.forEach((formula) => this.formulaBlock(formula));
    }

    if (plan.diagrams.length) {
      this.heading1('Diagrams', 'diagrams');
      plan.diagrams.forEach((diagram) => this.diagramBlock(diagram));
    }

    this.heading1('Worked Examples', 'examples');
    this.bullets(plan.examples);

    this.heading1('Real-World Applications', 'applications');
    this.bullets(plan.applications, { color: COLORS.accent3 });

    if (plan.commands.length) {
      this.heading1('Command Reference', 'commands');
      this.renderCommandReference(plan.commands);
    }

    if (plan.mistakes.length) {
      this.heading1('Common Mistakes', 'mistakes');
      this.callout(
        'Avoid these traps',
        plan.mistakes,
        { color: COLORS.warning, background: COLORS.warningBg }
      );
    }

    if (plan.troubleshooting.length) {
      this.heading1('Troubleshooting', 'troubleshooting');
      this.table(
        ['Problem', 'What to do'],
        plan.troubleshooting.map((item) => [item.problem, item.fix]),
        [0.42, 0.58]
      );
    }

    this.heading1('Key Points', 'key-points');
    this.callout(
      'Remember',
      plan.importantPoints,
      { color: COLORS.success, background: COLORS.successBg }
    );

    this.heading1('Summary', 'summary');
    plan.summary.forEach((text) => this.paragraph(text));

    if (plan.practice.length) {
      this.heading1('Practice Exercises', 'practice');
      this.numbered(plan.practice);
    }

    if (plan.interview.length) {
      this.heading1('Interview Questions', 'interview');
      this.numbered(plan.interview);
    }

    if (plan.references.length) {
      this.heading1('References', 'references');
      this.renderReferences(plan.references);
    }

    if (plan.teluguSummary?.length) {
      this.heading1('Telugu Summary · తెలుగు సారాంశం', 'telugu');
      plan.teluguSummary.forEach((text) => this.paragraph(text));
    }
  }

  private renderConcept(concept: ConceptSpec, key: string): void {
    this.heading2(concept.term, key);
    this.callout(null, [concept.definition], { color: COLORS.accent2, background: COLORS.panel });
    concept.paragraphs.forEach((text) => this.paragraph(text));
    if (concept.formulas?.length) {
      concept.formulas.forEach((formula) => this.formulaBlock(formula));
    }
    if (concept.diagram) {
      this.diagramBlock(concept.diagram);
    }
    if (concept.code?.length) {
      concept.code.forEach((block) => this.codeBlock(block));
    }
    if (concept.mistakes?.length) {
      this.callout('Watch out', concept.mistakes, {
        color: COLORS.warning,
        background: COLORS.warningBg,
      });
    }
    if (concept.troubleshooting?.length) {
      this.table(
        ['Symptom', 'Resolution'],
        concept.troubleshooting.map((item) => [item.problem, item.fix]),
        [0.42, 0.58]
      );
    }
  }

  private renderCommandReference(commands: CommandSpec[]): void {
    const categories = Array.from(new Set(commands.map((command) => command.category)));
    categories.forEach((category) => {
      this.heading2(category);
      const inCategory = commands.filter((command) => command.category === category);
      this.table(
        ['Command', 'What it does'],
        inCategory.map((command) => [command.command, command.description]),
        [0.36, 0.64]
      );
      inCategory.forEach((command) => {
        if (command.syntax) {
          this.font('mono', 8.8);
          this.doc.fillColor(COLORS.muted).text(`Syntax: ${command.syntax}`, this.left, this.doc.y, {
            width: this.contentWidth,
            lineGap: 1.5,
          });
          this.doc.moveDown(0.2);
        }
        command.examples.slice(0, 2).forEach((example) => {
          this.codeBlock({
            language: 'bash',
            title: command.command,
            code: `$ ${example.command}`,
          });
          if (example.note) this.paragraph(example.note, { size: 9, color: COLORS.muted });
        });
      });
    });
  }

  private renderReferences(references: { title: string; url: string; note?: string }[]): void {
    references.forEach((reference) => {
      this.ensureSpace(30);
      this.font('bold', 10);
      this.doc.fillColor(COLORS.ink).text(reference.title, this.left, this.doc.y, {
        width: this.contentWidth,
      });
      this.font('body', 9);
      this.doc.fillColor(COLORS.accent).text(reference.url, this.left, this.doc.y, {
        width: this.contentWidth,
        lineBreak: true,
      });
      if (reference.note) {
        this.doc.fillColor(COLORS.muted).text(reference.note, this.left, this.doc.y, {
          width: this.contentWidth,
          lineGap: 1.5,
        });
      }
      this.doc.moveDown(0.5);
    });
  }

  renderCheatSheet(): void {
    const plan = this.plan;
    const commands = plan.commands;
    const categories = Array.from(new Set(commands.map((command) => command.category)));

    this.heading1('About This Cheat Sheet', 'about');
    this.paragraph(
      `This cheat sheet collects the commands used in "${plan.lesson.title}", part of ${plan.course.title}. Each entry shows the syntax, purpose, useful flags and at least one worked example.`
    );
    this.paragraph(
      'Commands are grouped by task. Copy them exactly, replace placeholder paths and names with values from your own environment, and prefer a dry run or read-only check before any destructive action.'
    );
    this.callout(
      'How to read the examples',
      [
        'A line beginning with $ is a shell command. Do not type the $ itself.',
        'Placeholders such as <path>, <user> or <device> must be replaced with real values.',
        'When an expected output is shown, compare the shape of your output rather than every byte; versions and environments differ.',
      ],
      { color: COLORS.accent, background: COLORS.panel }
    );

    this.heading1('Commands by Category', 'categories');
    categories.forEach((category, categoryIndex) => {
      this.heading2(category, `category-${categoryIndex}`);
      const inCategory = commands.filter((command) => command.category === category);
      this.table(
        ['Command', 'Syntax', 'Purpose'],
        inCategory.map((command) => [command.command, command.syntax || command.command, command.description]),
        [0.24, 0.3, 0.46]
      );

      inCategory.forEach((command) => {
        this.ensureSpace(40);
        this.font('monoBold', 10);
        this.doc.fillColor(COLORS.accent).text(command.command, this.left, this.doc.y, {
          width: this.contentWidth,
        });
        this.doc.moveDown(0.2);
        this.paragraph(command.description, { size: 9.8, color: COLORS.ink });

        if (command.flags?.length) {
          this.font('bold', 9);
          this.doc.fillColor(COLORS.muted).text('Useful flags', this.left, this.doc.y, {
            width: this.contentWidth,
          });
          this.doc.moveDown(0.2);
          command.flags.forEach((flag) => {
            this.ensureSpace(18);
            this.font('mono', 8.8);
            this.doc.fillColor(COLORS.accent2).text(flag.flag, this.left + 8, this.doc.y, {
              width: 70,
              lineBreak: false,
            });
            this.font('body', 9.2);
            this.doc.fillColor(COLORS.ink).text(flag.description, this.left + 82, this.doc.y, {
              width: this.contentWidth - 82,
              lineGap: 1.5,
            });
            this.doc.moveDown(0.15);
          });
          this.doc.moveDown(0.2);
        }

        command.examples.forEach((example) => {
          this.codeBlock({
            language: 'bash',
            title: 'Example',
            code: `$ ${example.command}`,
          });
          if (example.output) {
            this.codeBlock({
              language: 'text',
              title: 'Expected output',
              code: example.output,
            });
          } else {
            this.paragraph(
              'Expected result: the command completes successfully (exit status 0). Inspect the output for the values described above; the exact formatting varies by version and environment.',
              { size: 8.8, color: COLORS.muted }
            );
          }
          if (example.note) {
            this.paragraph(example.note, { size: 8.8, color: COLORS.muted });
          }
        });

        if (command.warnings?.length) {
          this.callout('Caution', command.warnings, {
            color: COLORS.danger,
            background: COLORS.dangerBg,
          });
        }
      });
    });

    this.heading1('Quick Reference Table', 'quick-reference');
    this.table(
      ['Command', 'Purpose', 'Category'],
      commands.map((command) => [command.command, command.description, command.category]),
      [0.32, 0.48, 0.2]
    );

    if (plan.troubleshooting.length) {
      this.heading1('Common Errors & Troubleshooting', 'troubleshooting');
      this.table(
        ['Error or symptom', 'Fix'],
        plan.troubleshooting.map((item) => [item.problem, item.fix]),
        [0.42, 0.58]
      );
    }

    const warnings = commands.flatMap((command) => command.warnings || []);
    if (warnings.length) {
      this.heading1('Safety Notes', 'safety');
      this.callout('Before you run these commands', warnings, {
        color: COLORS.danger,
        background: COLORS.dangerBg,
      });
    }

    this.heading1('Related Resources', 'related');
    this.bullets([
      `Full lesson notes for "${plan.lesson.title}" are available as a separate PDF.`,
      `Revisit the course page for the lesson video: https://techtuxacademy.online/courses/${plan.course.slug}`,
      'Use the practice exercises in the lesson notes to turn recognition into recall.',
    ]);
  }

  async finish(): Promise<PdfResult> {
    this.fillToc();
    this.applyChrome();
    const pageCount = this.pageNo;
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);
      this.doc.end();
    });
    return { buffer, pageCount };
  }
}

function buildNotesOutline(plan: LessonContentPlan): OutlineEntry[] {
  const outline: OutlineEntry[] = [
    { key: 'introduction', title: 'Introduction', level: 1 },
    { key: 'objectives', title: 'Learning Objectives', level: 1 },
    { key: 'prerequisites', title: 'Prerequisites', level: 1 },
    { key: 'concepts', title: 'Key Concepts', level: 1 },
  ];
  plan.concepts.forEach((concept, index) => {
    outline.push({ key: `concept-${index}`, title: concept.term, level: 2 });
  });
  outline.push({ key: 'steps', title: 'Step-by-Step Guide', level: 1 });
  if (plan.formulas.length) outline.push({ key: 'formulas', title: 'Formulas & Calculations', level: 1 });
  if (plan.diagrams.length) outline.push({ key: 'diagrams', title: 'Diagrams', level: 1 });
  outline.push({ key: 'examples', title: 'Worked Examples', level: 1 });
  outline.push({ key: 'applications', title: 'Real-World Applications', level: 1 });
  if (plan.commands.length) outline.push({ key: 'commands', title: 'Command Reference', level: 1 });
  if (plan.mistakes.length) outline.push({ key: 'mistakes', title: 'Common Mistakes', level: 1 });
  if (plan.troubleshooting.length)
    outline.push({ key: 'troubleshooting', title: 'Troubleshooting', level: 1 });
  outline.push({ key: 'key-points', title: 'Key Points', level: 1 });
  outline.push({ key: 'summary', title: 'Summary', level: 1 });
  if (plan.practice.length) outline.push({ key: 'practice', title: 'Practice Exercises', level: 1 });
  if (plan.interview.length) outline.push({ key: 'interview', title: 'Interview Questions', level: 1 });
  if (plan.references.length) outline.push({ key: 'references', title: 'References', level: 1 });
  if (plan.teluguSummary?.length)
    outline.push({ key: 'telugu', title: 'Telugu Summary', level: 1 });
  return outline;
}

function buildCheatSheetOutline(plan: LessonContentPlan): OutlineEntry[] {
  const categories = Array.from(new Set(plan.commands.map((command) => command.category)));
  const outline: OutlineEntry[] = [
    { key: 'about', title: 'About This Cheat Sheet', level: 1 },
    { key: 'categories', title: 'Commands by Category', level: 1 },
  ];
  categories.forEach((category, index) => {
    outline.push({ key: `category-${index}`, title: category, level: 2 });
  });
  outline.push({ key: 'quick-reference', title: 'Quick Reference Table', level: 1 });
  if (plan.troubleshooting.length)
    outline.push({ key: 'troubleshooting', title: 'Common Errors & Troubleshooting', level: 1 });
  const warnings = plan.commands.flatMap((command) => command.warnings || []);
  if (warnings.length) outline.push({ key: 'safety', title: 'Safety Notes', level: 1 });
  outline.push({ key: 'related', title: 'Related Resources', level: 1 });
  return outline;
}

export async function renderLessonNotes(plan: LessonContentPlan): Promise<PdfResult> {
  const pdf = new ResourcePdf(plan, 'notes', buildNotesOutline(plan));
  pdf.renderNotes();
  return pdf.finish();
}

export async function renderCommandCheatSheet(plan: LessonContentPlan): Promise<PdfResult> {
  const pdf = new ResourcePdf(plan, 'cheatsheet', buildCheatSheetOutline(plan));
  pdf.renderCheatSheet();
  return pdf.finish();
}
