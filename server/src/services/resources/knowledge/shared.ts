import type {
  CodeBlock,
  CommandExample,
  CommandSpec,
  ConceptSpec,
  DiagramSpec,
  FormulaSpec,
  ReferenceSpec,
  TroubleshootingItem,
} from '../types';

export interface MatchContext {
  courseHaystack: string;
  lessonHaystack: string;
  haystack: string;
  lessonTitle: string;
  domain: string;
}

export interface ConceptDefinition extends ConceptSpec {
  id: string;
  courses?: string[];
  topics: string[];
}

export function norm(value: string | null | undefined): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function hasAny(haystack: string, words: string[]): boolean {
  return words.some((word) => haystack.includes(norm(word)));
}

export function cmd(
  category: string,
  command: string,
  description: string,
  examples: (string | CommandExample)[],
  options: {
    syntax?: string;
    flags?: { flag: string; description: string }[];
    warnings?: string[];
  } = {}
): CommandSpec {
  return {
    category,
    command,
    description,
    syntax: options.syntax,
    flags: options.flags,
    warnings: options.warnings,
    examples: examples.map((example) =>
      typeof example === 'string' ? { command: example } : example
    ),
  };
}

export function code(
  language: string,
  title: string,
  source: string,
  explanation?: string[]
): CodeBlock {
  return { language, title, code: source.trim(), explanation };
}

export function formula(name: string, expression: string, explanation: string): FormulaSpec {
  return { name, formula: expression, explanation };
}

export function diagram(kind: DiagramSpec['kind'], title: string, caption?: string): DiagramSpec {
  return { kind, title, caption };
}

export function ref(title: string, url: string, note?: string): ReferenceSpec {
  return { title, url, note };
}

export function trouble(problem: string, fix: string): TroubleshootingItem {
  return { problem, fix };
}

export function matchesConcept(concept: ConceptDefinition, ctx: MatchContext): boolean {
  if (concept.courses && !hasAny(ctx.courseHaystack, concept.courses)) return false;
  return hasAny(ctx.lessonHaystack, concept.topics) || hasAny(ctx.courseHaystack, concept.topics);
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = norm(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
