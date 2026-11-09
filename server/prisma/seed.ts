import { PrismaClient, Difficulty, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  console.error('Refusing to seed a production database. Set ALLOW_PROD_SEED=true to override.');
  process.exit(1);
}

type LessonSeed = {
  title: string;
  titleTe?: string;
  youtubeId: string;
  duration: number;
  description?: string;
  isPreview?: boolean;
};

type CourseSeed = {
  title: string;
  titleTe?: string;
  slug: string;
  category: string;
  difficulty: Difficulty;
  featured?: boolean;
  description: string;
  descriptionTe?: string;
  longDescription: string;
  objectives: string[];
  objectivesTe?: string[];
  tags: string[];
  requirements: string[];
  lessons: LessonSeed[];
};

const categories = [
  { slug: 'linux', name: 'Linux & Open Source', nameTe: 'లినక్స్ & ఓపెన్ సోర్స్', icon: 'Terminal', color: '#8b5cf6', featured: true, description: 'Understand the operating system that powers the cloud, from the shell to the kernel. Build real confidence with open-source tools.' },
  { slug: 'linux-administration', name: 'Linux Administration', nameTe: 'లినక్స్ అడ్మినిస్ట్రేషన్', icon: 'ServerCog', color: '#7c3aed', featured: true, description: 'Manage users, services, storage and networks on production Linux servers with confidence.' },
  { slug: 'arch-linux', name: 'Arch Linux', nameTe: 'ఆర్చ్ లినక్స్', icon: 'Boxes', color: '#22d3ee', description: 'Install, configure and maintain Arch Linux. Learn the Arch Way and build a system you truly understand.' },
  { slug: 'red-hat-enterprise-linux', name: 'Red Hat Enterprise Linux', nameTe: 'రెడ్ హ్యాట్ ఎంటర్‌ప్రైజ్ లినక్స్', icon: 'BadgeCheck', color: '#ef4444', description: 'Enterprise Linux skills with RHEL: dnf, SELinux, systemd, subscriptions and certification-ready practice.' },
  { slug: 'ubuntu', name: 'Ubuntu', nameTe: 'ఉబుంటు', icon: 'CircleDot', color: '#f97316', description: 'From desktop to server, master Ubuntu — the world’s most popular Linux distribution.' },
  { slug: 'programming', name: 'Programming', nameTe: 'ప్రోగ్రామింగ్', icon: 'Code2', color: '#3b82f6', featured: true, description: 'Learn programming fundamentals, problem solving and the craft of writing maintainable software.' },
  { slug: 'python', name: 'Python', nameTe: 'పైథాన్', icon: 'Braces', color: '#eab308', featured: true, description: 'Build automation, data tools, APIs and machine learning projects with Python.' },
  { slug: 'java', name: 'Java', nameTe: 'జావా', icon: 'Coffee', color: '#f59e0b', description: 'Object-oriented programming, the JVM, Spring and enterprise application development.' },
  { slug: 'c-cpp', name: 'C & C++', nameTe: 'సి & సి++', icon: 'Binary', color: '#64748b', description: 'Master memory, pointers and performance with the languages behind operating systems and embedded devices.' },
  { slug: 'web-development', name: 'Web Development', nameTe: 'వెబ్ డెవలప్‌మెంట్', icon: 'Globe2', color: '#06b6d4', featured: true, description: 'Build modern, accessible and fast web applications from first principles to deployment.' },
  { slug: 'html-css-javascript', name: 'HTML, CSS & JavaScript', nameTe: 'HTML, CSS & JavaScript', icon: 'LayoutTemplate', color: '#f43f5e', description: 'The essential trio of the web. Semantic markup, beautiful layouts and interactive interfaces.' },
  { slug: 'react-nodejs', name: 'React & Node.js', nameTe: 'రియాక్ట్ & నోడ్.js', icon: 'Layers', color: '#0ea5e9', featured: true, description: 'Full-stack JavaScript with React on the front end and Node.js APIs on the back end.' },
  { slug: 'artificial-intelligence', name: 'Artificial Intelligence', nameTe: 'కృత్రిమ మేధస్సు', icon: 'Sparkles', color: '#a855f7', featured: true, description: 'Understand modern AI, large language models and how to build useful AI-powered products.' },
  { slug: 'machine-learning', name: 'Machine Learning', nameTe: 'మెషీన్ లెర్నింగ్', icon: 'BrainCircuit', color: '#8b5cf6', description: 'Learn the maths and practice of training models that make useful predictions.' },
  { slug: 'embedded-systems', name: 'Embedded Systems', nameTe: 'ఎంబెడెడ్ సిస్టమ్స్', icon: 'Cpu', color: '#10b981', description: 'Firmware, microcontrollers and real-time systems that connect software to the physical world.' },
  { slug: 'electronics-communication', name: 'Electronics & Communication', nameTe: 'ఎలక్ట్రానిక్స్ & కమ్యూనికేషన్', icon: 'Radio', color: '#14b8a6', description: 'Circuits, signals and communication systems — the foundation of modern technology.' },
  { slug: 'vlsi-semiconductor', name: 'VLSI & Semiconductor Design', nameTe: 'VLSI & సెమీకండక్టర్ డిజైన్', icon: 'CircuitBoard', color: '#6366f1', description: 'Digital design, Verilog, verification and the journey from RTL to silicon.' },
  { slug: 'robotics-iot', name: 'Robotics & IoT', nameTe: 'రోబోటిక్స్ & IoT', icon: 'Bot', color: '#22c55e', description: 'Build connected devices, sensors and robots that sense, think and act.' },
  { slug: 'devops-cloud', name: 'DevOps & Cloud Computing', nameTe: 'డెవాప్స్ & క్లౌడ్ కంప్యూటింగ్', icon: 'CloudCog', color: '#0ea5e9', featured: true, description: 'Ship reliable software with Linux, containers, CI/CD, Kubernetes and cloud platforms.' },
  { slug: 'cybersecurity', name: 'Cybersecurity', nameTe: 'సైబర్ భద్రత', icon: 'ShieldCheck', color: '#ef4444', featured: true, description: 'Think like an attacker, defend like an engineer. Practical security for modern systems.' },
];

const courses: CourseSeed[] = [
  {
    title: 'Linux Essentials: Zero to Command Line Hero',
    titleTe: 'లినక్స్ ఎసెన్షియల్స్: జీరో నుండి కమాండ్ లైన్ హీరో',
    slug: 'linux-essentials-zero-to-command-line-hero',
    category: 'linux',
    difficulty: 'BEGINNER',
    featured: true,
    description: 'A friendly, hands-on introduction to Linux. Learn the shell, filesystem, permissions, processes and networking — the skills every technologist needs.',
    descriptionTe: 'లినక్స్‌కు స్నేహపూర్వక, ప్రాక్టికల్ పరిచయం. షెల్, ఫైల్ సిస్టమ్, పర్మిషన్లు, ప్రాసెస్‌లు మరియు నెట్‌వర్కింగ్ నేర్చుకోండి.',
    longDescription: 'Linux runs the internet, Android phones, supercomputers and most cloud infrastructure. This course takes you from your first terminal command to confidently managing a Linux system. Every lesson includes a hands-on lab, downloadable cheat sheets and real-world scenarios you will meet on the job.',
    objectives: [
      'Navigate the Linux filesystem with confidence',
      'Write and chain shell commands to automate work',
      'Understand users, groups and file permissions',
      'Inspect and control processes with systemd',
      'Install software across Debian and RHEL families',
      'Diagnose basic networking and connectivity issues',
    ],
    objectivesTe: [
      'లినక్స్ ఫైల్ సిస్టమ్‌ను నిశ్చింతగా వాడటం',
      'షెల్ కమాండ్లతో పనిని ఆటోమేట్ చేయడం',
      'యూజర్లు, గ్రూపులు మరియు పర్మిషన్లను అర్థం చేసుకోవడం',
      'ప్రాసెస్‌లను systemd తో నియంత్రించడం',
    ],
    tags: ['linux', 'bash', 'terminal', 'open-source'],
    requirements: ['A computer with Linux, WSL or a virtual machine', 'No prior Linux experience required'],
    lessons: [
      { title: 'Welcome to Linux & the Open Source Mindset', titleTe: 'లినక్స్ మరియు ఓపెన్ సోర్స్ పరిచయం', youtubeId: 'ZtqBQ68cfJc', duration: 18, description: 'Why Linux matters, how distributions differ and how to get a practice environment running.', isPreview: true },
      { title: 'Navigating the Filesystem Like a Pro', youtubeId: 'sWbUDq4S6Y8', duration: 24, description: 'pwd, ls, cd, find, tree and the Linux filesystem hierarchy standard.' },
      { title: 'Users, Groups & File Permissions', youtubeId: 'ZtqBQ68cfJc', duration: 28, description: 'chmod, chown, umask and the permission model explained with practical examples.' },
      { title: 'Processes, Signals & systemd', youtubeId: 'sWbUDq4S6Y8', duration: 26, description: 'Read ps and top output, manage services with systemctl and understand signals.' },
      { title: 'Package Management Across Distros', youtubeId: 'ZtqBQ68cfJc', duration: 22, description: 'apt, dnf, pacman and best practices for keeping systems updated.' },
      { title: 'Networking Essentials: ip, ss & curl', youtubeId: 'qiQR5rTSshw', duration: 30, description: 'Inspect interfaces, routes, sockets and HTTP requests from the terminal.' },
    ],
  },
  {
    title: 'Arch Linux: Install, Configure & Own Your System',
    titleTe: 'ఆర్చ్ లినక్స్: ఇన్‌స్టాల్ చేయండి, కాన్ఫిగర్ చేయండి',
    slug: 'arch-linux-install-configure-own-your-system',
    category: 'arch-linux',
    difficulty: 'ADVANCED',
    description: 'A calm, modern guide to installing Arch Linux with UEFI, systemd-boot, LUKS encryption and a sensible post-install setup. Learn the Arch Way without the intimidation.',
    longDescription: 'Arch Linux is famous for its minimalism, rolling releases and excellent documentation. In this course we build a complete system from the live ISO: partitioning, encryption, bootloader, networking, a desktop environment and maintenance routines. You will finish with a fast, personalized system and a much deeper understanding of Linux.',
    objectives: [
      'Install Arch Linux on UEFI hardware step by step',
      'Set up LUKS full-disk encryption correctly',
      'Configure systemd-boot and kernel parameters',
      'Install a desktop environment and essential packages',
      'Maintain a rolling-release system safely',
    ],
    tags: ['arch', 'linux', 'uefi', 'luks'],
    requirements: ['Comfort with the Linux command line', 'A spare machine or virtual machine'],
    lessons: [
      { title: 'The Arch Way & Preparing Installation Media', youtubeId: 'ZtqBQ68cfJc', duration: 20, description: 'What makes Arch different, and preparing a bootable USB.', isPreview: true },
      { title: 'Partitioning & LUKS Encryption', youtubeId: 'sWbUDq4S6Y8', duration: 32, description: 'GPT, EFI partitions, LUKS2 and mounting the new system.' },
      { title: 'pacstrap, fstab & the Chroot', youtubeId: 'ZtqBQ68cfJc', duration: 28, description: 'Install the base system and configure it from inside arch-chroot.' },
      { title: 'Bootloaders, Kernels & Microcode', youtubeId: 'sWbUDq4S6Y8', duration: 24, description: 'systemd-boot, kernel options and early microcode loading.' },
      { title: 'Desktop, Audio & Daily Maintenance', youtubeId: 'ZtqBQ68cfJc', duration: 30, description: 'A practical post-install setup and a safe update routine.' },
    ],
  },
  {
    title: 'RHEL Administration Bootcamp',
    titleTe: 'RHEL అడ్మినిస్ట్రేషన్ బూట్‌క్యాంప్',
    slug: 'rhel-administration-bootcamp',
    category: 'red-hat-enterprise-linux',
    difficulty: 'INTERMEDIATE',
    featured: true,
    description: 'Enterprise Linux administration with Red Hat Enterprise Linux: users, storage, SELinux, firewalls, systemd and troubleshooting.',
    longDescription: 'Red Hat Enterprise Linux is the backbone of enterprise infrastructure. This bootcamp follows the skills tested in the RHCSA exam while keeping every concept practical. You will work with dnf, systemd, SELinux, firewalld, LVM and recovery workflows in realistic scenarios.',
    objectives: [
      'Manage RHEL users, groups and sudo policies',
      'Configure storage with LVM and fstab',
      'Troubleshoot SELinux denials confidently',
      'Secure services with firewalld',
      'Recover systems from boot failures',
    ],
    tags: ['rhel', 'selinux', 'systemd', 'rhcsa'],
    requirements: ['Basic Linux familiarity', 'A RHEL, Rocky Linux or AlmaLinux VM'],
    lessons: [
      { title: 'RHEL Architecture & Subscription Basics', youtubeId: 'ZtqBQ68cfJc', duration: 22, description: 'RHEL release streams, repositories and registration.', isPreview: true },
      { title: 'Users, sudo & PAM Essentials', youtubeId: 'sWbUDq4S6Y8', duration: 26, description: 'Account management and privilege delegation done safely.' },
      { title: 'Storage, LVM & Filesystems', youtubeId: 'ZtqBQ68cfJc', duration: 34, description: 'Create and extend logical volumes, mount options and fstab.' },
      { title: 'SELinux Without Tears', youtubeId: 'sWbUDq4S6Y8', duration: 30, description: 'Contexts, booleans and reading audit logs to fix denials.' },
      { title: 'Firewalld, Networking & Troubleshooting', youtubeId: 'qiQR5rTSshw', duration: 28, description: 'Open services safely and debug connectivity issues.' },
    ],
  },
  {
    title: 'Ubuntu Server Mastery',
    titleTe: 'ఉబుంటు సర్వర్ మాస్టరీ',
    slug: 'ubuntu-server-mastery',
    category: 'ubuntu',
    difficulty: 'INTERMEDIATE',
    description: 'Turn a fresh Ubuntu Server install into a secure, automated and observable production host.',
    longDescription: 'Ubuntu Server powers a huge share of the cloud. This course covers the practical work of running it: SSH hardening, UFW, automatic updates, systemd services, backups and monitoring. By the end you will have a repeatable server setup you can reuse for real projects.',
    objectives: [
      'Harden SSH and configure a firewall',
      'Automate updates and backups',
      'Write and manage systemd services',
      'Set up monitoring and log rotation',
      'Deploy a containerized application',
    ],
    tags: ['ubuntu', 'server', 'ssh', 'ufw'],
    requirements: ['A Ubuntu Server VM or cloud instance', 'Basic command-line knowledge'],
    lessons: [
      { title: 'Provisioning & First Login', youtubeId: 'ZtqBQ68cfJc', duration: 18, description: 'Cloud-init, SSH keys and initial updates.', isPreview: true },
      { title: 'Hardening SSH, UFW & Fail2ban', youtubeId: 'sWbUDq4S6Y8', duration: 26, description: 'A practical security baseline for any server.' },
      { title: 'systemd Services & Timers', youtubeId: 'ZtqBQ68cfJc', duration: 24, description: 'Run your own services and schedule work without cron.' },
      { title: 'Backups, Monitoring & Upgrades', youtubeId: 'sWbUDq4S6Y8', duration: 28, description: 'Restic backups, log rotation and safe release upgrades.' },
    ],
  },
  {
    title: 'Python for Absolute Beginners',
    titleTe: 'పైథాన్ — పూర్తి ప్రారంభకులకు',
    slug: 'python-for-absolute-beginners',
    category: 'python',
    difficulty: 'BEGINNER',
    featured: true,
    description: 'Learn Python from zero with small projects, clear explanations and no assumed programming background.',
    descriptionTe: 'ప్రోగ్రామింగ్ అనుభవం లేని వారికి కూడా అర్థమయ్యే విధంగా, చిన్న ప్రాజెక్టులతో పైథాన్ నేర్చుకోండి.',
    longDescription: 'Python is the most practical first language for many people. In this course you will learn by building: a tip calculator, a file organizer, a weather CLI and a small API. Every concept is introduced when you need it, with exercises and solutions.',
    objectives: [
      'Write clean Python with variables, loops and functions',
      'Work with files, JSON and the standard library',
      'Understand errors and debug effectively',
      'Use virtual environments and pip',
      'Build a small command-line application',
    ],
    objectivesTe: ['పైథాన్ ప్రాథమిక అంశాలు', 'ఫైల్స్ మరియు JSON తో పని', 'చిన్న CLI ప్రాజెక్ట్ నిర్మాణం'],
    tags: ['python', 'programming', 'beginner', 'automation'],
    requirements: ['A computer with Python 3.10+ installed', 'Curiosity and a little patience'],
    lessons: [
      { title: 'Your First Python Program', youtubeId: 'rfscVS0vtbw', duration: 16, description: 'Install Python, use the REPL and write your first script.', isPreview: true },
      { title: 'Variables, Types & Control Flow', youtubeId: 'rfscVS0vtbw', duration: 26, description: 'Numbers, strings, conditionals and loops with exercises.' },
      { title: 'Functions, Modules & Packages', youtubeId: 'rfscVS0vtbw', duration: 28, description: 'Organize code into reusable functions and modules.' },
      { title: 'Files, JSON & Exceptions', youtubeId: 'rfscVS0vtbw', duration: 30, description: 'Read and write real data, and handle failure gracefully.' },
      { title: 'Virtual Environments & pip', youtubeId: 'rfscVS0vtbw', duration: 18, description: 'Keep project dependencies isolated and reproducible.' },
      { title: 'Project: Build a File Organizer', youtubeId: 'rfscVS0vtbw', duration: 35, description: 'Apply everything to a useful automation script.' },
    ],
  },
  {
    title: 'Modern JavaScript & TypeScript',
    titleTe: 'మోడరన్ JavaScript & TypeScript',
    slug: 'modern-javascript-and-typescript',
    category: 'html-css-javascript',
    difficulty: 'INTERMEDIATE',
    featured: true,
    description: 'From language fundamentals to async patterns, modules and type-safe TypeScript you can use at work.',
    longDescription: 'JavaScript is everywhere, but modern JavaScript is very different from the code of ten years ago. This course covers ES modules, async/await, the event loop, functional patterns and a practical introduction to TypeScript. You will build small interactive projects and finish with a typed utility library.',
    objectives: [
      'Use modern syntax and ES modules confidently',
      'Understand closures, scope and the event loop',
      'Write reliable async code with promises and await',
      'Model data with TypeScript types and generics',
      'Test and refactor JavaScript code',
    ],
    tags: ['javascript', 'typescript', 'web', 'async'],
    requirements: ['Basic HTML and CSS', 'Node.js installed'],
    lessons: [
      { title: 'Modern Syntax, Scope & Modules', youtubeId: 'PkZNo7MFNFg', duration: 24, description: 'let/const, destructuring, spread and ES modules.', isPreview: true },
      { title: 'Functions, Closures & the Event Loop', youtubeId: 'PkZNo7MFNFg', duration: 28, description: 'Why JavaScript behaves the way it does.' },
      { title: 'Promises, Async/Await & Error Handling', youtubeId: 'PkZNo7MFNFg', duration: 30, description: 'Write async code that is readable and safe.' },
      { title: 'TypeScript Fundamentals', youtubeId: 'PkZNo7MFNFg', duration: 32, description: 'Types, interfaces, narrowing and generics.' },
      { title: 'Project: A Typed Data Toolkit', youtubeId: 'PkZNo7MFNFg', duration: 34, description: 'Build and test a small TypeScript library.' },
    ],
  },
  {
    title: 'React + Node.js Full-Stack Development',
    titleTe: 'రియాక్ట్ + నోడ్.js ఫుల్-స్టాక్ డెవలప్‌మెంట్',
    slug: 'react-nodejs-fullstack-development',
    category: 'react-nodejs',
    difficulty: 'INTERMEDIATE',
    featured: true,
    description: 'Build a production-style full-stack app with React, TypeScript, Express, Prisma and PostgreSQL.',
    longDescription: 'This is the course we wish existed when we started building full-stack products. You will build a real application with authentication, role-based access, a REST API, a PostgreSQL database and a polished React front end. We cover the details that tutorials often skip: validation, error states, security and deployment.',
    objectives: [
      'Design a clean REST API with Express',
      'Model relational data with Prisma and PostgreSQL',
      'Implement secure cookie-based authentication',
      'Build reusable React components and hooks',
      'Deploy a full-stack application',
    ],
    objectivesTe: ['Express తో REST API', 'Prisma మరియు PostgreSQL', 'React ఫ్రంటెండ్', 'సురక్షిత authentication'],
    tags: ['react', 'node', 'typescript', 'prisma'],
    requirements: ['Comfortable with JavaScript', 'Basic HTML and CSS'],
    lessons: [
      { title: 'Architecture & Project Setup', youtubeId: 'TlB_eWDSMt4', duration: 20, description: 'Monorepo structure, tooling and environment variables.', isPreview: true },
      { title: 'Building the Express API', youtubeId: 'TlB_eWDSMt4', duration: 32, description: 'Routing, middleware, validation and error handling.' },
      { title: 'Prisma & PostgreSQL Data Modelling', youtubeId: 'TlB_eWDSMt4', duration: 30, description: 'Schema design, migrations and relations.' },
      { title: 'Authentication & Authorization', youtubeId: 'TlB_eWDSMt4', duration: 34, description: 'Password hashing, sessions, CSRF and RBAC.' },
      { title: 'React Frontend & Data Fetching', youtubeId: 'bMknfKXIFA8', duration: 36, description: 'Routing, forms, query caching and loading states.' },
      { title: 'Testing & Deployment', youtubeId: 'bMknfKXIFA8', duration: 28, description: 'Integration tests, builds and production deployment.' },
    ],
  },
  {
    title: 'Java Programming Foundations',
    titleTe: 'జావా ప్రోగ్రామింగ్ ఫౌండేషన్స్',
    slug: 'java-programming-foundations',
    category: 'java',
    difficulty: 'BEGINNER',
    description: 'Learn object-oriented programming with Java, from your first class to collections, exceptions and a small project.',
    longDescription: 'Java remains one of the most employable languages in the world. This course teaches programming fundamentals through Java: classes, objects, inheritance, interfaces, collections and exceptions. Each module ends with a practical exercise, and the final project is a console-based library manager.',
    objectives: [
      'Write object-oriented Java programs',
      'Use collections and generics appropriately',
      'Handle exceptions and write testable code',
      'Understand the JVM and build tooling',
      'Complete a small console application',
    ],
    tags: ['java', 'oop', 'jvm', 'programming'],
    requirements: ['JDK 17 or newer', 'No prior Java experience required'],
    lessons: [
      { title: 'Setting Up Java & Your First Class', youtubeId: 'eIrMbAQSU34', duration: 20, description: 'JDK, IntelliJ IDEA and the structure of a Java program.', isPreview: true },
      { title: 'Objects, Inheritance & Interfaces', youtubeId: 'eIrMbAQSU34', duration: 30, description: 'The four pillars of OOP with real examples.' },
      { title: 'Collections, Generics & Streams', youtubeId: 'eIrMbAQSU34', duration: 32, description: 'Work with lists, maps and the Stream API.' },
      { title: 'Exceptions & File I/O', youtubeId: 'eIrMbAQSU34', duration: 26, description: 'Fail gracefully and read real data.' },
      { title: 'Project: Console Library Manager', youtubeId: 'eIrMbAQSU34', duration: 35, description: 'Bring it all together in a small application.' },
    ],
  },
  {
    title: 'C & C++ Systems Programming',
    titleTe: 'సి & సి++ సిస్టమ్స్ ప్రోగ్రామింగ్',
    slug: 'c-cpp-systems-programming',
    category: 'c-cpp',
    difficulty: 'INTERMEDIATE',
    description: 'Understand memory, pointers and performance by writing real systems code in C and modern C++.',
    longDescription: 'C and C++ sit close to the hardware. This course teaches pointers, memory management, data structures and the build process, then moves into modern C++ with RAII, smart pointers and the standard library. Ideal for embedded, systems and performance-sensitive work.',
    objectives: [
      'Master pointers and manual memory management',
      'Build and debug C programs with gcc and gdb',
      'Understand the stack, heap and undefined behaviour',
      'Use modern C++ features safely',
      'Implement core data structures',
    ],
    tags: ['c', 'cpp', 'systems', 'memory'],
    requirements: ['A Linux machine or WSL', 'Basic programming knowledge'],
    lessons: [
      { title: 'Compilation, Linking & Your First C Program', youtubeId: 'vLnPwxZdW4Y', duration: 22, description: 'How source becomes an executable.', isPreview: true },
      { title: 'Pointers, Arrays & the Stack', youtubeId: 'vLnPwxZdW4Y', duration: 30, description: 'The mental model that makes C click.' },
      { title: 'Heap Memory & Data Structures', youtubeId: 'vLnPwxZdW4Y', duration: 34, description: 'malloc/free, linked lists and dynamic arrays.' },
      { title: 'Modern C++: RAII & Smart Pointers', youtubeId: 'vLnPwxZdW4Y', duration: 32, description: 'Write safe C++ without manual delete.' },
      { title: 'Debugging with gdb & Sanitizers', youtubeId: 'vLnPwxZdW4Y', duration: 26, description: 'Find memory bugs before your users do.' },
    ],
  },
  {
    title: 'Machine Learning Foundations',
    titleTe: 'మెషీన్ లెర్నింగ్ ఫౌండేషన్స్',
    slug: 'machine-learning-foundations',
    category: 'machine-learning',
    difficulty: 'INTERMEDIATE',
    featured: true,
    description: 'A practical introduction to machine learning: data preparation, regression, classification, evaluation and responsible deployment.',
    longDescription: 'Machine learning is a tool, not magic. This course builds intuition and practical skill together. You will use Python and scikit-learn to prepare data, train models, evaluate them honestly and avoid the most common traps. No PhD required, but we do not skip the important details.',
    objectives: [
      'Prepare and explore real datasets',
      'Train regression and classification models',
      'Evaluate models with the right metrics',
      'Recognize overfitting and data leakage',
      'Communicate model results responsibly',
    ],
    tags: ['machine-learning', 'python', 'scikit-learn', 'data'],
    requirements: ['Basic Python', 'High-school level algebra helpful'],
    lessons: [
      { title: 'What Machine Learning Can (and Cannot) Do', youtubeId: 'aircAruvnKk', duration: 20, description: 'A grounded mental model for ML projects.', isPreview: true },
      { title: 'Data Cleaning & Feature Engineering', youtubeId: 'i_LwzRVP7bg', duration: 32, description: 'The work that decides most project outcomes.' },
      { title: 'Regression & Classification with scikit-learn', youtubeId: 'i_LwzRVP7bg', duration: 36, description: 'Train your first models end to end.' },
      { title: 'Evaluation, Overfitting & Cross-Validation', youtubeId: 'i_LwzRVP7bg', duration: 30, description: 'Measure what matters and avoid fooling yourself.' },
      { title: 'A Small End-to-End Project', youtubeId: 'i_LwzRVP7bg', duration: 34, description: 'From raw CSV to a documented model.' },
    ],
  },
  {
    title: 'VLSI Design Flow: RTL to GDSII',
    titleTe: 'VLSI డిజైన్ ఫ్లో: RTL నుండి GDSII',
    slug: 'vlsi-design-flow-rtl-to-gdsii',
    category: 'vlsi-semiconductor',
    difficulty: 'ADVANCED',
    description: 'Understand the complete digital chip design flow, from Verilog RTL through synthesis, place and route, to signoff.',
    longDescription: 'The semiconductor industry needs engineers who understand the whole flow. This course introduces digital design with Verilog, then walks through synthesis, static timing analysis, floorplanning, placement, routing and physical verification. You will use open-source tools for hands-on labs and learn the vocabulary used in real tapeouts.',
    objectives: [
      'Write synthesizable Verilog for real blocks',
      'Understand timing constraints and STA',
      'Explain synthesis and physical design stages',
      'Read standard-cell and liberty timing data',
      'Run an open-source RTL-to-GDSII flow',
    ],
    tags: ['vlsi', 'verilog', 'rtl', 'semiconductor'],
    requirements: ['Digital logic fundamentals', 'Linux command line basics'],
    lessons: [
      { title: 'Digital Design & Verilog Refresher', youtubeId: '0B5eIE_1vpU', duration: 26, description: 'Combinational and sequential logic in Verilog.', isPreview: true },
      { title: 'Synthesis & Static Timing Analysis', youtubeId: '0B5eIE_1vpU', duration: 34, description: 'Constraints, clocks and timing reports.' },
      { title: 'Floorplanning, Placement & Routing', youtubeId: '0B5eIE_1vpU', duration: 32, description: 'How a netlist becomes physical layout.' },
      { title: 'Signoff: DRC, LVS & Tapeout', youtubeId: '0B5eIE_1vpU', duration: 28, description: 'The checks that stand between design and silicon.' },
    ],
  },
  {
    title: 'DevOps with Docker, CI/CD & Kubernetes',
    titleTe: 'Docker, CI/CD & Kubernetes తో DevOps',
    slug: 'devops-docker-cicd-kubernetes',
    category: 'devops-cloud',
    difficulty: 'INTERMEDIATE',
    featured: true,
    description: 'Ship software reliably with containers, automated pipelines and Kubernetes fundamentals.',
    longDescription: 'DevOps is a set of practices, not a job title. This course focuses on the practices that make deployments boring: reproducible builds, container images, CI pipelines, infrastructure as code and observability. You will containerize an app, automate tests, and deploy it to a Kubernetes cluster.',
    objectives: [
      'Build small, secure Docker images',
      'Write CI pipelines that test and build automatically',
      'Deploy applications with Kubernetes manifests',
      'Manage configuration and secrets properly',
      'Add logs, metrics and health checks',
    ],
    tags: ['devops', 'docker', 'kubernetes', 'ci-cd', 'cloud'],
    requirements: ['Linux basics', 'Git fundamentals'],
    lessons: [
      { title: 'DevOps Principles & the Delivery Pipeline', youtubeId: '3c-iBn73dDE', duration: 20, description: 'What high-performing teams actually optimize.', isPreview: true },
      { title: 'Docker Images, Layers & Compose', youtubeId: '3c-iBn73dDE', duration: 34, description: 'Build lean images and run multi-service apps.' },
      { title: 'CI/CD with GitHub Actions', youtubeId: '3c-iBn73dDE', duration: 30, description: 'Automate tests, builds and releases.' },
      { title: 'Kubernetes Core Concepts', youtubeId: 'X48VuDVv0do', duration: 36, description: 'Pods, deployments, services and ingress.' },
      { title: 'Observability & Safe Rollouts', youtubeId: 'X48VuDVv0do', duration: 28, description: 'Logs, metrics and zero-downtime deployments.' },
      { title: 'Capstone: Deploy a Full-Stack App', youtubeId: 'X48VuDVv0do', duration: 40, description: 'Put the whole pipeline together.' },
    ],
  },
  {
    title: 'Cybersecurity Essentials',
    titleTe: 'సైబర్ భద్రత ఎసెన్షియల్స్',
    slug: 'cybersecurity-essentials',
    category: 'cybersecurity',
    difficulty: 'BEGINNER',
    featured: true,
    description: 'Learn the security mindset and the practical defenses every developer and sysadmin should know.',
    longDescription: 'Security is not a product you bolt on at the end. This course covers threat modelling, authentication, web application security, Linux hardening and incident response basics. We use safe labs and legal practice environments to build real skills.',
    objectives: [
      'Think in terms of threats, assets and trust boundaries',
      'Prevent and test for OWASP Top 10 issues',
      'Harden Linux hosts and SSH',
      'Understand password storage and session security',
      'Respond to a basic security incident',
    ],
    tags: ['security', 'owasp', 'linux', 'hacking'],
    requirements: ['Basic Linux and web knowledge', 'A virtual machine for labs'],
    lessons: [
      { title: 'The Security Mindset & Threat Modelling', youtubeId: 'inWWhr5tnEA', duration: 22, description: 'Assets, attackers and trust boundaries.', isPreview: true },
      { title: 'Authentication, Sessions & Password Storage', youtubeId: 'inWWhr5tnEA', duration: 30, description: 'Why bcrypt/argon2 and httpOnly cookies matter.' },
      { title: 'Web Security: OWASP Top 10 in Practice', youtubeId: 'inWWhr5tnEA', duration: 36, description: 'XSS, injection, CSRF, SSRF and access control.' },
      { title: 'Linux Hardening & Monitoring', youtubeId: 'inWWhr5tnEA', duration: 28, description: 'A practical baseline for servers.' },
      { title: 'Incident Response Basics', youtubeId: 'inWWhr5tnEA', duration: 24, description: 'Detect, contain, eradicate and learn.' },
    ],
  },
  {
    title: 'Embedded Systems & IoT Foundations',
    titleTe: 'ఎంబెడెడ్ సిస్టమ్స్ & IoT ఫౌండేషన్స్',
    slug: 'embedded-systems-iot-foundations',
    category: 'robotics-iot',
    difficulty: 'BEGINNER',
    description: 'Build your first connected device: microcontrollers, sensors, GPIO, communication protocols and the cloud.',
    longDescription: 'The physical world is full of small computers. This course introduces embedded programming with Arduino and ESP32, sensor integration, serial protocols and connecting devices to the internet safely. You will build a sensor dashboard and a simple home automation project.',
    objectives: [
      'Program microcontrollers with confidence',
      'Read sensors and control actuators over GPIO',
      'Use I2C, SPI and UART correctly',
      'Connect a device to Wi-Fi and MQTT',
      'Design a simple IoT architecture',
    ],
    tags: ['embedded', 'iot', 'esp32', 'arduino'],
    requirements: ['An ESP32 or Arduino board', 'Basic programming knowledge'],
    lessons: [
      { title: 'Microcontrollers, GPIO & Your First Blink', youtubeId: '7vhvnaWUZjE', duration: 20, description: 'Meet the board, toolchain and GPIO.', isPreview: true },
      { title: 'Sensors, ADC & Serial Protocols', youtubeId: '7vhvnaWUZjE', duration: 30, description: 'Read real-world signals reliably.' },
      { title: 'Wi-Fi, MQTT & Cloud Dashboards', youtubeId: '7vhvnaWUZjE', duration: 32, description: 'Publish sensor data and visualize it.' },
      { title: 'Project: Home Automation Mini-Build', youtubeId: '7vhvnaWUZjE', duration: 36, description: 'Design, build and secure a small IoT project.' },
    ],
  },
  {
    title: 'AI & LLM Application Development',
    titleTe: 'AI & LLM అప్లికేషన్ డెవలప్‌మెంట్',
    slug: 'ai-llm-application-development',
    category: 'artificial-intelligence',
    difficulty: 'INTERMEDIATE',
    featured: true,
    description: 'Build useful AI features responsibly: prompt design, retrieval, evaluation, safety and cost control.',
    longDescription: 'Large language models are powerful building blocks, but shipping a reliable AI feature takes more than a prompt. This course covers how LLMs work at a practical level, prompt and context design, retrieval-augmented generation, evaluation, guardrails and cost management. You will build a documentation assistant from scratch.',
    objectives: [
      'Understand tokens, context and model trade-offs',
      'Design prompts and structured outputs',
      'Build retrieval-augmented generation pipelines',
      'Evaluate AI features with real test sets',
      'Add guardrails and control costs',
    ],
    tags: ['ai', 'llm', 'rag', 'prompt-engineering'],
    requirements: ['Basic programming experience', 'Curiosity about AI systems'],
    lessons: [
      { title: 'How LLMs Actually Work (Without the Hype)', youtubeId: 'aircAruvnKk', duration: 24, description: 'Tokens, embeddings and context windows.', isPreview: true },
      { title: 'Prompt Design & Structured Output', youtubeId: 'aircAruvnKk', duration: 28, description: 'Reliable prompts, schemas and failure modes.' },
      { title: 'Retrieval-Augmented Generation', youtubeId: 'aircAruvnKk', duration: 34, description: 'Chunking, embeddings, search and citations.' },
      { title: 'Evaluation, Safety & Cost Control', youtubeId: 'aircAruvnKk', duration: 30, description: 'Measure quality and keep production healthy.' },
    ],
  },
];

const tutorials = [
  {
    title: '20 Linux Commands Every Developer Should Know',
    titleTe: 'ప్రతి డెవలపర్ తెలుసుకోవాల్సిన 20 లినక్స్ కమాండ్లు',
    slug: '20-linux-commands-every-developer-should-know',
    category: 'linux',
    featured: true,
    readMinutes: 8,
    tags: ['linux', 'bash', 'terminal'],
    excerpt: 'A practical tour of the commands you will use every day — from finding files to debugging ports.',
    excerptTe: 'ఫైల్స్ వెతకడం నుండి పోర్ట్‌లను డీబగ్ చేయడం వరకు రోజువారీగా ఉపయోగించే లినక్స్ కమాండ్ల సంక్షిప్త పరిచయం.',
    content: `The terminal is not a relic — it is the fastest interface you will ever use. Here are the commands we reach for daily.

## Finding things

\`\`\`bash
# Find files by name
find . -type f -name "*.log"

# Search inside files (ripgrep is faster)
rg "TODO" src/

# Locate a binary
which node
\`\`\`

## Inspecting processes and ports

\`\`\`bash
ps aux | grep nginx
ss -tulpn | grep 3000
top -o %CPU
\`\`\`

\`ss\` is the modern replacement for \`netstat\` and is usually already installed.

## Working with files

\`\`\`bash
du -sh * | sort -h
df -h
tar -czf backup.tar.gz project/
\`\`\`

## Networking

\`\`\`bash
curl -I https://techtuxacademy.online
ping -c 4 1.1.1.1
dig example.com +short
\`\`\`

## Permissions

\`\`\`bash
chmod 640 secrets.env
chown -R deploy:deploy /srv/app
\`\`\`

## Pro tips

- Use \`Ctrl+R\` to search your shell history.
- Alias the commands you type most: \`alias gs="git status"\`.
- Read \`man\` pages with \`/\` to search.
- Prefer \`rg\` over \`grep -r\` for codebases.

The goal is not memorising flags. It is building a small vocabulary that lets you ask the system direct questions. Practice five commands a day for a week and the terminal stops feeling like a foreign country.`,
  },
  {
    title: 'Install Arch Linux: A Calm, Step-by-Step Guide',
    titleTe: 'ఆర్చ్ లినక్స్ ఇన్‌స్టాల్: ప్రశాంతమైన స్టెప్-బై-స్టెప్ గైడ్',
    slug: 'install-arch-linux-calm-step-by-step-guide',
    category: 'arch-linux',
    featured: true,
    readMinutes: 12,
    tags: ['arch', 'linux', 'install'],
    excerpt: 'UEFI, LUKS encryption, systemd-boot and a sane post-install setup — explained without the intimidation.',
    content: `Arch has a reputation for being difficult. It is not difficult so much as *explicit*: you decide what goes on the system.

> Always follow the official Arch wiki for the current release. This guide is a companion, not a replacement.

## 1. Boot the ISO and verify UEFI

\`\`\`bash
ls /sys/firmware/efi/efivars
\`\`\`

If the directory exists, you booted in UEFI mode.

## 2. Partition the disk

For a simple encrypted setup on \`/dev/nvme0n1\`:

\`\`\`bash
fdisk /dev/nvme0n1
# 1: 512M EFI System
# 2: remaining space Linux filesystem
\`\`\`

## 3. Set up LUKS

\`\`\`bash
cryptsetup luksFormat /dev/nvme0n1p2
cryptsetup open /dev/nvme0n1p2 cryptroot
mkfs.ext4 /dev/mapper/cryptroot
mkfs.fat -F32 /dev/nvme0n1p1
\`\`\`

## 4. Mount and install

\`\`\`bash
mount /dev/mapper/cryptroot /mnt
mount --mkdir /dev/nvme0n1p1 /mnt/boot
pacstrap -K /mnt base linux linux-firmware networkmanager vim sudo
genfstab -U /mnt >> /mnt/etc/fstab
arch-chroot /mnt
\`\`\`

## 5. Configure the base system

\`\`\`bash
ln -sf /usr/share/zoneinfo/Asia/Kolkata /etc/localtime
hwclock --systohc
echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
locale-gen
echo "techtux" > /etc/hostname
passwd
systemctl enable NetworkManager
\`\`\`

## 6. Bootloader

\`\`\`bash
bootctl install
\`\`\`

Edit \`/boot/loader/entries/arch.conf\` and add the kernel parameters:

\`\`\`text
cryptdevice=UUID=YOUR-UUID:cryptroot root=/dev/mapper/cryptroot rw
\`\`\`

## 7. Reboot and update

\`\`\`bash
exit
umount -R /mnt
reboot
\`\`\`

After logging in, create a user, install a desktop and keep a maintenance habit:

\`\`\`bash
sudo pacman -Syu
\`\`\`

Arch rewards understanding. Take it slowly, read the wiki, and keep notes. Your second install will take twenty minutes.`,
  },
  {
    title: 'Python Virtual Environments Explained',
    slug: 'python-virtual-environments-explained',
    category: 'python',
    readMinutes: 6,
    tags: ['python', 'pip', 'venv'],
    excerpt: 'Stop installing packages globally. Learn how venv, pip and requirements files keep projects reproducible.',
    content: `Every Python project should live in its own virtual environment. It prevents version conflicts and makes your project reproducible for other people.

## Create an environment

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
\`\`\`

On Windows PowerShell:

\`\`\`powershell
.venv\\Scripts\\Activate.ps1
\`\`\`

## Install and record dependencies

\`\`\`bash
pip install requests fastapi uvicorn
pip freeze > requirements.txt
\`\`\`

For applications, consider \`pip-tools\` or \`uv\` to separate direct and transitive dependencies.

## Recreate the environment

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
\`\`\`

## Common mistakes

- Committing \`.venv/\` to Git. Add it to \`.gitignore\`.
- Running \`sudo pip install\`. Never do this.
- Mixing system Python packages with project packages.
- Forgetting to pin versions in production.

## A cleaner workflow

\`\`\`bash
# .gitignore
.venv/
__pycache__/
*.pyc
.env
\`\`\`

Virtual environments are one of the highest-value habits in Python. Set them up once per project and your future self will thank you.`,
  },
  {
    title: 'Build a Secure REST API with Express and Prisma',
    titleTe: 'Express మరియు Prisma తో సురక్షిత REST API నిర్మాణం',
    slug: 'build-secure-rest-api-express-prisma',
    category: 'react-nodejs',
    readMinutes: 10,
    tags: ['node', 'express', 'prisma', 'security'],
    excerpt: 'A production-minded checklist for validation, authentication, authorization, rate limiting and safe errors.',
    content: `A REST API is easy to start and surprisingly easy to get wrong. Here is the checklist we use before shipping.

## 1. Validate every input

\`\`\`ts
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(3).max(140),
  published: z.boolean().optional(),
});

app.post('/api/courses', (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ error: result.error.flatten() });
  }
  // result.data is now typed and safe
});
\`\`\`

## 2. Never trust the client for authorization

Check the role on the server for every protected route. Hiding a button is not security.

\`\`\`ts
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
\`\`\`

## 3. Hash passwords properly

Use bcrypt, scrypt or argon2. Never store or log plaintext passwords.

\`\`\`ts
const hash = await bcrypt.hash(password, 12);
const ok = await bcrypt.compare(candidate, hash);
\`\`\`

## 4. Use httpOnly cookies and CSRF protection

Session cookies should be \`httpOnly\`, \`secure\` in production and \`sameSite\` where possible. Pair cookies with a double-submit CSRF token for state-changing requests.

## 5. Rate limit auth endpoints

\`\`\`ts
import rateLimit from 'express-rate-limit';

app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, max: 30 }));
\`\`\`

## 6. Return safe errors

Log the stack trace on the server. Return a generic message to clients in production. Do not leak database internals.

## 7. Use Prisma safely

Prisma parameterizes queries, which prevents SQL injection. Avoid raw SQL unless necessary, and never interpolate user input into it.

\`\`\`ts
const course = await prisma.course.findUnique({
  where: { slug: req.params.slug },
  include: { lessons: { orderBy: { order: 'asc' } } },
});
\`\`\`

Security is a set of small decisions repeated consistently. Put these seven checks in your template and every new endpoint starts on solid ground.`,
  },
  {
    title: 'Docker in 10 Minutes: A Practical Primer',
    slug: 'docker-in-10-minutes-practical-primer',
    category: 'devops-cloud',
    readMinutes: 7,
    tags: ['docker', 'devops', 'containers'],
    excerpt: 'Images, containers, volumes and a production-ready Dockerfile — the concepts that actually matter.',
    content: `Docker packages an application and its dependencies into an image that runs the same way everywhere.

## The mental model

- **Image**: a read-only template built from layers.
- **Container**: a running instance of an image.
- **Volume**: persistent storage outside the container lifecycle.
- **Registry**: where images are stored (Docker Hub, GHCR).

## Your first container

\`\`\`bash
docker run --rm -p 8080:80 nginx:alpine
\`\`\`

Visit \`http://localhost:8080\`. That is a real web server running in an isolated container.

## A production-minded Dockerfile

\`\`\`dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
\`\`\`

Small images, non-root user, reproducible installs.

## Compose for local development

\`\`\`yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
volumes:
  pgdata:
\`\`\`

\`\`\`bash
docker compose up -d
\`\`\`

## Rules of thumb

1. One process per container.
2. Keep secrets out of images.
3. Tag images with versions, not only \`latest\`.
4. Use health checks.
5. Clean up unused images and volumes.

Containers are not virtual machines. They share the host kernel and start in milliseconds — which is exactly why they changed how we deploy software.`,
  },
  {
    title: 'SQL Injection: How It Works and How to Stop It',
    slug: 'sql-injection-how-it-works-and-how-to-stop-it',
    category: 'cybersecurity',
    readMinutes: 8,
    tags: ['security', 'sql', 'owasp'],
    excerpt: 'A concrete look at the classic injection flaw, why string concatenation is dangerous, and the defenses that work.',
    content: `SQL injection remains one of the most damaging web vulnerabilities. The idea is simple: user input is interpreted as SQL code.

## A vulnerable example

\`\`\`js
// NEVER do this
const query = "SELECT * FROM users WHERE email = '" + email + "'";
\`\`\`

If \`email\` is \`' OR '1'='1\`, the query returns every user.

## The fix: parameterized queries

\`\`\`js
// node-postgres
const result = await pool.query(
  'SELECT id, name FROM users WHERE email = $1',
  [email]
);
\`\`\`

\`\`\`ts
// Prisma
const user = await prisma.user.findUnique({ where: { email } });
\`\`\`

The database receives the query structure and the values separately. Input can never become code.

## Defense in depth

1. **Parameterize** every query. No exceptions.
2. **Validate** input types and lengths.
3. **Use least-privilege database users** — the app should not be a superuser.
4. **Escape dynamic identifiers** (table/column names) with an allowlist, not string interpolation.
5. **Add logging and alerts** for repeated database errors.
6. **Run dependency and security scans** in CI.

## What does not work

- Blocking the word \`OR\` (bypasses are trivial).
- Client-side validation alone.
- WAFs as the only defense.

Parameterized queries are the primary defense. Everything else is a layer around it. If you use an ORM correctly, you get this protection by default — but raw queries still need care.`,
  },
  {
    title: 'VLSI Design Flow: From RTL to GDSII',
    titleTe: 'VLSI డిజైన్ ఫ్లో: RTL నుండి GDSII వరకు',
    slug: 'vlsi-design-flow-rtl-to-gdsii',
    category: 'vlsi-semiconductor',
    readMinutes: 9,
    tags: ['vlsi', 'verilog', 'semiconductor'],
    excerpt: 'A map of the digital chip design process and the vocabulary you need to follow a real tapeout.',
    content: `A modern chip is one of the most complex objects humans build. The design flow breaks that complexity into stages.

## 1. Specification and architecture

Define what the chip must do, performance targets, power budget and interfaces. Most costly mistakes originate here.

## 2. RTL design

Write synthesizable Verilog/SystemVerilog:

\`\`\`verilog
module counter #(parameter WIDTH = 8) (
  input  logic clk,
  input  logic rst,
  output logic [WIDTH-1:0] count
);
  always_ff @(posedge clk) begin
    if (rst) count <= '0;
    else     count <= count + 1'b1;
  end
endmodule
\`\`\`

## 3. Functional verification

Simulation, assertions and coverage. Verification often consumes more effort than design.

## 4. Synthesis

Convert RTL into a gate-level netlist mapped to a standard-cell library. Constraints define clock frequency and I/O timing.

## 5. Static timing analysis (STA)

Check setup and hold timing across corners. A design that simulates correctly can still fail timing.

## 6. Physical design

- Floorplanning: place major blocks.
- Placement: position standard cells.
- Clock tree synthesis: distribute the clock.
- Routing: connect everything legally.

## 7. Signoff

DRC (design rule check), LVS (layout vs schematic), timing and power signoff. Then GDSII is sent for fabrication.

## Skills that compound

- Digital logic and computer architecture
- Verilog/SystemVerilog
- Linux and scripting (Tcl, Python)
- Timing and physical design fundamentals

Open-source flows such as OpenROAD and OpenLane make it possible to practice the entire pipeline on a laptop. Start with a small block and take it all the way through.`,
  },
  {
    title: 'How to Read Linux Processes with ps and top',
    slug: 'how-to-read-linux-processes-with-ps-and-top',
    category: 'linux-administration',
    readMinutes: 6,
    tags: ['linux', 'processes', 'monitoring'],
    excerpt: 'Understand what your server is actually doing: process states, CPU, memory, load average and the tools that reveal them.',
    content: `Every program running on Linux is a process with an ID, an owner and a state. Reading that information is a core admin skill.

## A quick snapshot

\`\`\`bash
ps aux --sort=-%cpu | head -10
\`\`\`

Columns you care about:

- **PID**: process ID
- **%CPU / %MEM**: resource usage
- **STAT**: state (\`R\` running, \`S\` sleeping, \`D\` uninterruptible, \`Z\` zombie)
- **COMMAND**: what is running

## Live view

\`\`\`bash
top
# or the friendlier htop
htop
\`\`\`

Press \`P\` to sort by CPU, \`M\` by memory, \`k\` to kill a process (carefully).

## Load average explained

\`\`\`bash
uptime
# 14:02:11 up 9 days, load average: 0.42, 0.61, 0.55
\`\`\`

Load counts runnable and uninterruptible processes. On a 4-core machine, a load of 4 means fully utilized; 8 means heavy queueing. Context matters.

## Process trees and services

\`\`\`bash
pstree -p
systemctl status nginx
systemctl list-units --type=service --state=running
\`\`\`

## Finding a port

\`\`\`bash
ss -tulpn | grep :443
sudo lsof -i :3000
\`\`\`

## Signals

\`\`\`bash
kill -TERM <pid>   # graceful
kill -KILL <pid>   # force (last resort)
\`\`\`

Always try \`TERM\` first. \`KILL\` cannot be caught, so the process cannot clean up.

## A debugging habit

When something feels slow, check in this order: load average, CPU per process, memory and swap, disk I/O (\`iostat\`), then network. You will find the culprit faster than guessing.`,
  },
  {
    title: 'GPIO on Raspberry Pi: Your First IoT Circuit',
    slug: 'gpio-raspberry-pi-first-iot-circuit',
    category: 'robotics-iot',
    readMinutes: 7,
    tags: ['iot', 'raspberry-pi', 'gpio', 'python'],
    excerpt: 'Blink an LED, read a button and understand the electronics safety rules that keep your board alive.',
    content: `The GPIO header is how a Raspberry Pi talks to the physical world. Start with an LED and a resistor — seriously.

## What you need

- Raspberry Pi (any model with GPIO)
- Breadboard and jumper wires
- LED and a 330Ω resistor
- Push button (optional)

## Safety first

- Never connect 5V directly to a GPIO input.
- Always use a resistor with an LED.
- Power off before changing wiring.
- Check the pinout for your exact board revision.

## Blink with Python

\`\`\`python
from gpiozero import LED
from time import sleep

led = LED(17)  # BCM pin 17
while True:
    led.on()
    sleep(1)
    led.off()
    sleep(1)
\`\`\`

Run with \`python3 blink.py\`. Stop with \`Ctrl+C\`.

## Read a button

\`\`\`python
from gpiozero import Button
from signal import pause

button = Button(2)

button.when_pressed = lambda: print("Pressed!")
button.when_released = lambda: print("Released!")
pause()
\`\`\`

## From prototype to IoT

Once the circuit works, add connectivity:

1. Read a sensor (temperature, light, motion).
2. Publish readings over MQTT.
3. Store and visualize them in a dashboard.
4. Add authentication and rate limits.
5. Design for offline buffering and safe shutdown.

## Common mistakes

- Using the wrong pin numbering (BCM vs BOARD).
- Forgetting a common ground.
- Powering motors directly from GPIO.
- No pull-up/pull-down resistor on inputs.

Physical computing is the fastest way to make programming feel real. Keep the first circuit small, get it working, then add one sensor at a time.`,
  },
];

const posts = [
  {
    title: 'The 2026 Developer Roadmap: What Actually Matters',
    titleTe: '2026 డెవలపర్ రోడ్‌మ్యాప్: నిజంగా ముఖ్యమైనవి',
    slug: '2026-developer-roadmap-what-actually-matters',
    category: 'programming',
    featured: true,
    readMinutes: 9,
    tags: ['career', 'programming', 'learning'],
    excerpt: 'Ignore the infinite list of frameworks. These are the durable skills that compound across every stack.',
    excerptTe: 'అనంతమైన ఫ్రేమ్‌వర్క్‌ల జాబితాను పక్కన పెట్టండి. ప్రతి స్టాక్‌లో పనికొచ్చే శాశ్వత నైపుణ్యాలు ఇవే.',
    content: `Every January brings a new "developer roadmap" with 400 boxes. Most of it is noise. The skills that compound are surprisingly stable.

## 1. Fundamentals over frameworks

Frameworks change every few years. These do not:

- Data structures and algorithms (enough to reason, not to memorise)
- HTTP, DNS, TLS and how the web actually works
- Relational databases and SQL
- Git and collaboration
- Debugging and reading unfamiliar code

If you understand these, a new framework is a weekend. If you only know a framework, a new one is a crisis.

## 2. One language deeply, several pragmatically

Depth teaches transferable patterns. Breadth makes you useful. Pick a primary language based on the work you want: TypeScript for product web, Python for data/AI, Go for infrastructure, C/C++ for embedded.

## 3. AI literacy without dependency

Use AI tools to move faster, but verify everything. Learn to:

- Write precise prompts and structured specs
- Review generated code for security and correctness
- Build evaluation sets for AI features
- Understand cost, latency and privacy trade-offs

The developers who thrive are not the ones who refuse AI or outsource thinking to it. They are the ones who direct it well.

## 4. Linux and the command line

Almost all production software runs on Linux. Learn processes, permissions, networking, logs and containers. This is non-negotiable for backend, DevOps, security and embedded work.

## 5. Communication

The highest-leverage skill after fundamentals: writing clear docs, asking good questions, explaining trade-offs, and shipping small increments.

## A realistic 12-month plan

1. **Months 1–3:** one language + Git + SQL + a small project.
2. **Months 4–6:** HTTP, auth, testing, deploy something real.
3. **Months 7–9:** Linux, Docker, CI, observability.
4. **Months 10–12:** depth in your chosen domain + open source contributions.

Ignore the hype cycle. Build things, read code, ask why. That is still the whole game.`,
  },
  {
    title: 'Why Linux Still Wins in the Cloud',
    slug: 'why-linux-still-wins-in-the-cloud',
    category: 'linux',
    featured: true,
    readMinutes: 7,
    tags: ['linux', 'cloud', 'infrastructure'],
    excerpt: 'From containers to supercomputers, Linux quietly runs the modern world. Here is why that is unlikely to change soon.',
    content: `The cloud is often described as abstract and serverless. Underneath, it is an enormous fleet of Linux machines.

## The numbers are not close

Linux powers the majority of public cloud workloads, nearly all of the top supercomputers, most containers and the entire Android ecosystem. This is not an accident of history; it is a compounding advantage.

## Why Linux won

1. **Open source licensing.** Companies can modify, audit and deploy without per-seat negotiations.
2. **Automation-first design.** Everything is a file, a process or a text configuration. That makes infrastructure reproducible.
3. **Containerization.** Namespaces and cgroups were Linux features before Docker made them popular.
4. **Hardware support.** From tiny ARM boards to massive clusters, the same kernel family runs everywhere.
5. **Talent and documentation.** The ecosystem of knowledge is unmatched.

## What this means for your career

Even if you work primarily in JavaScript or Python, understanding Linux makes you dramatically more effective:

- Read logs and systemd units
- Diagnose memory and CPU issues
- Write safe deployment scripts
- Understand containers instead of cargo-culting them
- Secure a server without guessing

## The cloud is someone else's Linux

When you deploy to a managed platform, you are renting a Linux abstraction. The abstraction leaks at the worst possible moments — during incidents. The engineers who can go one layer down resolve those incidents faster.

## Start small

Install Linux, break it, fix it. Run a small VPS. Read \`man\` pages. Learn \`systemctl\`, \`journalctl\`, \`ss\` and \`ps\`. Build a container from scratch with a Dockerfile.

Linux is not going away. The investment is safe.`,
  },
  {
    title: 'RHEL 10: What Linux Admins Need to Know',
    slug: 'rhel-10-what-linux-admins-need-to-know',
    category: 'red-hat-enterprise-linux',
    readMinutes: 6,
    tags: ['rhel', 'linux', 'enterprise'],
    excerpt: 'The changes that matter for day-two operations, security and certification preparation.',
    content: `Major enterprise Linux releases move slowly by design. RHEL 10 is not about chasing trends; it is about a decade of stable operations.

## Themes to watch

- **Stronger defaults.** Security hardening and modern crypto policies continue to tighten.
- **Container-native workflows.** Podman and image-based provisioning are first-class.
- **Automation.** Ansible remains the operational language of RHEL estates.
- **Lifecycle.** Plan upgrades around support windows, not launch dates.

## What admins should practice

\`\`\`bash
# Inspect the OS
cat /etc/redhat-release
uname -r

# Services and logs
systemctl status sshd
journalctl -u sshd --since "1 hour ago"

# SELinux
getenforce
ausearch -m avc -ts recent

# Storage
lsblk
vgs && lvs && df -h
\`\`\`

## Upgrade planning checklist

1. Inventory applications and dependencies.
2. Test on a cloned environment, not production.
3. Check third-party repository support.
4. Validate SELinux policy and firewall rules.
5. Rehearse rollback.
6. Communicate a maintenance window.
7. Monitor aggressively for two weeks after.

## Certification advice

RHCSA and RHCA labs reward muscle memory. Practice without notes: create users, fix fstab, configure services, troubleshoot SELinux, recover a broken boot. Understanding *why* a command works beats memorising flags.

Enterprise Linux is a long game. The admins who succeed are systematic, curious and careful with change.`,
  },
  {
    title: 'From Electronics to AI: The New Hardware Renaissance',
    titleTe: 'ఎలక్ట్రానిక్స్ నుండి AI వరకు: కొత్త హార్డ్‌వేర్ పునరుజ్జీవనం',
    slug: 'from-electronics-to-ai-new-hardware-renaissance',
    category: 'electronics-communication',
    readMinutes: 8,
    tags: ['electronics', 'ai', 'semiconductor', 'hardware'],
    excerpt: 'AI is driving a new wave of chip design, embedded intelligence and electronics careers. Here is where the opportunities are.',
    content: `Software gets the headlines, but the AI era is fundamentally a hardware story. Every model runs on silicon, and demand is reshaping the semiconductor industry.

## The stack is getting thicker

A modern AI system spans:

- **Semiconductor fabrication** — advanced nodes, packaging, yield.
- **Chip design** — accelerators, memory architectures, verification.
- **Embedded systems** — inference at the edge, low power.
- **Electronics** — power delivery, signal integrity, thermal design.
- **Software** — compilers, runtimes, model optimization.

Specialists are valuable, but people who can reason across two or three layers are rare and increasingly essential.

## Where the jobs are

1. **Design verification** — always in demand, strong career path.
2. **Physical design** — timing, place and route, signoff.
3. **Embedded firmware** — C/C++, RTOS, hardware bring-up.
4. **Power and thermal engineering** — data centers are power-limited.
5. **AI accelerators** — architecture and compiler co-design.

## Skills to build now

- Digital logic and Verilog/SystemVerilog
- C and memory-aware programming
- Linux and scripting
- Python for analysis and automation
- Fundamentals of machine learning
- Clear technical communication

## India’s opportunity

India already has deep strengths in VLSI services, embedded design and electronics manufacturing is expanding. The next decade will reward engineers who combine hardware fundamentals with software fluency and AI awareness.

## How to start

Pick one project and take it end to end: design a small digital block, simulate it, synthesize it, and document the timing. Or build an ESP32 sensor node and deploy a tiny model. Depth on one complete project teaches more than ten tutorials.

The renaissance is not coming. It is already here.`,
  },
  {
    title: 'How to Learn Machine Learning Without Burning Out',
    slug: 'how-to-learn-machine-learning-without-burning-out',
    category: 'machine-learning',
    readMinutes: 7,
    tags: ['machine-learning', 'learning', 'career'],
    excerpt: 'A sustainable path through the hype: foundations, small projects and honest evaluation instead of endless courses.',
    content: `Machine learning has a motivation problem: the field is enormous, the hype is loud, and it is easy to feel behind before you start.

## Start with less maths than you think

You need linear algebra, basic probability and the idea of a derivative. You do not need to finish a full mathematics degree before training a model. Learn just enough to understand what the algorithm is optimising, then return for depth when a concept blocks you.

## Build a spine of projects

Courses give structure, but projects give understanding. A good progression:

1. Predict housing prices with linear regression.
2. Classify handwritten digits.
3. Build a text classifier with scikit-learn.
4. Create a retrieval-augmented assistant over your own notes.
5. Deploy one model behind a small API.

Each project should include data cleaning, evaluation and a short write-up.

## Evaluation is the real skill

Anyone can call \`fit()\`. The valuable skill is knowing whether the result means anything:

- Is the train/test split honest?
- Is there data leakage?
- Is accuracy the right metric?
- How does the model fail?
- What is the baseline?

## Avoid the course trap

Watching is not learning. For every hour of video, spend two hours writing code. If a course makes you feel productive but you cannot build without following along, you are entertaining yourself, not learning.

## A weekly rhythm

- **2 sessions:** focused study (60–90 minutes)
- **2 sessions:** project work
- **1 session:** read one paper, blog or documentation page
- **1 session:** review notes and explain a concept out loud

## Protect your attention

Unfollow hype accounts. Ignore claims that a new model makes all previous knowledge obsolete. Fundamentals compound; panic does not.

The goal is not to know everything. It is to become the person on your team who can turn a vague problem into a measured, useful model.`,
  },
  {
    title: 'Telugu Tech Education Is Having a Moment',
    titleTe: 'తెలుగు టెక్ విద్యకు కొత్త ఊపు',
    slug: 'telugu-tech-education-having-a-moment',
    category: 'programming',
    readMinutes: 5,
    tags: ['telugu', 'education', 'community'],
    excerpt: 'Why high-quality technical education in Indian languages matters — and how we are building it at TechTuxAcademy.',
    excerptTe: 'భారతీయ భాషల్లో నాణ్యమైన టెక్నికల్ విద్య ఎందుకు ముఖ్యం — TechTuxAcademy లో మేము ఎలా నిర్మిస్తున్నాము.',
    content: `English dominates technical education. That is useful for a global career, but it creates an unnecessary barrier for millions of talented learners.

## The barrier is real

A student in Vijayawada or Warangal may understand the concepts perfectly in Telugu, then struggle to follow a fast English video full of unfamiliar idioms. The problem is not intelligence or motivation. It is language friction at exactly the moment confidence is fragile.

## Bilingual is not about translation

Good Telugu technical content is not word-for-word translation. It is explanation designed for the learner: local examples, familiar analogies, and code comments that make sense.

At TechTuxAcademy we keep the interface, code and terminology professional, while offering Telugu titles, summaries and lesson notes for core topics. Students can switch languages without losing context.

## What we are building

- English-first courses with Telugu summaries and objectives
- Tutorials and articles in both languages
- Unicode Telugu support with the Noto Sans Telugu typeface
- A community where questions in Telugu are welcome

## How you can help

If you are a Telugu-speaking engineer, write one tutorial. Review a translation. Record a five-minute explanation. The ecosystem grows one contribution at a time.

Technology should be learnable by everyone, not only by those who are fluent in the language it was documented in.`,
  },
];

const testimonials = [
  { name: 'Ananya Sharma', role: 'B.Tech CSE Student, Hyderabad', quote: 'The Linux course finally made the terminal click for me. The lessons are short, practical and never feel like a lecture. I set up my first Arch install two weeks later.', quoteTe: 'లినక్స్ కోర్స్ తర్వాత టెర్మినల్ నా భయం పోయింది. రెండు వారాల్లో నేనే ఆర్చ్ ఇన్‌స్టాల్ చేశాను.', rating: 5, order: 1 },
  { name: 'Rahul Verma', role: 'Backend Developer, Bengaluru', quote: 'I used the React + Node full-stack course to rebuild my portfolio. The security section on cookies and CSRF alone was worth it.', rating: 5, order: 2 },
  { name: 'Sravani Reddy', role: 'ECE Graduate, Warangal', quote: 'The VLSI flow series is the clearest explanation I have found. It connected my college theory to what actually happens in a tapeout.', quoteTe: 'VLSI ఫ్లో సిరీస్ నా కాలేజీ థియరీని రియల్ టేపౌట్‌కు కలిపింది.', rating: 5, order: 3 },
  { name: 'Karthik Nair', role: 'DevOps Engineer, Kochi', quote: 'Docker and Kubernetes explained without cargo-culting. I finally understand why the manifests look the way they do.', rating: 5, order: 4 },
  { name: 'Meghana Rao', role: 'Python Learner, Vijayawada', quote: 'The Telugu summaries make a huge difference. I can read the concept in Telugu and then practice the code in English.', rating: 5, order: 5 },
  { name: 'Aditya Joshi', role: 'Embedded Engineer, Pune', quote: 'The IoT course helped me ship a sensor dashboard at work. Straightforward, no fluff, and the safety notes are genuinely useful.', rating: 4, order: 6 },
];

const announcements = [
  { title: 'New: AI & LLM Application Development', message: 'Our newest course covers prompt design, RAG, evaluation and shipping AI features responsibly. Enrol now and build a documentation assistant.', type: 'success', link: '/courses/ai-llm-application-development', active: true },
  { title: 'Telugu content is here', message: 'Select Telugu from the language switcher to read course summaries, tutorials and interface labels in Telugu.', type: 'info', active: true },
];

const settings: Record<string, unknown> = {
  siteName: 'TechTuxAcademy',
  tagline: 'Learn. Build. Innovate.',
  domain: 'techtuxacademy.online',
  heroEyebrow: 'A modern technology academy',
  heroTitle: 'Master Technology.',
  heroHighlight: 'Build Your Future.',
  heroDescription:
    'Practical, project-driven courses in Linux, programming, AI, electronics and cloud — taught with clarity, built for the real world. Learn in English or Telugu, at your own pace.',
  heroPrimaryCta: 'Explore Courses',
  heroSecondaryCta: 'Start Learning',
  aboutTitle: 'Technology education that respects your time',
  aboutDescription:
    'TechTuxAcademy is an independent learning platform for students, developers, Linux enthusiasts and electronics engineers. We focus on durable fundamentals, hands-on labs and honest explanations. No hype, no filler — just the skills that compound.',
  aboutMission:
    'Our mission is to make high-quality technology education accessible to every learner, including those who think and learn in Telugu. We build in the open, keep content practical, and measure success by what our students can build.',
  contactEmail: 'hello@techtuxacademy.online',
  contactPhone: '+91 90000 00000',
  contactAddress: 'Hyderabad, Telangana, India',
  socialTwitter: 'https://twitter.com/techtuxacademy',
  socialGithub: 'https://github.com/techtuxacademy',
  socialLinkedin: 'https://linkedin.com/company/techtuxacademy',
  socialYoutube: 'https://youtube.com/@techtuxacademy',
  footerNote:
    'TechTuxAcademy is an independent educational platform. Course videos are embedded from YouTube and remain the property of their creators.',
  newsletterTitle: 'One useful email, every other week',
  newsletterDescription:
    'Linux tips, new courses and practical engineering notes. No spam, unsubscribe anytime.',
  certificateAuthority: 'TechTuxAcademy Academy Team',
};

async function main() {
  console.log('Seeding TechTuxAcademy…');

  // Clear existing demo data in dependency order.
  await prisma.$transaction([
    prisma.certificate.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.course.deleteMany(),
    prisma.tutorial.deleteMany(),
    prisma.blogPost.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.contactMessage.deleteMany(),
    prisma.newsletterSubscriber.deleteMany(),
    prisma.siteSetting.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const studentPassword = process.env.SEED_STUDENT_PASSWORD || 'Student@12345';
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@techtuxacademy.online').toLowerCase();
  const studentEmail = (process.env.SEED_STUDENT_EMAIL || 'student@techtuxacademy.online').toLowerCase();

  const [adminHash, studentHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(studentPassword, 12),
  ]);

  const admin = await prisma.user.create({
    data: {
      name: 'TechTux Admin',
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
      emailVerified: true,
      bio: 'Founder and lead instructor at TechTuxAcademy. Linux, systems and full-stack engineering.',
      preferredLanguage: 'en',
    },
  });

  const instructor = await prisma.user.create({
    data: {
      name: 'Srinivas Reddy',
      email: 'instructor@techtuxacademy.online',
      passwordHash: studentHash,
      role: Role.INSTRUCTOR,
      emailVerified: true,
      bio: 'Embedded systems and VLSI engineer. Teaches hardware courses with a practical, lab-first approach.',
      preferredLanguage: 'en',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'Ananya Sharma',
      email: studentEmail,
      passwordHash: studentHash,
      role: Role.STUDENT,
      emailVerified: true,
      bio: 'Computer science student exploring Linux, Python and full-stack development.',
      preferredLanguage: 'en',
    },
  });

  const demoStudents = await Promise.all(
    [
      'Rahul Verma',
      'Sravani Reddy',
      'Karthik Nair',
      'Meghana Rao',
      'Aditya Joshi',
      'Priya Patel',
      'Naveen Kumar',
      'Divya Sri',
      'Arjun Menon',
      'Lakshmi Prasad',
    ].map((name, index) =>
      prisma.user.create({
        data: {
          name,
          email: `learner${index + 1}@example.com`,
          passwordHash: studentHash,
          role: Role.STUDENT,
          emailVerified: true,
        },
      })
    )
  );

  const categoryIds = new Map<string, string>();
  for (const [index, category] of categories.entries()) {
    const created = await prisma.category.create({
      data: {
        slug: category.slug,
        name: category.name,
        nameTe: category.nameTe,
        description: category.description,
        descriptionTe: undefined,
        icon: category.icon,
        color: category.color,
        order: index + 1,
        featured: Boolean(category.featured),
      },
    });
    categoryIds.set(category.slug, created.id);
  }

  const courseIds = new Map<string, string>();
  for (const seed of courses) {
    const categoryId = categoryIds.get(seed.category);
    if (!categoryId) throw new Error(`Unknown category ${seed.category}`);
    const course = await prisma.course.create({
      data: {
        title: seed.title,
        titleTe: seed.titleTe,
        slug: seed.slug,
        description: seed.description,
        descriptionTe: seed.descriptionTe,
        longDescription: seed.longDescription,
        difficulty: seed.difficulty,
        published: true,
        featured: Boolean(seed.featured),
        certificateThreshold: 100,
        objectives: seed.objectives,
        objectivesTe: seed.objectivesTe ?? [],
        tags: seed.tags,
        requirements: seed.requirements,
        categoryId,
        instructorId: seed.category === 'vlsi-semiconductor' || seed.category === 'robotics-iot' ? instructor.id : admin.id,
        durationMinutes: seed.lessons.reduce((sum, lesson) => sum + lesson.duration, 0),
      },
    });
    courseIds.set(seed.slug, course.id);

    await prisma.lesson.createMany({
      data: seed.lessons.map((lesson, index) => ({
        courseId: course.id,
        title: lesson.title,
        titleTe: lesson.titleTe,
        description: lesson.description,
        youtubeUrl: `https://www.youtube.com/watch?v=${lesson.youtubeId}`,
        youtubeId: lesson.youtubeId,
        durationMinutes: lesson.duration,
        order: index + 1,
        isPreview: Boolean(lesson.isPreview),
        resources:
          index === 0
            ? [
                { title: 'Lesson notes (PDF)', url: 'https://techtuxacademy.online/resources/lesson-notes.pdf', type: 'pdf' },
                { title: 'Command cheat sheet', url: 'https://techtuxacademy.online/resources/cheat-sheet.pdf', type: 'pdf' },
              ]
            : undefined,
      })),
    });
  }

  for (const seed of tutorials) {
    await prisma.tutorial.create({
      data: {
        title: seed.title,
        titleTe: seed.titleTe,
        slug: seed.slug,
        excerpt: seed.excerpt,
        excerptTe: seed.excerptTe,
        content: seed.content,
        categoryId: categoryIds.get(seed.category)!,
        authorId: admin.id,
        published: true,
        featured: Boolean(seed.featured),
        readMinutes: seed.readMinutes,
        tags: seed.tags,
      },
    });
  }

  for (const seed of posts) {
    await prisma.blogPost.create({
      data: {
        title: seed.title,
        titleTe: seed.titleTe,
        slug: seed.slug,
        excerpt: seed.excerpt,
        excerptTe: seed.excerptTe,
        content: seed.content,
        categoryId: categoryIds.get(seed.category)!,
        authorId: admin.id,
        published: true,
        featured: Boolean(seed.featured),
        readMinutes: seed.readMinutes,
        tags: seed.tags,
        publishedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      },
    });
  }

  await prisma.testimonial.createMany({
    data: testimonials.map((testimonial) => ({ ...testimonial, featured: true, published: true })),
  });

  await prisma.announcement.createMany({
    data: announcements,
  });

  await prisma.siteSetting.createMany({
    data: Object.entries(settings).map(([key, value]) => ({ key, value: JSON.stringify(value) })),
  });

  await prisma.newsletterSubscriber.createMany({
    data: [
      { email: 'linux-fan@example.com', name: 'Linux Fan' },
      { email: 'student-learner@example.com', name: 'Student Learner' },
      { email: 'devops@example.com', name: 'DevOps Enthusiast' },
    ],
  });

  // Demo progress: completed Linux course + certificate, partial Python course.
  const linuxCourseId = courseIds.get('linux-essentials-zero-to-command-line-hero')!;
  const pythonCourseId = courseIds.get('python-for-absolute-beginners')!;
  const reactCourseId = courseIds.get('react-nodejs-fullstack-development')!;

  const linuxLessons = await prisma.lesson.findMany({
    where: { courseId: linuxCourseId },
    orderBy: { order: 'asc' },
  });
  const pythonLessons = await prisma.lesson.findMany({
    where: { courseId: pythonCourseId },
    orderBy: { order: 'asc' },
  });

  await prisma.enrollment.create({
    data: {
      userId: student.id,
      courseId: linuxCourseId,
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      lastAccessedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.lessonProgress.createMany({
    data: linuxLessons.map((lesson, index) => ({
      userId: student.id,
      lessonId: lesson.id,
      completed: true,
      completedAt: new Date(Date.now() - (12 - index) * 24 * 60 * 60 * 1000),
      lastWatchedAt: new Date(Date.now() - (12 - index) * 24 * 60 * 60 * 1000),
      secondsWatched: lesson.durationMinutes * 60,
    })),
  });
  await prisma.certificate.create({
    data: {
      certificateId: 'TTA-2026-DEMO0001',
      userId: student.id,
      courseId: linuxCourseId,
      issuedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.enrollment.create({
    data: { userId: student.id, courseId: pythonCourseId, lastAccessedAt: new Date() },
  });
  await prisma.lessonProgress.createMany({
    data: pythonLessons.slice(0, 2).map((lesson, index) => ({
      userId: student.id,
      lessonId: lesson.id,
      completed: true,
      completedAt: new Date(Date.now() - (3 - index) * 24 * 60 * 60 * 1000),
      lastWatchedAt: new Date(Date.now() - (3 - index) * 24 * 60 * 60 * 1000),
      secondsWatched: lesson.durationMinutes * 60,
    })),
  });

  await prisma.enrollment.create({
    data: { userId: student.id, courseId: reactCourseId, lastAccessedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  });

  // Enrol demo students across courses for realistic admin statistics.
  const allCourseIds = [...courseIds.values()];
  const enrollments = demoStudents.flatMap((demo, studentIndex) =>
    allCourseIds.slice(0, 6).map((courseId, courseIndex) => ({
      userId: demo.id,
      courseId,
      lastAccessedAt: new Date(Date.now() - ((studentIndex + courseIndex) % 20) * 24 * 60 * 60 * 1000),
    }))
  );
  await prisma.enrollment.createMany({ data: enrollments, skipDuplicates: true });

  const extraCertificates = [
    { certificateId: 'TTA-2026-DEMO0002', userId: demoStudents[0].id, courseId: linuxCourseId },
    { certificateId: 'TTA-2026-DEMO0003', userId: demoStudents[2].id, courseId: pythonCourseId },
  ];
  for (const certificate of extraCertificates) {
    await prisma.certificate.create({ data: certificate });
  }

  console.log('');
  console.log('Seed complete.');
  console.log(`  Admin:    ${adminEmail} / ${adminPassword}`);
  console.log(`  Student:  ${studentEmail} / ${studentPassword}`);
  console.log(`  Instructor: instructor@techtuxacademy.online / ${studentPassword}`);
  console.log(`  ${categories.length} categories, ${courses.length} courses, ${tutorials.length} tutorials, ${posts.length} articles`);
  console.log('  Demo certificate: TTA-2026-DEMO0001');
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
