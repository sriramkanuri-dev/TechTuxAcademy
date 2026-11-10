export type Role = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type Language = 'en' | 'te';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
  bio?: string | null;
  bioTe?: string | null;
  preferredLanguage?: Language;
  emailVerified: boolean;
  disabled?: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  nameTe?: string | null;
  description: string;
  descriptionTe?: string | null;
  icon: string;
  color: string;
  order?: number;
  featured?: boolean;
  _count?: { courses: number; tutorials: number; posts: number };
}

export interface Instructor {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
}

export interface LessonResource {
  title: string;
  url: string;
  type?: string;
}

export type GeneratedResourceType = 'LESSON_NOTES' | 'COMMAND_CHEATSHEET';
export type GeneratedResourceStatus = 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';

/** A generated PDF attached to a lesson (lesson notes or command cheat sheet). */
export interface GeneratedLessonResource {
  id: string;
  lessonId: string;
  resourceType: GeneratedResourceType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  version: number;
  status: GeneratedResourceStatus;
  outdated: boolean;
  generatedAt: string | null;
  updatedAt: string;
  error: string | null;
  previewUrl: string;
  downloadUrl: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  titleTe?: string | null;
  description?: string | null;
  descriptionTe?: string | null;
  youtubeUrl: string;
  youtubeId: string;
  durationMinutes: number;
  order: number;
  isPreview: boolean;
  resources?: LessonResource[] | null;
  locked?: boolean;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  titleTe?: string | null;
  description: string;
  descriptionTe?: string | null;
  longDescription?: string | null;
  longDescriptionTe?: string | null;
  thumbnail?: string | null;
  difficulty: Difficulty;
  durationMinutes: number;
  language: string;
  published: boolean;
  featured: boolean;
  certificateThreshold: number;
  objectives: string[];
  objectivesTe: string[];
  tags: string[];
  requirements: string[];
  categoryId: string;
  category: Category;
  instructor: Instructor;
  lessons?: Lesson[];
  _count: { lessons: number; enrollments: number; certificates?: number };
  createdAt: string;
  updatedAt?: string;
}

export interface Progress {
  totalLessons: number;
  completedLessons: number;
  percent: number;
  completedLessonIds: string[];
  nextLessonId: string | null;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  lastAccessedAt: string;
  completedAt?: string | null;
  course?: Course;
  progress?: Progress;
}

export interface Tutorial {
  id: string;
  slug: string;
  title: string;
  titleTe?: string | null;
  excerpt: string;
  excerptTe?: string | null;
  content?: string;
  contentTe?: string | null;
  image?: string | null;
  categoryId: string;
  category?: Category;
  author?: Instructor;
  published?: boolean;
  featured?: boolean;
  readMinutes: number;
  language?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  titleTe?: string | null;
  excerpt: string;
  excerptTe?: string | null;
  content?: string;
  contentTe?: string | null;
  coverImage?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  author?: Instructor;
  published?: boolean;
  featured?: boolean;
  readMinutes: number;
  language?: string;
  tags: string[];
  publishedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Certificate {
  id: string;
  certificateId: string;
  userId: string;
  courseId: string;
  issuedAt: string;
  revoked: boolean;
  revokedAt?: string | null;
  revocationReason?: string | null;
  user?: { id: string; name: string; email?: string };
  course?: Course;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  quoteTe?: string | null;
  avatar?: string | null;
  rating: number;
  featured: boolean;
  published: boolean;
  order: number;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  messageTe?: string | null;
  type: 'info' | 'success' | 'warning' | 'danger' | string;
  active: boolean;
  link?: string | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SiteSettings {
  [key: string]: unknown;
}

export interface HomeData {
  settings: SiteSettings;
  announcements: Announcement[];
  categories: Category[];
  featuredCourses: Course[];
  latestCourses: Course[];
  linuxTutorials: Tutorial[];
  tutorials: Tutorial[];
  posts: BlogPost[];
  testimonials: Testimonial[];
  stats: {
    students: number;
    courses: number;
    lessons: number;
    tutorials: number;
    posts: number;
    certificates: number;
    enrollments: number;
  };
}

export interface DashboardData {
  user: User;
  stats: {
    enrolledCourses: number;
    completedCourses: number;
    certificates: number;
    minutesLearned: number;
    lessonsCompleted: number;
  };
  enrollments: Enrollment[];
  continueLearning: {
    enrollmentId: string;
    course: Course;
    progress: Progress;
    nextLesson: Lesson | null;
    lastAccessedAt: string;
  }[];
  recentLessons: {
    id: string;
    lessonId: string;
    lastWatchedAt: string;
    completed: boolean;
    lesson: Lesson & { course: { id: string; title: string; slug: string } };
  }[];
  certificates: Certificate[];
}

export interface AdminStats {
  students: number;
  instructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalTutorials: number;
  publishedTutorials: number;
  totalPosts: number;
  publishedPosts: number;
  totalLessons: number;
  enrollments: number;
  certificates: number;
  newsletterSubscribers: number;
  unhandledMessages: number;
}
