import { cmd, code, diagram, trouble, type ConceptDefinition } from './shared';

export const jvmJsConcepts: ConceptDefinition[] = [
  {
    id: 'java-setup-first-class',
    courses: ['java'],
    topics: ['jdk', 'intellij', 'first class', 'java program', 'setting up java'],
    term: 'The JDK and the structure of a Java program',
    definition:
      'The Java Development Kit contains the compiler, launcher, standard library and tools needed to build and run Java applications on the JVM.',
    paragraphs: [
      'A Java source file declares a public class whose name matches the filename. The main method has the signature public static void main(String[] args) and is the entry point. The compiler produces bytecode (.class files), which the Java Virtual Machine executes.',
      'Use a build tool such as Maven or Gradle from the beginning. It manages dependencies, compiles sources, runs tests and packages artifacts. An IDE is optional but IntelliJ IDEA, Eclipse and VS Code with the Java extension all provide navigation and debugging.',
      'Java is statically typed and compiled to bytecode, but the JVM uses just-in-time compilation and adaptive optimisation. Understand the difference between compile-time errors, runtime exceptions and performance characteristics before optimising.',
    ],
    code: [
      code(
        'java',
        'A first Java class',
        `public class Hello {
    public static void main(String[] args) {
        String name = args.length > 0 ? args[0] : "learner";
        System.out.printf("Hello, %s!%n", name);
    }
}`,
        ['The file must be named Hello.java because the public class is Hello.', 'args contains command-line arguments after the class name.']
      ),
    ],
    commands: [
      cmd('Java', 'java -version', 'Show the installed Java runtime version.', ['java -version']),
      cmd('Java', 'javac Hello.java', 'Compile a Java source file to bytecode.', ['javac Hello.java']),
      cmd('Java', 'java Hello Ada', 'Run a compiled class with an argument.', ['java Hello Ada']),
      cmd('Java', 'jshell', 'Start the Java REPL for quick experiments.', ['jshell']),
      cmd('Build', 'mvn test', 'Run the Maven test lifecycle.', ['mvn test', 'mvn package']),
      cmd('Build', 'gradle build', 'Build a Gradle project.', ['gradle build', './gradlew build']),
    ],
    diagram: diagram('pipeline', 'Java build and run', 'Source, javac, bytecode, class loader, JIT, JVM, operating system.'),
    mistakes: [
      'Naming the file differently from the public class.',
      'Confusing the JDK with the JRE; the JRE runs bytecode but does not compile it.',
      'Adding every dependency without a build tool.',
    ],
    troubleshooting: [
      trouble('javac: class Hello is public, should be declared in a file named Hello.java.', 'Rename the file to match the public class exactly.'),
      trouble('UnsupportedClassVersionError at runtime.', 'Compile and run with a compatible JDK version, or set the release target explicitly.'),
    ],
  },
  {
    id: 'java-oop',
    courses: ['java'],
    topics: ['object', 'inheritance', 'interface', 'oop', 'four pillars', 'polymorphism', 'encapsulation'],
    term: 'Objects, inheritance and interfaces',
    definition:
      'Object-oriented design organises behaviour around objects that combine state and methods. Java supports encapsulation, inheritance, polymorphism and abstraction.',
    paragraphs: [
      'Encapsulation hides internal state behind methods and access modifiers. Inheritance expresses an is-a relationship and lets a subclass reuse or specialise a superclass. Composition expresses a has-a relationship and is often more flexible than inheritance.',
      'An interface declares a contract without implementation, although default methods can provide shared behaviour. A class can implement multiple interfaces but extend only one class. Program to interfaces so implementations can be replaced and tested independently.',
      'Polymorphism lets a superclass reference call the most specific override at runtime. Use @Override to catch signature mistakes. Prefer immutable objects, private fields and constructors that validate their arguments. Avoid deep inheritance hierarchies and static mutable state.',
    ],
    code: [
      code(
        'java',
        'Interface and polymorphism',
        `interface Notifier {
    void send(String message);
}

class EmailNotifier implements Notifier {
    @Override
    public void send(String message) {
        System.out.println("Email: " + message);
    }
}

class SmsNotifier implements Notifier {
    @Override
    public void send(String message) {
        System.out.println("SMS: " + message);
    }
}

public class Demo {
    public static void main(String[] args) {
        Notifier notifier = new EmailNotifier();
        notifier.send("Welcome to TechTuxAcademy");
    }
}`,
        ['The variable type is Notifier, so any implementation can be substituted.', '@Override makes the compiler verify that the method really overrides a supertype method.']
      ),
    ],
    diagram: diagram('layers', 'OOP relationships', 'Interface contract, implementing classes, composition and inheritance.'),
    mistakes: [
      'Using inheritance only to reuse code rather than to model a real is-a relationship.',
      'Exposing mutable fields through public getters that return internal collections.',
      'Forgetting that Java passes object references by value, not objects by reference.',
    ],
    troubleshooting: [
      trouble('A subclass method is not called through a superclass reference.', 'Check the method signature, access modifier and whether it is truly overridden rather than overloaded.'),
      trouble('ConcurrentModificationException while iterating a collection.', 'Use an iterator, removeIf, or a concurrent collection instead of modifying the collection directly.'),
    ],
  },
  {
    id: 'java-collections-streams',
    courses: ['java'],
    topics: ['collection', 'generic', 'stream', 'list', 'map', 'set', 'stream api'],
    term: 'Collections, generics and the Stream API',
    definition:
      'The Java Collections Framework provides interfaces and implementations for lists, sets, maps and queues. Generics provide compile-time type safety. Streams express bulk operations declaratively.',
    paragraphs: [
      'List preserves order and allows duplicates. Set stores unique elements. Map stores key-value pairs. Choose an implementation based on ordering, lookup complexity and concurrency needs: ArrayList for indexed access, LinkedList for frequent insertion at the ends, HashSet for membership, TreeSet for sorted order, HashMap for general-purpose lookup and ConcurrentHashMap for concurrent access.',
      'Generics move type checks to compile time and eliminate casts. Use bounded wildcards when an API should accept a family of types: ? extends T for producers and ? super T for consumers. Type erasure means generic type information is not available at runtime for most operations.',
      'A stream is a pipeline of source, intermediate operations and a terminal operation. Streams are lazy: intermediate operations do not run until a terminal operation such as collect, forEach or reduce is invoked. Prefer streams for transformations and loops for complex control flow; readability is the deciding factor.',
    ],
    code: [
      code(
        'java',
        'Collections and streams',
        `import java.util.*;
import java.util.stream.*;

record Student(String name, int score) {}

public class Demo {
    public static void main(String[] args) {
        List<Student> students = List.of(
            new Student("Ada", 95),
            new Student("Ravi", 81),
            new Student("Mei", 67)
        );

        Map<String, List<String>> byBand = students.stream()
            .collect(Collectors.groupingBy(
                s -> s.score() >= 90 ? "A" : s.score() >= 75 ? "B" : "C",
                Collectors.mapping(Student::name, Collectors.toList())
            ));

        System.out.println(byBand);
    }
}`,
        ['A record is a concise immutable data carrier.', 'groupingBy builds a map from a classifier function.']
      ),
    ],
    diagram: diagram('pipeline', 'Stream pipeline', 'Source, filter/map intermediate operations, terminal collect.'),
    mistakes: [
      'Modifying a collection while iterating over it.',
      'Assuming HashMap iteration order is stable.',
      'Reusing a stream after a terminal operation.',
    ],
    troubleshooting: [
      trouble('UnsupportedOperationException when adding to List.of(...).', 'List.of returns an immutable list; create an ArrayList copy if mutation is required.'),
      trouble('A stream operation runs twice.', 'Streams are single-use; create a new stream for each pipeline.'),
    ],
  },
  {
    id: 'java-exceptions-io',
    courses: ['java'],
    topics: ['exception', 'file i/o', 'read real data', 'try catch', 'nio'],
    term: 'Exceptions and file I/O',
    definition:
      'Java distinguishes checked exceptions, which must be handled or declared, from unchecked exceptions, which indicate programming errors. NIO provides modern file and path APIs.',
    paragraphs: [
      'Use try-with-resources for anything that implements AutoCloseable, including streams, readers and channels. It closes resources in reverse order even when an exception occurs. Catch the most specific exception you can handle, and let the rest propagate with context.',
      'java.nio.file.Files and Path provide readable, portable file operations. Files.readString and Files.writeString are convenient for small text files. For large files, stream lines with Files.lines or use buffered channels. Always specify a charset such as StandardCharsets.UTF_8.',
      'Do not use exceptions for ordinary control flow. Validate inputs early and return meaningful errors. When wrapping an exception, preserve the cause so the original stack trace is not lost. Log at the boundary where you have enough context, not at every layer.',
    ],
    code: [
      code(
        'java',
        'Try-with-resources and NIO',
        `import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

public class ReadScores {
    public static void main(String[] args) throws IOException {
        Path path = Path.of("scores.txt");
        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println(line);
            }
        } catch (NoSuchFileException error) {
            System.err.println("Missing file: " + error.getFile());
        }
    }
}`,
        ['The reader is closed automatically when the try block exits.', 'Catch NoSuchFileException separately to produce a useful message.']
      ),
    ],
    diagram: diagram('flow', 'Exception flow', 'try, catch specific exception, finally/close, rethrow with cause.'),
    mistakes: [
      'Catching Exception and doing nothing.',
      'Forgetting to close a stream or reader.',
      'Losing the original exception when wrapping.',
    ],
    troubleshooting: [
      trouble('The file is not found even though it exists.', 'Check the working directory, use an absolute path or Path.of(...).toAbsolutePath(), and verify filename case.'),
      trouble('MalformedInputException while reading text.', 'Open the file with the correct charset; do not assume UTF-8 for legacy data.'),
    ],
  },
  {
    id: 'java-console-library',
    courses: ['java'],
    topics: ['console library manager', 'library manager', 'console application'],
    term: 'Project: console library manager',
    definition:
      'A console library manager models books, members and loans, then exposes commands for adding, searching, borrowing and returning items.',
    paragraphs: [
      'Start with the domain model: Book, Member and Loan. Give each entity a stable identifier and keep invariants inside the class. A book cannot be borrowed twice; a member cannot exceed a loan limit. Encode those rules in methods rather than scattering checks through the UI.',
      'Separate the console interface from the service layer. The service coordinates transactions and returns results; the console parses input and formats output. This makes the core testable without simulating keyboard input.',
      'Persist data with a simple text or JSON file, or move to JDBC when the model outgrows a file. Add tests for the borrowing rules, duplicate ISBNs and missing records. A small project is a chance to practise clean boundaries, not to build a framework.',
    ],
    code: [
      code(
        'java',
        'Domain model sketch',
        `import java.util.*;

record Book(String isbn, String title, String author) {}

class Library {
    private final Map<String, Book> books = new HashMap<>();
    private final Set<String> loaned = new HashSet<>();

    void add(Book book) {
        if (books.putIfAbsent(book.isbn(), book) != null) {
            throw new IllegalArgumentException("Duplicate ISBN: " + book.isbn());
        }
    }

    Book borrow(String isbn) {
        Book book = books.get(isbn);
        if (book == null) throw new NoSuchElementException("Unknown ISBN: " + isbn);
        if (!loaned.add(isbn)) throw new IllegalStateException("Already on loan");
        return book;
    }

    void giveBack(String isbn) {
        if (!loaned.remove(isbn)) throw new IllegalStateException("Not on loan");
    }
}`,
        ['The Library enforces invariants in one place.', 'A map provides O(1) lookup by ISBN; a set tracks active loans.']
      ),
    ],
    diagram: diagram('flow', 'Library manager layers', 'Console input, service/domain rules, persistence, tests.'),
    mistakes: [
      'Putting business rules in the console loop.',
      'Using mutable public fields instead of methods that enforce invariants.',
      'Ignoring duplicate identifiers and missing records.',
    ],
    troubleshooting: [
      trouble('The program crashes on malformed input.', 'Validate and parse input at the boundary, then re-prompt instead of letting a NumberFormatException escape.'),
      trouble('Data disappears between runs.', 'Check the persistence path and flush/close the writer before exit.'),
    ],
  },
  {
    id: 'js-modern-syntax',
    courses: ['javascript', 'typescript', 'modern javascript'],
    topics: ['let', 'const', 'destructuring', 'spread', 'es module', 'scope', 'modules', 'modern syntax'],
    term: 'Modern syntax, scope and modules',
    definition:
      'Modern JavaScript uses let and const for block scope, destructuring and spread for concise data access, and ES modules for explicit imports and exports.',
    paragraphs: [
      'var is function-scoped and hoisted; let and const are block-scoped and have a temporal dead zone before initialisation. Prefer const by default and let only when reassignment is required. Objects declared with const can still be mutated; const protects the binding, not deep immutability.',
      'Destructuring extracts values from objects and arrays. Spread copies enumerable properties or array elements into a new structure. Rest collects remaining values. These features make transformations concise, but overuse can hide data flow.',
      'ES modules use import and export. Each module has its own scope, and imports are live read-only bindings. CommonJS uses require and module.exports. Do not mix module systems casually; configure the project consistently and use .mjs/.cjs extensions when necessary.',
    ],
    code: [
      code(
        'javascript',
        'Destructuring, spread and modules',
        `// math.js
export const add = (a, b) => a + b;
export const sum = (...values) => values.reduce(add, 0);

// app.js
import { add, sum } from "./math.js";

const student = { name: "Ada", score: 95, tags: ["math", "logic"] };
const { name, score, ...rest } = student;
const updated = { ...student, score: score + 1 };
const numbers = [1, 2, 3];

console.log(name, updated.score, sum(...numbers), rest.tags);`,
        ['Spread creates a shallow copy, not a deep clone.', 'Imports are live bindings; exporting a reassigned variable is visible to importers.']
      ),
    ],
    diagram: diagram('layers', 'JavaScript scopes', 'Global, module, function, block and lexical environments.'),
    mistakes: [
      'Using var inside loops with asynchronous callbacks.',
      'Assuming object spread deep-clones nested objects.',
      'Mixing require and import in the same module.',
    ],
    troubleshooting: [
      trouble('Cannot use import statement outside a module.', 'Set "type": "module" in package.json or use .mjs, and configure the runtime or bundler correctly.'),
      trouble('A const object changes unexpectedly.', 'const prevents reassignment of the binding, not mutation of the object; freeze it or avoid shared mutation.'),
    ],
  },
  {
    id: 'js-closures-event-loop',
    courses: ['javascript', 'typescript'],
    topics: ['closure', 'event loop', 'function', 'scope', 'callback', 'this'],
    term: 'Functions, closures and the event loop',
    definition:
      'Functions are first-class values. A closure captures variables from its lexical environment. The event loop coordinates callbacks, promises and I/O on a single JavaScript thread.',
    paragraphs: [
      'A closure is created whenever a function is defined inside another function and references the outer scope. The inner function keeps that environment alive. Closures enable factories, memoisation and private state, but can also retain large objects longer than expected.',
      'JavaScript runs one call stack at a time. Synchronous code executes immediately. Timers and I/O callbacks go through task queues; promise reactions go through the microtask queue, which runs before the next macrotask. This ordering explains why a resolved promise callback runs before setTimeout(0).',
      'Arrow functions do not have their own this; they capture this lexically. Regular functions get this from how they are called. Avoid losing this when passing methods as callbacks by using arrow functions, bind, or class fields. Async work should return promises rather than accepting deeply nested callbacks.',
    ],
    code: [
      code(
        'javascript',
        'Closure and event-loop ordering',
        `function counter() {
  let count = 0;
  return () => ++count;
}

const next = counter();
console.log(next(), next()); // 1 2

console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");
// Output: A D C B`,
        ['The microtask (promise) runs before the timer macrotask.', 'The closure keeps count private and alive.']
      ),
    ],
    diagram: diagram('flow', 'Event loop', 'Call stack, microtask queue, macrotask queue and rendering.'),
    mistakes: [
      'Expecting setTimeout(0) to run before promise callbacks.',
      'Using var in a loop with closures and getting the final value every time.',
      'Blocking the event loop with a long synchronous computation.',
    ],
    troubleshooting: [
      trouble('A UI freezes during a calculation.', 'Move heavy work to a worker, chunk it, or use an asynchronous boundary so the event loop can breathe.'),
      trouble('this is undefined inside a callback.', 'Use an arrow function or bind the method; check whether the function is called as a method or passed as a value.'),
    ],
  },
  {
    id: 'js-promises-async',
    courses: ['javascript', 'typescript', 'react', 'node'],
    topics: ['promise', 'async', 'await', 'error handling', 'asynchronous'],
    term: 'Promises, async/await and error handling',
    definition:
      'A promise represents an eventual value or failure. async/await lets asynchronous code be written in a synchronous style while still returning a promise.',
    paragraphs: [
      'A promise has three states: pending, fulfilled and rejected. then handles fulfilment, catch handles rejection, and finally runs regardless. Promise.all fails fast when any promise rejects; Promise.allSettled waits for every result; Promise.race settles with the first result; Promise.any settles with the first fulfilment.',
      'An async function always returns a promise. await pauses that function, not the entire thread. Wrap await calls in try/catch when you need to recover or add context. Do not mix callback style and promises without promisifying the callback API.',
      'Avoid unhandled rejections. At the top level, catch and log them. In Express, pass errors to next() or use an async wrapper. In browsers, listen for unhandledrejection during development. Cancellation is not built into promises; use AbortController for fetch and long-running operations.',
    ],
    code: [
      code(
        'javascript',
        'Async, parallel work and errors',
        `async function loadDashboard(userId, signal) {
  const [profile, courses] = await Promise.all([
    fetch(\`/api/users/\${userId}\`, { signal }).then((r) => r.json()),
    fetch("/api/courses", { signal }).then((r) => r.json()),
  ]);

  return { profile, courses };
}

try {
  const controller = new AbortController();
  const data = await loadDashboard("u_123", controller.signal);
  console.log(data);
} catch (error) {
  console.error("Dashboard failed:", error);
}`,
        ['Promise.all runs independent requests in parallel.', 'AbortController cancels fetch requests when the user navigates away.']
      ),
    ],
    diagram: diagram('timeline', 'Promise lifecycle', 'Pending, fulfilled/rejected, then/catch/finally handlers.'),
    mistakes: [
      'Forgetting to return a promise inside a then callback.',
      'Using await inside a loop when the operations could run in parallel.',
      'Swallowing errors with an empty catch block.',
    ],
    troubleshooting: [
      trouble('UnhandledPromiseRejectionWarning.', 'Find the promise without a catch or the async function whose rejection is not awaited.'),
      trouble('Requests run sequentially and slowly.', 'Collect promises and await Promise.all when the operations are independent.'),
    ],
  },
  {
    id: 'typescript-fundamentals',
    courses: ['typescript', 'javascript'],
    topics: ['typescript', 'types', 'interface', 'narrowing', 'generic', 'type safety'],
    term: 'TypeScript fundamentals',
    definition:
      'TypeScript adds a static type system to JavaScript. Types are erased at runtime; the compiler checks them and emits JavaScript.',
    paragraphs: [
      'Primitive types include string, number, boolean, null, undefined, symbol and bigint. object, unknown and any describe broader categories. Prefer unknown over any at boundaries because unknown forces a narrowing check before use.',
      'Interfaces and type aliases describe object shapes. Unions model alternatives; intersections combine shapes. Narrowing uses typeof, instanceof, in, equality checks and user-defined type guards. Generics let functions and types work over many types while preserving relationships.',
      'TypeScript types do not validate runtime data. API responses and form input must still be validated with a schema library. Enable strict mode, avoid non-null assertions, and keep types close to the data they describe. Use discriminated unions for state machines and result types.',
    ],
    code: [
      code(
        'typescript',
        'Discriminated union and generic result',
        `type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

function render<T>(state: LoadState<T>): string {
  switch (state.status) {
    case "loading":
      return "Loading…";
    case "ready":
      return JSON.stringify(state.data);
    case "error":
      return state.message;
  }
}

const state: LoadState<string[]> = { status: "ready", data: ["linux", "python"] };
console.log(render(state));`,
        ['The status field discriminates the union so TypeScript narrows each branch.', 'The generic T preserves the payload type.']
      ),
    ],
    commands: [
      cmd('TypeScript', 'npx tsc --noEmit', 'Type-check a project without emitting files.', ['npx tsc --noEmit']),
      cmd('TypeScript', 'npx tsc --init', 'Create a starter tsconfig.json.', ['npx tsc --init']),
      cmd('TypeScript', 'npx tsx script.ts', 'Run a TypeScript file directly during development.', ['npx tsx script.ts']),
    ],
    diagram: diagram('layers', 'TypeScript compilation', 'TypeScript source, type checker, JavaScript emit, runtime.'),
    mistakes: [
      'Using any to silence errors instead of modelling the type.',
      'Assuming TypeScript validates API data at runtime.',
      'Forgetting that structural typing allows unexpected object shapes.',
    ],
    troubleshooting: [
      trouble('Object is of type unknown.', 'Narrow with a type guard or validate the value with a schema before using it.'),
      trouble('Types compile but the runtime value is wrong.', 'Add runtime validation at the boundary; TypeScript types are erased.'),
    ],
  },
  {
    id: 'ts-typed-toolkit',
    courses: ['typescript', 'javascript'],
    topics: ['typed data toolkit', 'library', 'test', 'project'],
    term: 'Project: a typed data toolkit',
    definition:
      'A typed data toolkit is a small library of reusable functions with explicit types, tests and documentation, packaged for other projects.',
    paragraphs: [
      'Choose a narrow problem: grouping, sorting, validation or pagination. Define the public API first. Types are the contract, so make invalid states hard to represent. Keep the implementation private and export only what users need.',
      'Write tests for normal cases, boundary values and failure modes. Use a test runner such as Vitest or Jest and a type-level check for exported types. Test the built artifact, not only the source, to catch packaging mistakes.',
      'Document installation, usage and the supported runtime. Add a build step that emits JavaScript and declaration files. Publish only if the package is genuinely reusable; otherwise keep it internal and version it with the application.',
    ],
    code: [
      code(
        'typescript',
        'A typed groupBy function',
        `export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  keyOf: (item: T) => K
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyOf(item);
    (result[key] ??= []).push(item);
  }
  return result;
}

// usage
const courses = [
  { title: "Linux", level: "beginner" },
  { title: "Kubernetes", level: "advanced" },
  { title: "Python", level: "beginner" },
];
console.log(groupBy(courses, (course) => course.level));`,
        ['K extends PropertyKey constrains keys to valid object keys.', 'The function does not mutate the input array.']
      ),
    ],
    commands: [
      cmd('Testing', 'npx vitest run', 'Run the test suite once.', ['npx vitest run']),
      cmd('Build', 'npx tsc -p tsconfig.build.json', 'Build the library for distribution.', ['npx tsc -p tsconfig.build.json']),
      cmd('Packaging', 'npm pack --dry-run', 'Preview the package contents without publishing.', ['npm pack --dry-run']),
    ],
    diagram: diagram('pipeline', 'Library workflow', 'Design API, implement, test, build declarations, package, publish.'),
    mistakes: [
      'Exporting internal helpers and creating a large public surface.',
      'Testing only the happy path.',
      'Publishing without checking the package contents.',
    ],
    troubleshooting: [
      trouble('Consumers cannot find the types.', 'Set "types" and "exports" in package.json and emit .d.ts files.'),
      trouble('The package works locally but not after install.', 'Inspect npm pack output; check files, main/module/types paths and peer dependencies.'),
    ],
  },
];
