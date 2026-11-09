export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 90);
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base) || `item-${Date.now()}`;
  let candidate = root;
  let counter = 2;
  // Bounded loop; extremely unlikely to run long.
  while (await exists(candidate)) {
    candidate = `${root}-${counter++}`;
  }
  return candidate;
}
