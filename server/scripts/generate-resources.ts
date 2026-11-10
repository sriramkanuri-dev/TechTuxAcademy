/**
 * Generate lesson notes + command cheat sheets for every lesson.
 *
 * Usage (from the repo root):
 *   npm run resources:generate-all -w server
 *   npm run resources:generate-all -w server -- --course <courseIdOrSlug>
 *   npm run resources:generate-all -w server -- --lesson <lessonId> --force
 *
 * Runs with bounded concurrency so it is safe to execute from a Render Shell
 * after the first deploy. Generated files go to RESOURCE_STORAGE_DIR.
 */
import 'dotenv/config';
import fs from 'fs';
import { prisma } from '../src/db';
import { generateLessonResources } from '../src/services/resources/generator';
import {
  absoluteResourcePath,
  ensureStorageRootSync,
} from '../src/services/resources/storage';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  ensureStorageRootSync();
  const courseRef = arg('course');
  const lessonId = arg('lesson');
  const force = hasFlag('force');
  const concurrency = Math.min(
    4,
    Math.max(1, Number(process.env.RESOURCE_GENERATION_CONCURRENCY || 2))
  );

  const course = courseRef
    ? await prisma.course.findFirst({
        where: { OR: [{ id: courseRef }, { slug: courseRef }] },
        select: { id: true, title: true },
      })
    : null;
  if (courseRef && !course) {
    throw new Error(`Course not found: ${courseRef}`);
  }

  const lessons = await prisma.lesson.findMany({
    where: lessonId ? { id: lessonId } : course ? { courseId: course.id } : undefined,
    select: { id: true, title: true, course: { select: { title: true } } },
    orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
  });

  if (!lessons.length) {
    console.log('No lessons matched. Nothing to generate.');
    return;
  }

  console.log(
    `Generating resources for ${lessons.length} lesson(s)` +
      (course ? ` in "${course.title}"` : '') +
      ` with concurrency ${concurrency}…\n`
  );

  let cursor = 0;
  let generated = 0;
  let skipped = 0;
  const failures: { lesson: string; error: string }[] = [];

  async function worker() {
    while (cursor < lessons.length) {
      const lesson = lessons[cursor++];
      try {
        const result = await generateLessonResources(lesson.id, { force });
        generated += result.generated.length;
        skipped += result.skipped.length;
        if (result.failed.length) {
          for (const failure of result.failed) {
            failures.push({
              lesson: lesson.title,
              error: `${failure.resourceType}: ${failure.error}`,
            });
          }
        }
        const mark = result.failed.length ? '!' : result.generated.length ? '✓' : '·';
        console.log(
          `  ${mark} ${lesson.course.title} → ${lesson.title}` +
            ` (${result.generated.length} generated, ${result.skipped.length} up to date)`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ lesson: lesson.title, error: message });
        console.error(`  ✗ ${lesson.title}: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Validate every READY record points at a real, well-formed PDF.
  const records = await prisma.lessonResource.findMany({
    where: {
      status: 'READY',
      lesson: lessonId ? { id: lessonId } : course ? { courseId: course.id } : undefined,
    },
    select: { fileName: true, storagePath: true, fileSize: true },
  });
  let invalid = 0;
  for (const record of records) {
    const absolute = absoluteResourcePath(record.storagePath);
    const buffer = fs.existsSync(absolute) ? fs.readFileSync(absolute) : null;
    const ok =
      buffer &&
      buffer.length > 1000 &&
      buffer.subarray(0, 5).toString('latin1') === '%PDF-' &&
      buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1').includes('%%EOF');
    if (!ok) {
      invalid += 1;
      console.error(`  ✗ Invalid PDF: ${record.fileName} (${record.storagePath})`);
    }
  }

  console.log('');
  console.log(`Generated ${generated} file(s); ${skipped} already up to date.`);
  console.log(`Validated ${records.length} PDF(s); ${invalid} invalid.`);
  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    for (const failure of failures) console.error(`  - ${failure.lesson}: ${failure.error}`);
  }

  await prisma.$disconnect();
  if (failures.length || invalid) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
