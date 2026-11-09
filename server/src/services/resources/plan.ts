import { createHash } from 'crypto';
import type {
  CodeBlock,
  CommandSpec,
  DiagramSpec,
  FormulaSpec,
  LessonContentPlan,
  ReferenceSpec,
  ResourceCourse,
  ResourceLesson,
  TroubleshootingItem,
} from './types';
import { buildKnowledge } from './knowledge';
import { uniqueStrings } from './knowledge/shared';

function clean(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function sentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function paragraphs(value: string | null | undefined): string[] {
  return (value || '')
    .split(/\n{2,}/)
    .map((part) => clean(part))
    .filter(Boolean);
}

/** Stable hash of the inputs that influence generated PDF content. */
export function lessonContentHash(course: ResourceCourse, lesson: ResourceLesson): string {
  const payload = JSON.stringify({
    course: {
      id: course.id,
      title: course.title,
      titleTe: course.titleTe,
      description: course.description,
      longDescription: course.longDescription,
      difficulty: course.difficulty,
      objectives: course.objectives,
      requirements: course.requirements,
      tags: course.tags,
      category: course.category,
    },
    lesson: {
      id: lesson.id,
      title: lesson.title,
      titleTe: lesson.titleTe,
      description: lesson.description,
      durationMinutes: lesson.durationMinutes,
      order: lesson.order,
      youtubeUrl: lesson.youtubeUrl,
    },
  });
  return createHash('sha256').update(payload).digest('hex');
}

function buildIntroduction(course: ResourceCourse, lesson: ResourceLesson): string[] {
  const intro: string[] = [];
  const lessonDescription = paragraphs(lesson.description);
  const courseDescription = paragraphs(course.description);
  const longDescription = paragraphs(course.longDescription);

  if (lessonDescription.length) {
    intro.push(...lessonDescription.map(sentence));
  } else {
    intro.push(
      sentence(
        `This lesson, "${lesson.title}", is part of the ${course.title} course in the ${course.category.name} track.`
      )
    );
  }

  intro.push(
    sentence(
      `You are working through lesson ${lesson.order + 1} of ${course.title}, a ${course.difficulty.toLowerCase()} course taught by ${course.instructor.name}.`
    )
  );

  if (courseDescription.length) {
    intro.push(sentence(courseDescription[0]));
  } else if (longDescription.length) {
    intro.push(sentence(longDescription[0]));
  }

  intro.push(
    'Read the concepts first, then reproduce the commands and code examples yourself. The practice and interview questions at the end turn recognition into recall.'
  );

  return uniqueStrings(intro);
}

function buildObjectives(course: ResourceCourse, lesson: ResourceLesson, packObjectives: string[]): string[] {
  const objectives: string[] = [];
  const lessonDescription = clean(lesson.description);

  if (lessonDescription) {
    objectives.push(`Understand and explain ${lesson.title.toLowerCase()} in your own words.`);
  }
  objectives.push(
    `Describe where ${lesson.title.toLowerCase()} fits inside the ${course.title} course and the ${course.category.name} track.`
  );
  objectives.push(...packObjectives.slice(0, 5));
  objectives.push('Complete the practice tasks and answer the review questions without referring back to the notes.');

  return uniqueStrings(objectives).slice(0, 8);
}

function buildPrerequisites(course: ResourceCourse, packPrerequisites: string[]): string[] {
  const prerequisites = [...packPrerequisites];
  if (course.requirements.length) {
    prerequisites.unshift(...course.requirements);
  }
  if (prerequisites.length === 0) {
    prerequisites.push('A computer with a modern operating system and permission to install software.');
    prerequisites.push('Comfort using a web browser and a text editor.');
  }
  prerequisites.push(`Completion of the earlier lessons in ${course.title}, or equivalent experience.`);
  return uniqueStrings(prerequisites).slice(0, 8);
}

function buildSteps(packSteps: string[], lesson: ResourceLesson): string[] {
  const steps = [
    `Read the introduction and confirm you understand the goal of "${lesson.title}".`,
    ...packSteps,
    'Reproduce the examples locally and compare the output with the expected result.',
    'Work through the practice questions, then review the summary and key points.',
  ];
  return uniqueStrings(steps).slice(0, 12);
}

function buildExamples(
  course: ResourceCourse,
  lesson: ResourceLesson,
  packExamples: string[],
  commands: CommandSpec[]
): string[] {
  const examples = [...packExamples];
  if (commands.length) {
    examples.unshift(
      `Run the commands from the cheat sheet in a safe environment and observe the output for ${lesson.title.toLowerCase()}.`
    );
  }
  examples.push(
    `Explain ${lesson.title.toLowerCase()} to a peer using a diagram or a two-minute walkthrough.`
  );
  examples.push(
    `Connect this lesson to the ${course.title} capstone: identify one place where the concept would improve reliability, security or clarity.`
  );
  return uniqueStrings(examples).slice(0, 8);
}

function buildApplications(course: ResourceCourse, lesson: ResourceLesson, packApplications: string[]): string[] {
  const applications = [...packApplications];
  applications.push(
    `Use the ideas from ${lesson.title.toLowerCase()} during code review, incident response or system design discussions.`
  );
  applications.push(
    `Map the lesson to a real task in the ${course.category.name} role you are preparing for.`
  );
  return uniqueStrings(applications).slice(0, 8);
}

function buildImportantPoints(
  lesson: ResourceLesson,
  packObjectives: string[],
  mistakes: string[],
  commands: CommandSpec[]
): string[] {
  const points: string[] = [];
  points.push(`The goal of "${lesson.title}" is to make the concept usable, not merely recognisable.`);
  points.push(...packObjectives.slice(0, 3));
  if (commands.length) {
    points.push('Always read a command before running it; prefer read-only checks and dry runs for destructive actions.');
  }
  if (mistakes.length) {
    points.push(`Avoid the common mistake: ${mistakes[0]}`);
  }
  points.push('Write down the command or code you used so you can reproduce the result later.');
  return uniqueStrings(points).slice(0, 8);
}

function buildSummary(lesson: ResourceLesson, course: ResourceCourse, concepts: string[]): string[] {
  const summary: string[] = [
    `In this lesson you studied ${lesson.title.toLowerCase()} as part of ${course.title}.`,
  ];
  if (concepts.length) {
    summary.push(`The main concepts were ${concepts.slice(0, 4).join(', ')}.`);
  }
  summary.push(
    'You should now be able to explain the concept, run the relevant commands or code, and recognise the common failure modes.'
  );
  summary.push(
    'Revisit the cheat sheet for a quick reference, and continue to the next lesson once the practice tasks feel comfortable.'
  );
  return summary;
}

function buildPractice(lesson: ResourceLesson, packPractice: string[], commands: CommandSpec[]): string[] {
  const practice = [...packPractice];
  if (commands.length) {
    practice.unshift(
      `Run three commands from the cheat sheet for "${lesson.title}" and record the output in your notes.`
    );
  }
  practice.push(`Write a five-line summary of "${lesson.title}" without looking at the lesson.`);
  practice.push('Teach the concept to someone else, or record a short explanation, and note where you hesitated.');
  return uniqueStrings(practice).slice(0, 10);
}

function buildInterview(lesson: ResourceLesson, packInterview: string[], commands: CommandSpec[]): string[] {
  const interview = [...packInterview];
  interview.push(`How would you explain ${lesson.title.toLowerCase()} to a junior engineer?`);
  interview.push(`Describe a production problem that ${lesson.title.toLowerCase()} helps you diagnose or prevent.`);
  if (commands.length) {
    interview.push('Which command would you run first, and what output would confirm your hypothesis?');
  }
  interview.push('What is the most dangerous mistake someone could make with this topic, and how do you prevent it?');
  return uniqueStrings(interview).slice(0, 10);
}

function buildReferences(course: ResourceCourse, packReferences: ReferenceSpec[]): ReferenceSpec[] {
  const references = [...packReferences];
  references.push({
    title: `${course.title} — course lessons`,
    url: `https://techtuxacademy.online/courses/${course.slug}`,
    note: 'Revisit the course page for the lesson video and related material.',
  });
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = reference.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildTeluguSummary(
  lesson: ResourceLesson,
  course: ResourceCourse,
  concepts: string[]
): string[] | undefined {
  const hasTelugu = Boolean(lesson.titleTe || course.titleTe);
  if (!hasTelugu) return undefined;
  const titleTe = lesson.titleTe || lesson.title;
  const courseTe = course.titleTe || course.title;
  return [
    `ఈ పాఠంలో మీరు "${titleTe}" గురించి నేర్చుకుంటారు. ఇది "${courseTe}" కోర్సులో భాగం.`,
    concepts.length
      ? `ముఖ్యమైన భావనలు: ${concepts.slice(0, 4).join(', ')}.`
      : 'ముఖ్యమైన భావనలను ఉదాహరణలతో సాధన చేయండి.',
    'కమాండ్లను జాగ్రత్తగా చదివి, మొదట డ్రై-రన్ చేయండి. తర్వాత సాధన ప్రశ్నలకు సమాధానాలు ఇవ్వండి.',
  ];
}

/** True when the lesson genuinely contains commands worth a cheat sheet. */
function hasCommandContent(commands: CommandSpec[]): boolean {
  return commands.length > 0;
}

export function buildLessonPlan(course: ResourceCourse, lesson: ResourceLesson): LessonContentPlan {
  const knowledge = buildKnowledge(course, lesson);
  const pack = knowledge.pack;
  const conceptTerms = pack.concepts.map((concept) => concept.term);

  const introduction = buildIntroduction(course, lesson);
  const objectives = buildObjectives(course, lesson, pack.objectives);
  const prerequisites = buildPrerequisites(course, pack.prerequisites);
  const steps = buildSteps(pack.steps, lesson);
  const examples = buildExamples(course, lesson, pack.examples, pack.commands);
  const applications = buildApplications(course, lesson, pack.applications);
  const importantPoints = buildImportantPoints(lesson, pack.objectives, pack.mistakes, pack.commands);
  const summary = buildSummary(lesson, course, conceptTerms);
  const practice = buildPractice(lesson, pack.practice, pack.commands);
  const interview = buildInterview(lesson, pack.interview, pack.commands);
  const references = buildReferences(course, pack.references);

  const formulas: FormulaSpec[] = pack.formulas;
  const diagrams: DiagramSpec[] = pack.diagrams.length
    ? pack.diagrams
    : [{ kind: 'generic', title: `${lesson.title} overview`, caption: knowledge.domainDescription }];
  const code: CodeBlock[] = pack.code;
  const commands: CommandSpec[] = pack.commands;
  const troubleshooting: TroubleshootingItem[] = pack.troubleshooting;

  return {
    lesson,
    course,
    generatedAt: new Date(),
    introduction,
    objectives,
    prerequisites,
    concepts: pack.concepts,
    steps,
    formulas,
    diagrams,
    examples,
    applications,
    code,
    commands,
    mistakes: pack.mistakes,
    troubleshooting,
    importantPoints,
    summary,
    practice,
    interview,
    references,
    teluguSummary: buildTeluguSummary(lesson, course, conceptTerms),
    hasCommands: hasCommandContent(commands),
    contentHash: lessonContentHash(course, lesson),
  };
}
