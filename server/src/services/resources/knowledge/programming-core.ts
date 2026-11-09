import { cmd, code, diagram, formula, trouble, type ConceptDefinition } from './shared';

export const cPythonConcepts: ConceptDefinition[] = [
  {
    id: 'c-compilation-linking',
    courses: ['c & c++', 'c-cpp', 'systems programming', 'programming'],
    topics: ['compilation', 'linking', 'first c program', 'executable', 'gcc', 'make'],
    term: 'Compilation, linking and the C toolchain',
    definition:
      'C source code is preprocessed, compiled to assembly, assembled into object files, and linked with libraries to produce an executable.',
    paragraphs: [
      'The preprocessor expands macros and includes headers. The compiler translates translation units into object files containing machine code and unresolved symbols. The linker resolves those symbols against other object files and libraries, then produces an executable with a defined entry point.',
      'A declaration tells the compiler that a name exists and what its type is. A definition allocates storage or provides a function body. Header files should contain declarations and include guards, while implementation files contain definitions. Including a definition in multiple translation units causes multiple-definition linker errors.',
      'The build process is easier to reproduce with a Makefile or CMake. Compile with warnings enabled (-Wall -Wextra -Wpedantic), treat warnings as errors in CI when practical, and use a debug build with symbols (-g) separate from an optimised release build (-O2).',
    ],
    code: [
      code(
        'c',
        'A first C program',
        `#include <stdio.h>

int main(void) {
    printf("Hello, TechTuxAcademy!\\n");
    return 0;
}`,
        ['main returns an int status to the operating system.', 'stdio.h declares printf; the definition comes from the C library linked at the end.']
      ),
      code(
        'make',
        'Minimal Makefile',
        `CC = cc
CFLAGS = -Wall -Wextra -Wpedantic -g -std=c17
TARGET = hello

all: $(TARGET)

$(TARGET): main.o
	$(CC) $(CFLAGS) -o $@ $^

main.o: main.c
	$(CC) $(CFLAGS) -c $<

clean:
	rm -f $(TARGET) main.o`,
        ['A tab character must precede recipe lines in a Makefile.', 'make decides what to rebuild from file timestamps.']
      ),
    ],
    commands: [
      cmd('Build', 'cc -Wall -Wextra -g main.c -o hello', 'Compile and link a C program with warnings and debug symbols.', ['cc -Wall -Wextra -g main.c -o hello'], {
        flags: [{ flag: '-c', description: 'Compile to an object file without linking.' }, { flag: '-o', description: 'Set the output filename.' }, { flag: '-g', description: 'Include debug symbols.' }, { flag: '-O2', description: 'Enable optimisation.' }],
      }),
      cmd('Inspection', 'file hello', 'Identify the executable format and architecture.', ['file hello']),
      cmd('Inspection', 'ldd hello', 'Show shared libraries required by an executable.', ['ldd hello']),
      cmd('Inspection', 'nm -C main.o', 'List symbols in an object file.', ['nm -C main.o']),
      cmd('Build', 'make', 'Build targets described by a Makefile.', ['make', 'make clean']),
    ],
    diagram: diagram('pipeline', 'C build pipeline', 'Source, preprocessor, compiler, assembler, object files, linker, executable.'),
    mistakes: [
      'Defining a function or global variable in a header included by multiple source files.',
      'Ignoring compiler warnings that indicate undefined behaviour.',
      'Linking libraries in the wrong order with static archives.',
    ],
    troubleshooting: [
      trouble('undefined reference to a function at link time.', 'Check that the implementation is compiled, the library is linked, and the declaration matches the definition.'),
      trouble('The program compiles but crashes immediately.', 'Rebuild with -g and run under gdb or a sanitizer; check for uninitialised pointers and buffer overflows.'),
    ],
  },
  {
    id: 'c-pointers-stack',
    courses: ['c & c++', 'c-cpp', 'systems programming'],
    topics: ['pointer', 'array', 'stack', 'memory model', 'address'],
    term: 'Pointers, arrays and the stack',
    definition:
      'A pointer stores a memory address. The stack is the region used for automatic variables and call frames; arrays are contiguous sequences of elements.',
    paragraphs: [
      'A pointer has a type because pointer arithmetic depends on the size of the pointed-to type. p + 1 advances by sizeof(*p) bytes, not one byte. Dereferencing an invalid pointer is undefined behaviour, even if the program appears to work.',
      'An array name decays to a pointer to its first element in most expressions. That does not mean arrays and pointers are identical: sizeof(array) is the whole array size, and an array cannot be reassigned. Passing an array to a function loses its length, so pass the length explicitly or use a struct.',
      'The stack grows and shrinks with function calls. Each call frame holds arguments, return address and local variables. Returning a pointer to a local variable is a classic bug because the frame is invalid after return. Use static storage, caller-provided buffers, or heap allocation when the lifetime must outlive the call.',
    ],
    code: [
      code(
        'c',
        'Pointer arithmetic and array bounds',
        `#include <stdio.h>

int sum(const int *values, size_t count) {
    int total = 0;
    for (size_t i = 0; i < count; i++) {
        total += values[i];   // equivalent to *(values + i)
    }
    return total;
}

int main(void) {
    int scores[] = { 72, 88, 95 };
    size_t count = sizeof(scores) / sizeof(scores[0]);
    printf("%d\\n", sum(scores, count));
    return 0;
}`,
        ['sizeof(scores) is the full array size only inside the array\'s scope.', 'Inside sum, values is a pointer; count must be passed separately.']
      ),
    ],
    diagram: diagram('stack-heap', 'Stack and heap memory', 'Call frames grow downward; heap allocations are managed explicitly.'),
    mistakes: [
      'Using sizeof on a pointer and expecting the array size.',
      'Returning the address of a local variable.',
      'Indexing one past the end of an array.',
      'Confusing pointer size with pointed-to size.',
    ],
    troubleshooting: [
      trouble('The program prints garbage values.', 'Initialise variables, check array bounds and verify that pointers point to live storage.'),
      trouble('A pointer works in one function but crashes in another.', 'Check lifetime: the storage may have been freed or the stack frame may have returned.'),
    ],
  },
  {
    id: 'c-heap-data-structures',
    courses: ['c & c++', 'c-cpp', 'systems programming'],
    topics: ['heap', 'malloc', 'free', 'linked list', 'dynamic array', 'data structure'],
    term: 'Heap allocation and dynamic data structures',
    definition:
      'The heap provides storage whose lifetime is controlled by the program. malloc reserves bytes; free releases them. Linked lists and dynamic arrays use heap nodes or buffers to grow at runtime.',
    paragraphs: [
      'malloc returns a pointer to uninitialised storage or NULL on failure. calloc zero-initialises. realloc changes an allocation and may move it, so never keep the old pointer without handling failure. Every successful allocation needs exactly one matching free on every path, including error paths.',
      'A linked list stores each element in a node with a next pointer. It supports O(1) insertion at a known position but loses random access and has poor cache locality. A dynamic array stores elements contiguously and doubles capacity when full, giving amortised O(1) append and excellent cache behaviour.',
      'Memory bugs are often silent. Use a clear ownership convention: one function or structure owns an allocation and is responsible for freeing it. Document that contract and keep allocation and deallocation close together in the code.',
    ],
    code: [
      code(
        'c',
        'Dynamic array with realloc',
        `#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *items;
    size_t length;
    size_t capacity;
} IntVec;

int vec_push(IntVec *v, int value) {
    if (v->length == v->capacity) {
        size_t next = v->capacity ? v->capacity * 2 : 4;
        int *grown = realloc(v->items, next * sizeof(*grown));
        if (!grown) return 0;
        v->items = grown;
        v->capacity = next;
    }
    v->items[v->length++] = value;
    return 1;
}

void vec_free(IntVec *v) {
    free(v->items);
    v->items = NULL;
    v->length = v->capacity = 0;
}`,
        ['realloc may return a different address.', 'On failure, the original allocation is still valid; do not overwrite it with NULL.']
      ),
    ],
    diagram: diagram('stack-heap', 'Linked list versus dynamic array', 'Nodes scattered on the heap versus one contiguous buffer.'),
    mistakes: [
      'Losing the original pointer when realloc fails.',
      'Freeing the same allocation twice.',
      'Using memory after free.',
      'Forgetting to free on an early-return error path.',
    ],
    troubleshooting: [
      trouble('A crash occurs only under load.', 'Run with AddressSanitizer and Valgrind; check for use-after-free and heap corruption.'),
      trouble('Memory usage grows without bound.', 'Track allocation and free counts; look for a missing free in a loop or error path.'),
    ],
  },
  {
    id: 'c-raii-smart-pointers',
    courses: ['c & c++', 'c-cpp', 'modern c++'],
    topics: ['raii', 'smart pointer', 'unique_ptr', 'shared_ptr', 'manual delete', 'modern c++'],
    term: 'RAII and smart pointers',
    definition:
      'RAII ties a resource lifetime to an object lifetime: the constructor acquires, the destructor releases. Smart pointers apply RAII to heap memory.',
    paragraphs: [
      'std::unique_ptr expresses exclusive ownership and cannot be copied, only moved. std::shared_ptr expresses shared ownership through reference counting. std::weak_ptr observes a shared object without extending its lifetime and breaks reference cycles. Prefer unique_ptr by default; shared ownership is a design decision, not a convenience.',
      'RAII is not only for memory. File handles, mutex locks, sockets and database transactions should also be wrapped so cleanup happens on every return path, including exceptions. The standard library already provides std::lock_guard, std::unique_lock and std::fstream.',
      'Avoid owning raw pointers. A raw pointer or reference should be non-owning and clearly documented as such. Use make_unique and make_shared to create smart pointers safely and avoid separate allocation/construction failures.',
    ],
    code: [
      code(
        'cpp',
        'RAII with unique_ptr',
        `#include <memory>
#include <iostream>

struct Connection {
    Connection()  { std::cout << "connect\\n"; }
    ~Connection() { std::cout << "disconnect\\n"; }
    void send(const char *msg) { std::cout << msg << "\\n"; }
};

void run() {
    auto conn = std::make_unique<Connection>();
    conn->send("hello");
} // destructor runs here, even if send throws

int main() {
    run();
}`,
        ['No explicit delete is required.', 'If an exception is thrown, stack unwinding still destroys conn.']
      ),
    ],
    diagram: diagram('flow', 'RAII lifetime', 'Acquire in constructor, use in scope, release in destructor during stack unwinding.'),
    mistakes: [
      'Using shared_ptr everywhere instead of modelling ownership.',
      'Creating two shared_ptr objects from the same raw pointer, causing a double delete.',
      'Holding a raw pointer to an object owned by a unique_ptr that may be reset.',
    ],
    troubleshooting: [
      trouble('A double free occurs with shared_ptr.', 'Use enable_shared_from_this or make_shared; never construct multiple control blocks from one raw pointer.'),
      trouble('An object is destroyed too early.', 'Check whether a unique_ptr was moved or a shared_ptr cycle is preventing destruction.'),
    ],
  },
  {
    id: 'c-debugging',
    courses: ['c & c++', 'c-cpp'],
    topics: ['gdb', 'sanitizer', 'memory bug', 'debugging', 'valgrind', 'addresssanitizer'],
    term: 'Debugging with gdb and sanitizers',
    definition:
      'gdb inspects a running or crashed program. Sanitizers instrument the build to detect memory, undefined-behaviour and thread errors at runtime.',
    paragraphs: [
      'Compile with -g and without aggressive optimisation when debugging. gdb can set breakpoints, inspect variables, print stack traces and examine memory. The backtrace after a crash is usually the fastest route to the failing call path.',
      'AddressSanitizer detects out-of-bounds access, use-after-free and leaks with modest runtime overhead. UndefinedBehaviorSanitizer catches signed overflow, misaligned access and invalid shifts. ThreadSanitizer detects data races. Use them in development and CI, not necessarily in production builds.',
      'Valgrind is slower but requires no recompilation and provides detailed memory error reports. Combine tools: sanitizers for fast feedback, gdb for interactive inspection, Valgrind for a second opinion and leak details.',
    ],
    commands: [
      cmd('Debugging', 'gdb ./hello', 'Start the GNU debugger with a program.', ['gdb ./hello'], {
        warnings: ['Build with -g for useful symbols.'],
      }),
      cmd('Debugging', 'gdb -batch -ex run -ex bt --args ./hello', 'Run a program and print a backtrace on crash.', ['gdb -batch -ex run -ex bt --args ./hello']),
      cmd('Sanitizers', 'cc -fsanitize=address,undefined -g main.c -o hello-asan', 'Build with AddressSanitizer and UndefinedBehaviorSanitizer.', ['cc -fsanitize=address,undefined -g main.c -o hello-asan'], {
        warnings: ['Sanitizer builds are for testing, not release binaries.'],
      }),
      cmd('Sanitizers', 'cc -fsanitize=thread -g main.c -o hello-tsan', 'Build with ThreadSanitizer for data-race detection.', ['cc -fsanitize=thread -g main.c -o hello-tsan']),
      cmd('Memory', 'valgrind --leak-check=full ./hello', 'Run a program under Valgrind with full leak checking.', ['valgrind --leak-check=full ./hello']),
    ],
    code: [
      code(
        'bash',
        'Typical gdb session',
        `gdb ./hello
(gdb) break main
(gdb) run
(gdb) next
(gdb) print variable
(gdb) backtrace
(gdb) quit`,
        ['break sets a breakpoint, run starts the program, next steps over a line, print inspects a value.']
      ),
    ],
    diagram: diagram('flow', 'Debugging workflow', 'Reproduce, build with symbols, breakpoint, inspect, fix, add regression test.'),
    mistakes: [
      'Debugging an optimised build and trusting every line mapping.',
      'Fixing the symptom shown by the debugger without understanding the root cause.',
      'Running sanitizer builds in production.',
    ],
    troubleshooting: [
      trouble('gdb shows no symbols.', 'Rebuild with -g and ensure the binary being debugged is the one you just built.'),
      trouble('AddressSanitizer reports a leak at exit.', 'Check every allocation path, including error returns; use the reported allocation stack to find the owner.'),
    ],
  },
  {
    id: 'python-first-program',
    courses: ['python'],
    topics: ['first python program', 'repl', 'script', 'install python', 'print'],
    term: 'Your first Python program',
    definition:
      'Python is an interpreted, dynamically typed language. The REPL evaluates expressions interactively; a script is a .py file executed by the interpreter.',
    paragraphs: [
      'The REPL is a fast feedback tool: type an expression and see its value immediately. Scripts are better for anything you want to keep, review or run repeatedly. Use python3 explicitly on systems where python may refer to Python 2 or be absent.',
      'A Python program is a sequence of statements. Indentation defines blocks, so consistent spaces are part of the syntax. print writes text to standard output; input reads a line from standard input. Comments begin with # and should explain why, not repeat what the code already says.',
      'Run scripts from a virtual environment so dependencies do not leak into the system interpreter. Keep the entry point small and move reusable logic into functions as the program grows.',
    ],
    code: [
      code(
        'python',
        'Hello and input',
        `name = input("What is your name? ").strip()
print(f"Hello, {name or 'learner'}!")
print("Welcome to TechTuxAcademy.")`,
        ['input always returns a string.', 'strip removes surrounding whitespace; the or expression supplies a fallback.']
      ),
    ],
    commands: [
      cmd('Python', 'python3 --version', 'Show the installed Python version.', ['python3 --version']),
      cmd('Python', 'python3', 'Start the interactive Python REPL.', ['python3']),
      cmd('Python', 'python3 hello.py', 'Run a Python script.', ['python3 hello.py']),
      cmd('Python', 'python3 -m venv .venv', 'Create a project-local virtual environment.', ['python3 -m venv .venv', 'source .venv/bin/activate']),
    ],
    diagram: diagram('flow', 'Python execution', 'Source file, bytecode compilation, Python virtual machine, standard library and C extensions.'),
    mistakes: [
      'Mixing tabs and spaces for indentation.',
      'Naming a file after a standard library module, such as random.py, and shadowing it.',
      'Installing packages globally instead of in a virtual environment.',
    ],
    troubleshooting: [
      trouble('python: command not found.', 'Use python3 or install Python from your package manager.'),
      trouble('A module cannot be imported.', 'Check the active virtual environment, the module name and sys.path; avoid naming your script after the module.'),
    ],
  },
  {
    id: 'python-variables-control-flow',
    courses: ['python'],
    topics: ['variable', 'types', 'control flow', 'conditionals', 'loops', 'numbers', 'strings'],
    term: 'Variables, types and control flow',
    definition:
      'Python variables are names bound to objects. Values have types; names do not. Control flow uses if/elif/else, for and while.',
    paragraphs: [
      'Core built-in types include int, float, bool, str, list, tuple, dict, set and None. Python is dynamically typed but strongly typed: "3" + 3 raises TypeError rather than silently converting. Use type hints and runtime validation at boundaries to make assumptions explicit.',
      'Strings are immutable sequences. Lists are mutable and ordered. Tuples are immutable and hashable when their contents are hashable. Dictionaries map hashable keys to values and preserve insertion order. Sets store unique elements and are useful for membership tests and deduplication.',
      'for iterates over any iterable, not just a range. enumerate gives index and value; zip combines iterables; list comprehensions build lists concisely. while repeats until a condition becomes false. break exits the nearest loop, continue skips to the next iteration, and the optional else block runs only when the loop completes without break.',
    ],
    code: [
      code(
        'python',
        'Types, conditionals and loops',
        `scores = [72, 88, 95, 61]
passing = [score for score in scores if score >= 70]

total = 0
for index, score in enumerate(scores, start=1):
    total += score
    status = "pass" if score >= 70 else "review"
    print(f"{index}: {score} ({status})")

average = total / len(scores)
print(f"Average: {average:.1f}; passing: {len(passing)}")`,
        ['A list comprehension is a readable way to filter and transform.', 'f-strings format values; :.1f rounds to one decimal place.']
      ),
    ],
    diagram: diagram('flow', 'Control flow', 'Conditional branches and loop iterations with break and continue.'),
    mistakes: [
      'Mutating a list while iterating over it.',
      'Using == to compare with None instead of is None.',
      'Assuming integer division behaves like float division in Python 3.',
    ],
    troubleshooting: [
      trouble('TypeError: can only concatenate str (not "int") to str.', 'Convert explicitly with str(), int() or float(), and validate input at the boundary.'),
      trouble('A loop seems to skip elements.', 'Do not remove items from the same list while iterating; build a new list or iterate over a copy.'),
    ],
  },
  {
    id: 'python-functions-modules',
    courses: ['python'],
    topics: ['function', 'module', 'package', 'reusable', 'import', 'scope'],
    term: 'Functions, modules and packages',
    definition:
      'A function is a named, reusable block with parameters and a return value. A module is a .py file; a package is a directory of modules with an __init__.py or namespace configuration.',
    paragraphs: [
      'Functions should do one thing and have a clear contract. Use parameters for inputs and return values for outputs instead of relying on global state. Default arguments are evaluated once at definition time, so never use a mutable default such as [] or {}.',
      'Python resolves names using the LEGB rule: local, enclosing, global, built-in. The global and nonlocal keywords allow rebinding outer names, but excessive use is a design smell. Closures capture variables from an enclosing scope and are useful for factories and callbacks.',
      'Modules are imported by name. The if __name__ == "__main__" guard lets a file act as both an importable module and a script. Packages group related modules; use relative imports inside a package and absolute imports for external dependencies.',
    ],
    code: [
      code(
        'python',
        'Functions, defaults and a main guard',
        `from dataclasses import dataclass

@dataclass
class Student:
    name: str
    score: int

def grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 75:
        return "B"
    if score >= 60:
        return "C"
    return "Needs practice"

def summarise(students: list[Student]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for student in students:
        letter = grade(student.score)
        counts[letter] = counts.get(letter, 0) + 1
    return counts

if __name__ == "__main__":
    print(summarise([Student("Ada", 95), Student("Ravi", 81)]))`,
        ['Never use a mutable default argument; create it inside the function instead.', 'The main guard prevents side effects when the module is imported.']
      ),
    ],
    diagram: diagram('flow', 'LEGB name resolution', 'Local, enclosing, global and built-in scopes searched in order.'),
    mistakes: [
      'Using a mutable default argument.',
      'Importing a module for its side effects without making that intent clear.',
      'Creating circular imports between modules.',
    ],
    troubleshooting: [
      trouble('ModuleNotFoundError after moving files.', 'Run from the project root, check package structure and use absolute imports or an editable install.'),
      trouble('A function changes a list passed by the caller.', 'Lists are mutable references; copy the list or document the in-place behaviour.'),
    ],
  },
  {
    id: 'python-files-json',
    courses: ['python'],
    topics: ['file', 'json', 'exception', 'read and write', 'pathlib', 'error handling'],
    term: 'Files, JSON and exceptions',
    definition:
      'Python reads and writes files through file objects, preferably with a context manager. JSON is a text format mapped to dictionaries, lists and scalar values.',
    paragraphs: [
      'Use with open(...) as handle so the file closes even if an exception occurs. Specify encoding="utf-8" explicitly for text files. Read small files with read(), iterate large files line by line, and use pathlib for path manipulation instead of string concatenation.',
      'The json module converts between JSON text and Python objects. json.load reads from a file object; json.loads parses a string; json.dump and dumps serialise. JSON has no tuple, set or datetime type, so choose an explicit representation such as ISO 8601 strings.',
      'Exceptions should be caught at the level that can handle them. Catch specific exceptions, log context, and either recover or re-raise. A bare except hides bugs. Use finally or context managers for cleanup. Custom exceptions make error handling part of the API.',
    ],
    code: [
      code(
        'python',
        'Read and write JSON safely',
        `import json
from pathlib import Path

path = Path("students.json")
try:
    students = json.loads(path.read_text(encoding="utf-8"))
except FileNotFoundError:
    students = []
except json.JSONDecodeError as error:
    raise ValueError(f"Invalid JSON in {path}: {error}") from error

students.append({"name": "Ada", "score": 95})
path.write_text(json.dumps(students, indent=2, ensure_ascii=False), encoding="utf-8")`,
        ['Catch FileNotFoundError and JSONDecodeError separately so each failure has a useful response.', 'ensure_ascii=False preserves Unicode such as Telugu text.']
      ),
    ],
    diagram: diagram('flow', 'Exception handling flow', 'try body, matching except handler, else when no error, finally cleanup.'),
    mistakes: [
      'Opening files without a context manager.',
      'Using a bare except that swallows KeyboardInterrupt and programming errors.',
      'Assuming JSON supports Python-specific types such as tuples or sets.',
    ],
    troubleshooting: [
      trouble('UnicodeDecodeError while reading a file.', 'Detect the actual encoding, then open with encoding="utf-8" or the correct codec.'),
      trouble('JSONDecodeError after writing a file.', 'Check that the file was fully written and is valid JSON; use json.dumps before writing to catch serialisation errors.'),
    ],
  },
  {
    id: 'python-virtualenv-pip',
    courses: ['python'],
    topics: ['virtual environment', 'pip', 'dependencies', 'isolated', 'requirements'],
    term: 'Virtual environments and pip',
    definition:
      'A virtual environment is an isolated Python installation with its own site-packages directory. pip installs packages into the active environment.',
    paragraphs: [
      'Create one environment per project with python3 -m venv .venv and activate it before installing dependencies. Activation changes PATH and sets VIRTUAL_ENV so pip and python refer to the environment. Never commit .venv to version control.',
      'Record direct dependencies in requirements.txt or pyproject.toml. Pin exact versions for applications and use a lock file for reproducible installs. For libraries, specify compatible ranges rather than hard pins. Separate development dependencies from runtime dependencies.',
      'pip resolves dependencies but does not provide the same locking guarantees as modern tools. uv, Poetry and PDM add lock files and faster resolution. Whatever tool you choose, make the install command explicit in the README and CI configuration.',
    ],
    commands: [
      cmd('Virtualenv', 'python3 -m venv .venv', 'Create an isolated virtual environment.', ['python3 -m venv .venv']),
      cmd('Virtualenv', 'source .venv/bin/activate', 'Activate the environment in a POSIX shell.', ['source .venv/bin/activate'], {
        warnings: ['On Windows PowerShell, use .venv\\Scripts\\Activate.ps1.'],
      }),
      cmd('pip', 'python -m pip install requests', 'Install a package into the active environment.', ['python -m pip install requests'], {
        warnings: ['Use python -m pip so you install into the same interpreter that runs your code.'],
      }),
      cmd('pip', 'python -m pip freeze > requirements.txt', 'Record installed package versions.', ['python -m pip freeze > requirements.txt']),
      cmd('pip', 'python -m pip install -r requirements.txt', 'Install pinned dependencies from a requirements file.', ['python -m pip install -r requirements.txt']),
      cmd('pip', 'python -m pip list --outdated', 'List installed packages with newer available versions.', ['python -m pip list --outdated']),
    ],
    diagram: diagram('layers', 'Virtual environment isolation', 'Project interpreter, site-packages, dependencies, system interpreter.'),
    mistakes: [
      'Installing packages with sudo into the system interpreter.',
      'Committing the virtual environment directory.',
      'Pinning transitive dependencies without a lock file or resolution strategy.',
    ],
    troubleshooting: [
      trouble('pip installs a package but Python cannot import it.', 'Check which interpreter is running with which python and which pip, then reinstall with python -m pip.'),
      trouble('A dependency fails to build.', 'Check the Python version, compiler toolchain and package documentation; prefer a wheel or a supported version.'),
    ],
  },
  {
    id: 'python-file-organizer',
    courses: ['python'],
    topics: ['file organizer', 'automation script', 'project', 'sort files'],
    term: 'Project: build a file organizer',
    definition:
      'A file organizer scans a directory, classifies files by extension or metadata, and moves them into category folders with safe, repeatable logic.',
    paragraphs: [
      'Start with a dry run. Build a plan of source and destination paths, print it, and only then perform moves. This prevents a bug from scattering files across the filesystem. Resolve collisions by appending a counter rather than overwriting.',
      'Separate the program into pure functions: classify a filename, build a destination path, detect collisions, and execute a move. Pure functions are easy to test without touching the filesystem. Use pathlib and shutil.move for portable operations.',
      'Add logging, a --dry-run flag and an undo log that records every move. Handle permission errors and cross-device moves explicitly. The finished tool should be safe to run repeatedly and should never delete a file unless the user explicitly asks for it.',
    ],
    code: [
      code(
        'python',
        'A safe file organizer skeleton',
        `from pathlib import Path
import shutil

CATEGORIES = {
    ".jpg": "images", ".png": "images",
    ".pdf": "documents", ".docx": "documents",
    ".py": "code", ".js": "code",
    ".zip": "archives",
}

def destination_for(path: Path, root: Path) -> Path:
    folder = CATEGORIES.get(path.suffix.lower(), "other")
    target = root / folder / path.name
    counter = 1
    while target.exists():
        target = root / folder / f"{path.stem}-{counter}{path.suffix}"
        counter += 1
    return target

def organise(root: Path, dry_run: bool = True) -> None:
    for item in root.iterdir():
        if not item.is_file():
            continue
        target = destination_for(item, root)
        print(f"{item.name} -> {target.relative_to(root)}")
        if not dry_run:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(item), str(target))

if __name__ == "__main__":
    organise(Path.home() / "Downloads", dry_run=True)`,
        ['Dry run by default; require an explicit flag to mutate the filesystem.', 'Collision handling prevents silent overwrites.']
      ),
    ],
    diagram: diagram('flow', 'File organizer pipeline', 'Scan, classify, plan destination, resolve collisions, move, log.'),
    mistakes: [
      'Moving files before printing the plan.',
      'Overwriting a file with the same name.',
      'Hard-coding a single operating system path separator.',
    ],
    troubleshooting: [
      trouble('PermissionError while moving files.', 'Skip files you cannot read or write, report them, and continue rather than aborting the whole run.'),
      trouble('Files disappear after a run.', 'Check the undo log and the destination tree; always test with dry-run first.'),
    ],
  },
];
