import type { Difficulty, ResourceType } from '@prisma/client';

export type DiagramKind =
  | 'filesystem'
  | 'layers'
  | 'client-server'
  | 'flow'
  | 'stack-heap'
  | 'circuit'
  | 'rtl-flow'
  | 'pipeline'
  | 'network'
  | 'timeline'
  | 'generic';

export interface CommandExample {
  command: string;
  output?: string;
  note?: string;
}

export interface CommandSpec {
  category: string;
  command: string;
  syntax?: string;
  description: string;
  flags?: { flag: string; description: string }[];
  examples: CommandExample[];
  warnings?: string[];
}

export interface CodeBlock {
  language: string;
  title: string;
  code: string;
  explanation?: string[];
}

export interface FormulaSpec {
  name: string;
  formula: string;
  explanation: string;
}

export interface DiagramSpec {
  kind: DiagramKind;
  title: string;
  caption?: string;
}

export interface TroubleshootingItem {
  problem: string;
  fix: string;
}

export interface ConceptSpec {
  term: string;
  definition: string;
  paragraphs: string[];
  code?: CodeBlock[];
  commands?: CommandSpec[];
  formulas?: FormulaSpec[];
  diagram?: DiagramSpec;
  mistakes?: string[];
  troubleshooting?: TroubleshootingItem[];
}

export interface ReferenceSpec {
  title: string;
  url: string;
  note?: string;
}

export interface KnowledgePack {
  concepts: ConceptSpec[];
  objectives: string[];
  prerequisites: string[];
  steps: string[];
  examples: string[];
  applications: string[];
  code: CodeBlock[];
  commands: CommandSpec[];
  formulas: FormulaSpec[];
  diagrams: DiagramSpec[];
  mistakes: string[];
  troubleshooting: TroubleshootingItem[];
  practice: string[];
  interview: string[];
  references: ReferenceSpec[];
}

export interface ResourceCourse {
  id: string;
  slug: string;
  title: string;
  titleTe?: string | null;
  description: string;
  descriptionTe?: string | null;
  longDescription?: string | null;
  longDescriptionTe?: string | null;
  difficulty: Difficulty;
  objectives: string[];
  objectivesTe: string[];
  requirements: string[];
  tags: string[];
  category: { name: string; nameTe?: string | null; slug: string };
  instructor: { name: string };
}

export interface ResourceLesson {
  id: string;
  title: string;
  titleTe?: string | null;
  description?: string | null;
  descriptionTe?: string | null;
  youtubeUrl: string;
  durationMinutes: number;
  order: number;
  resources?: unknown;
  course: ResourceCourse;
}

export interface LessonContentPlan {
  lesson: ResourceLesson;
  course: ResourceCourse;
  generatedAt: Date;
  introduction: string[];
  objectives: string[];
  prerequisites: string[];
  concepts: ConceptSpec[];
  steps: string[];
  formulas: FormulaSpec[];
  diagrams: DiagramSpec[];
  examples: string[];
  applications: string[];
  code: CodeBlock[];
  commands: CommandSpec[];
  mistakes: string[];
  troubleshooting: TroubleshootingItem[];
  importantPoints: string[];
  summary: string[];
  practice: string[];
  interview: string[];
  references: ReferenceSpec[];
  teluguSummary?: string[];
  hasCommands: boolean;
  contentHash: string;
}

export interface GeneratedFile {
  resourceType: ResourceType;
  fileName: string;
  storagePath: string;
  absolutePath: string;
  buffer: Buffer;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  contentHash: string;
  hasCommands: boolean;
}

export interface LessonResourceView {
  id: string;
  lessonId: string;
  resourceType: ResourceType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  version: number;
  status: string;
  outdated: boolean;
  generatedAt: string | null;
  updatedAt: string;
  error: string | null;
  previewUrl: string;
  downloadUrl: string;
}

export interface GenerationResult {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  generated: ResourceType[];
  skipped: ResourceType[];
  failed: { resourceType: ResourceType; error: string }[];
  hasCommands: boolean;
  resources: LessonResourceView[];
}
