import type {
  CodeBlock,
  CommandSpec,
  ConceptSpec,
  DiagramSpec,
  FormulaSpec,
  KnowledgePack,
  ReferenceSpec,
  ResourceCourse,
  ResourceLesson,
  TroubleshootingItem,
} from '../types';
import { hasAny, norm, uniqueStrings, type ConceptDefinition, type MatchContext } from './shared';
import { linuxConcepts } from './linux';
import { cPythonConcepts } from './programming-core';
import { jvmJsConcepts } from './programming-jvm-web';
import { fullstackAiConcepts } from './fullstack-ai';
import { infraConcepts } from './infra';
import { hardwareConcepts } from './hardware';

export type DomainKey =
  | 'linux'
  | 'arch'
  | 'rhel'
  | 'ubuntu'
  | 'c'
  | 'python'
  | 'java'
  | 'javascript'
  | 'fullstack'
  | 'ai'
  | 'ml'
  | 'devops'
  | 'security'
  | 'embedded'
  | 'vlsi'
  | 'database'
  | 'networking'
  | 'git'
  | 'generic';

const ALL_CONCEPTS: ConceptDefinition[] = [
  ...linuxConcepts,
  ...cPythonConcepts,
  ...jvmJsConcepts,
  ...fullstackAiConcepts,
  ...infraConcepts,
  ...hardwareConcepts,
];

const DOMAIN_META: Record<
  DomainKey,
  { label: string; description: string; references: ReferenceSpec[] }
> = {
  linux: {
    label: 'Linux & Open Source',
    description: 'The Linux kernel, the shell, the filesystem and everyday open-source tooling.',
    references: [
      { title: 'Linux man-pages project', url: 'https://man7.org/linux/man-pages/', note: 'Authoritative command reference.' },
      { title: 'The Linux Documentation Project', url: 'https://tldp.org/', note: 'Guides and HOWTOs.' },
    ],
  },
  arch: {
    label: 'Arch Linux',
    description: 'Rolling-release installation, partitioning, bootloaders and maintenance.',
    references: [
      { title: 'Arch Wiki — Installation guide', url: 'https://wiki.archlinux.org/title/Installation_guide' },
      { title: 'Arch Wiki — General recommendations', url: 'https://wiki.archlinux.org/title/General_recommendations' },
    ],
  },
  rhel: {
    label: 'Red Hat Enterprise Linux',
    description: 'Subscription management, SELinux, firewalld, LVM and enterprise administration.',
    references: [
      { title: 'Red Hat Product Documentation', url: 'https://docs.redhat.com/' },
      { title: 'SELinux Project Wiki', url: 'https://selinuxproject.org/page/Main_Page' },
    ],
  },
  ubuntu: {
    label: 'Ubuntu Server',
    description: 'Provisioning, hardening, systemd timers, backups and safe upgrades.',
    references: [
      { title: 'Ubuntu Server documentation', url: 'https://documentation.ubuntu.com/server/' },
      { title: 'Ubuntu Security documentation', url: 'https://documentation.ubuntu.com/security/' },
    ],
  },
  c: {
    label: 'C & C++ Systems Programming',
    description: 'Compilation, memory, pointers, data structures and debugging close to the machine.',
    references: [
      { title: 'cppreference', url: 'https://en.cppreference.com/', note: 'Language and library reference.' },
      { title: 'GNU C Library manual', url: 'https://www.gnu.org/software/libc/manual/' },
    ],
  },
  python: {
    label: 'Python Programming',
    description: 'Python syntax, data structures, files, environments and practical automation.',
    references: [
      { title: 'Python documentation', url: 'https://docs.python.org/3/' },
      { title: 'Python Packaging User Guide', url: 'https://packaging.python.org/' },
    ],
  },
  java: {
    label: 'Java & the JVM',
    description: 'Java language fundamentals, collections, streams, exceptions and the JVM toolchain.',
    references: [
      { title: 'Java SE documentation', url: 'https://docs.oracle.com/en/java/javase/' },
      { title: 'Java Tutorials', url: 'https://dev.java/learn/' },
    ],
  },
  javascript: {
    label: 'JavaScript & TypeScript',
    description: 'Modern syntax, closures, the event loop, promises and static typing.',
    references: [
      { title: 'MDN Web Docs — JavaScript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/' },
    ],
  },
  fullstack: {
    label: 'Full-Stack Web Development',
    description: 'React, Node, APIs, databases, authentication and deployment.',
    references: [
      { title: 'React documentation', url: 'https://react.dev/' },
      { title: 'Express documentation', url: 'https://expressjs.com/' },
      { title: 'Prisma documentation', url: 'https://www.prisma.io/docs' },
    ],
  },
  ai: {
    label: 'AI & LLM Application Development',
    description: 'LLM mechanics, prompt design, retrieval-augmented generation and evaluation.',
    references: [
      { title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762' },
      { title: 'OpenAI Cookbook', url: 'https://cookbook.openai.com/' },
    ],
  },
  ml: {
    label: 'Machine Learning',
    description: 'Framing ML problems, data preparation, model training and evaluation.',
    references: [
      { title: 'scikit-learn user guide', url: 'https://scikit-learn.org/stable/user_guide.html' },
      { title: 'Google Machine Learning Crash Course', url: 'https://developers.google.com/machine-learning/crash-course' },
    ],
  },
  devops: {
    label: 'DevOps & Cloud',
    description: 'Delivery pipelines, containers, Kubernetes and observability.',
    references: [
      { title: 'Docker documentation', url: 'https://docs.docker.com/' },
      { title: 'Kubernetes documentation', url: 'https://kubernetes.io/docs/home/' },
      { title: 'GitHub Actions documentation', url: 'https://docs.github.com/en/actions' },
    ],
  },
  security: {
    label: 'Cybersecurity',
    description: 'Threat modelling, secure authentication, web risks and incident response.',
    references: [
      { title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/' },
      { title: 'NIST Cybersecurity Framework', url: 'https://www.nist.gov/cyberframework' },
    ],
  },
  embedded: {
    label: 'Embedded Systems & IoT',
    description: 'Microcontrollers, GPIO, sensors, serial protocols and connected devices.',
    references: [
      { title: 'FreeRTOS documentation', url: 'https://www.freertos.org/Documentation/RTOS_book.html' },
      { title: 'MQTT specification', url: 'https://mqtt.org/mqtt-specification/' },
    ],
  },
  vlsi: {
    label: 'VLSI & Semiconductor Design',
    description: 'Digital design, Verilog, synthesis, timing analysis and physical design.',
    references: [
      { title: 'IEEE 1364 Verilog standard', url: 'https://standards.ieee.org/ieee/1364/2692/' },
      { title: 'OpenROAD project', url: 'https://theopenroadproject.org/' },
    ],
  },
  database: {
    label: 'Databases & SQL',
    description: 'Relational modelling, queries, indexes and transactions.',
    references: [
      { title: 'PostgreSQL documentation', url: 'https://www.postgresql.org/docs/' },
      { title: 'Use The Index, Luke', url: 'https://use-the-index-luke.com/' },
    ],
  },
  networking: {
    label: 'Networking',
    description: 'TCP/IP, DNS, HTTP and practical connectivity troubleshooting.',
    references: [
      { title: 'Cloudflare Learning Center', url: 'https://www.cloudflare.com/learning/' },
      { title: 'RFC Editor', url: 'https://www.rfc-editor.org/' },
    ],
  },
  git: {
    label: 'Git & Version Control',
    description: 'Commits, branches, merges, remotes and collaborative history.',
    references: [
      { title: 'Pro Git book', url: 'https://git-scm.com/book/en/v2' },
      { title: 'Git reference', url: 'https://git-scm.com/docs' },
    ],
  },
  generic: {
    label: 'Technology Foundations',
    description: 'Durable concepts and practices that apply across the curriculum.',
    references: [
      { title: 'TechTuxAcademy course catalogue', url: 'https://techtuxacademy.online/courses' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
    ],
  },
};

export function detectDomain(courseHaystack: string): DomainKey {
  const rules: [DomainKey, string[]][] = [
    ['arch', ['arch linux', 'arch-linux', 'arch way']],
    ['rhel', ['rhel', 'red hat', 'red-hat']],
    ['ubuntu', ['ubuntu']],
    ['vlsi', ['vlsi', 'semiconductor', 'digital design', 'verilog']],
    ['embedded', ['embedded', 'iot', 'microcontroller', 'electronics', 'robotics']],
    ['security', ['security', 'cybersecurity', 'ethical hacking', 'penetration']],
    ['devops', ['devops', 'cloud', 'kubernetes', 'docker', 'delivery']],
    ['ai', ['ai &', 'ai-llm', 'artificial intelligence', 'llm', 'generative']],
    ['ml', ['machine learning', 'deep learning', 'data science']],
    ['fullstack', ['full-stack', 'fullstack', 'react', 'node', 'express', 'prisma', 'postgresql']],
    ['java', ['java', 'jvm', 'spring']],
    ['javascript', ['javascript', 'typescript']],
    ['python', ['python', 'django', 'flask']],
    ['c', ['c & c++', 'c-cpp', 'c++', 'systems programming', 'pointers']],
    ['database', ['database', 'sql', 'mysql', 'mongodb']],
    ['networking', ['networking', 'ccna', 'tcp/ip']],
    ['git', ['git ', 'version control']],
    ['linux', ['linux', 'open source', 'command line', 'shell', 'unix']],
  ];
  for (const [domain, words] of rules) {
    if (hasAny(courseHaystack, words)) return domain;
  }
  return 'generic';
}

function buildMatchContext(course: ResourceCourse, lesson: ResourceLesson): MatchContext {
  const courseHaystack = norm(
    [
      course.title,
      course.slug,
      course.category.name,
      course.category.slug,
      course.description,
      course.longDescription,
      ...course.tags,
    ].join(' ')
  );
  const lessonHaystack = norm([lesson.title, lesson.description].join(' '));
  return {
    courseHaystack,
    lessonHaystack,
    haystack: `${courseHaystack} ${lessonHaystack}`,
    lessonTitle: lesson.title,
    domain: detectDomain(courseHaystack),
  };
}

function conceptMatches(concept: ConceptDefinition, ctx: MatchContext): number {
  let score = 0;
  if (concept.courses && !hasAny(ctx.courseHaystack, concept.courses)) return 0;
  if (concept.courses && hasAny(ctx.courseHaystack, concept.courses)) score += 1;
  const topicHits = concept.topics.filter((topic) => ctx.haystack.includes(norm(topic))).length;
  if (topicHits > 0) score += 2 + topicHits;
  // Lesson-title matches are the strongest signal.
  if (concept.topics.some((topic) => ctx.lessonHaystack.includes(norm(topic)))) score += 3;
  return score;
}

function pickConcepts(course: ResourceCourse, lesson: ResourceLesson): ConceptDefinition[] {
  const ctx = buildMatchContext(course, lesson);
  const scored = ALL_CONCEPTS.map((concept) => ({ concept, score: conceptMatches(concept, ctx) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const chosen: ConceptDefinition[] = [];
  const seen = new Set<string>();
  for (const entry of scored) {
    if (seen.has(entry.concept.id)) continue;
    seen.add(entry.concept.id);
    chosen.push(entry.concept);
    if (chosen.length >= 4) break;
  }

  // Guarantee at least one domain concept so every lesson has substance.
  if (chosen.length === 0) {
    const domainConcept = ALL_CONCEPTS.find(
      (concept) => concept.courses && hasAny(ctx.courseHaystack, concept.courses)
    );
    if (domainConcept) chosen.push(domainConcept);
  }
  return chosen;
}

function mergeConcepts(concepts: ConceptDefinition[]): KnowledgePack {
  const code: CodeBlock[] = [];
  const commands: CommandSpec[] = [];
  const formulas: FormulaSpec[] = [];
  const diagrams: DiagramSpec[] = [];
  const mistakes: string[] = [];
  const troubleshooting: TroubleshootingItem[] = [];
  const objectives: string[] = [];
  const prerequisites: string[] = [];
  const steps: string[] = [];
  const examples: string[] = [];
  const applications: string[] = [];
  const practice: string[] = [];
  const interview: string[] = [];
  const references: ReferenceSpec[] = [];
  const conceptSpecs: ConceptSpec[] = [];

  for (const concept of concepts) {
    conceptSpecs.push({
      term: concept.term,
      definition: concept.definition,
      paragraphs: concept.paragraphs,
      code: concept.code,
      commands: concept.commands,
      formulas: concept.formulas,
      diagram: concept.diagram,
      mistakes: concept.mistakes,
      troubleshooting: concept.troubleshooting,
    });
    if (concept.code) code.push(...concept.code);
    if (concept.commands) commands.push(...concept.commands);
    if (concept.formulas) formulas.push(...concept.formulas);
    if (concept.diagram) diagrams.push(concept.diagram);
    if (concept.mistakes) mistakes.push(...concept.mistakes);
    if (concept.troubleshooting) troubleshooting.push(...concept.troubleshooting);
    objectives.push(`Explain ${concept.term.toLowerCase()} and use it in a realistic task.`);
    examples.push(
      `Apply ${concept.term.toLowerCase()}: ${concept.paragraphs[0]?.split('. ')[0] ?? concept.definition}`
    );
    applications.push(
      `Use ${concept.term.toLowerCase()} when designing, operating or debugging a production system.`
    );
    practice.push(
      `Write a short explanation of ${concept.term.toLowerCase()} and demonstrate it with one command, snippet or diagram.`
    );
    interview.push(`What is ${concept.term.toLowerCase()}, and what problem does it solve?`);
    steps.push(`Review ${concept.term.toLowerCase()} and confirm you can explain it without notes.`);
  }

  return {
    concepts: conceptSpecs,
    objectives: uniqueStrings(objectives),
    prerequisites: uniqueStrings(prerequisites),
    steps: uniqueStrings(steps),
    examples: uniqueStrings(examples),
    applications: uniqueStrings(applications),
    code,
    commands,
    formulas,
    diagrams,
    mistakes: uniqueStrings(mistakes),
    troubleshooting,
    practice: uniqueStrings(practice),
    interview: uniqueStrings(interview),
    references,
  };
}

export interface KnowledgeResult {
  domain: DomainKey;
  domainLabel: string;
  domainDescription: string;
  pack: KnowledgePack;
}

export function buildKnowledge(course: ResourceCourse, lesson: ResourceLesson): KnowledgeResult {
  const concepts = pickConcepts(course, lesson);
  const domain = detectDomain(
    norm([course.title, course.slug, course.category.name, course.category.slug].join(' '))
  );
  const meta = DOMAIN_META[domain] ?? DOMAIN_META.generic;
  const pack = mergeConcepts(concepts);

  // Fill prerequisites from the course when concepts do not provide them.
  if (pack.prerequisites.length === 0) {
    pack.prerequisites = course.requirements.length
      ? [...course.requirements]
      : ['Basic computer literacy and a willingness to use a terminal.'];
  }

  // Merge domain references with any course-level references.
  pack.references = uniqueReferences([
    ...meta.references,
    { title: 'TechTuxAcademy course page', url: `https://techtuxacademy.online/courses/${course.slug}` },
  ]);

  return {
    domain,
    domainLabel: meta.label,
    domainDescription: meta.description,
    pack,
  };
}

function uniqueReferences(references: ReferenceSpec[]): ReferenceSpec[] {
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = reference.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { DOMAIN_META };
