import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { config } from '../../config';

export function storageRoot(): string {
  return config.resourceStorageDir;
}

export function courseResourceDir(courseSlug: string): string {
  return path.join(storageRoot(), 'course-resources', safeSegment(courseSlug));
}

export function lessonResourceDir(courseSlug: string, lessonSlug: string): string {
  return path.join(courseResourceDir(courseSlug), safeSegment(lessonSlug));
}

export function absoluteResourcePath(relativePath: string): string {
  const root = storageRoot();
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(path.resolve(root) + path.sep) && resolved !== path.resolve(root)) {
    throw new Error('Resource path escapes the storage directory.');
  }
  return resolved;
}

export function relativeResourcePath(absolutePath: string): string {
  return path.relative(storageRoot(), absolutePath).split(path.sep).join('/');
}

function safeSegment(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'resource';
}

export async function ensureDir(dir: string): Promise<void> {
  await fsp.mkdir(dir, { recursive: true });
}

export async function writeResourceFile(absolutePath: string, buffer: Buffer): Promise<void> {
  await ensureDir(path.dirname(absolutePath));
  await fsp.writeFile(absolutePath, buffer);
}

export async function readResourceFile(absolutePath: string): Promise<Buffer> {
  return fsp.readFile(absolutePath);
}

export async function deleteResourceFile(absolutePath: string): Promise<void> {
  try {
    await fsp.unlink(absolutePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }
}

export async function removeEmptyLessonDir(courseSlug: string, lessonSlug: string): Promise<void> {
  const dir = lessonResourceDir(courseSlug, lessonSlug);
  try {
    const entries = await fsp.readdir(dir);
    if (entries.length === 0) await fsp.rmdir(dir);
  } catch {
    // Directory may not exist; nothing to clean up.
  }
}

export function resourceFileExists(absolutePath: string): boolean {
  try {
    return fs.statSync(absolutePath).isFile();
  } catch {
    return false;
  }
}

export function ensureStorageRootSync(): void {
  fs.mkdirSync(storageRoot(), { recursive: true });
}
