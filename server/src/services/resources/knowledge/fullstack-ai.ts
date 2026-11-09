import { cmd, code, diagram, formula, trouble, type ConceptDefinition } from './shared';

export const fullstackAiConcepts: ConceptDefinition[] = [
  {
    id: 'fullstack-architecture',
    courses: ['react', 'node', 'full-stack', 'fullstack'],
    topics: ['architecture', 'project setup', 'monorepo', 'tooling', 'environment variables'],
    term: 'Full-stack architecture and project setup',
    definition:
      'A full-stack application separates a browser client from an HTTP API and a database, with shared types and a reproducible development environment.',
    paragraphs: [
      'The client renders the interface and manages browser state. The API owns authentication, business rules and persistence. The database enforces constraints. Draw the boundaries explicitly: the browser must never be trusted with secrets, and the API must validate every input even when the client already did.',
      'A monorepo keeps client, server and shared packages in one repository. Workspaces make dependency installation and scripts consistent. Shared types reduce drift between request and response shapes, but only runtime validation guarantees correctness at the boundary.',
      'Environment variables configure secrets and deployment-specific values. Commit an .env.example, never a real .env. Validate required variables at startup so a misconfigured deployment fails immediately instead of at the first request.',
    ],
    code: [
      code(
        'json',
        'Workspace layout',
        `{
  "name": "techtuxacademy",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \\"npm run dev -w server\\" \\"npm run dev -w client\\"",
    "build": "npm run build -w server && npm run build -w client",
    "typecheck": "npm run typecheck -w server && npm run typecheck -w client"
  }
}`,
        ['Workspace scripts keep the root commands small and discoverable.', 'CI should run the same commands developers run locally.']
      ),
    ],
    commands: [
      cmd('Setup', 'npm install', 'Install dependencies for every workspace.', ['npm install']),
      cmd('Development', 'npm run dev', 'Run the client and API together.', ['npm run dev']),
      cmd('Quality', 'npm run typecheck', 'Type-check both workspaces.', ['npm run typecheck', 'npm run build']),
    ],
    diagram: diagram('client-server', 'Full-stack architecture', 'Browser client, HTTP API, database and external services.'),
    mistakes: [
      'Committing a real .env file or exposing server secrets through VITE_ variables.',
      'Sharing database models directly with the browser without a response contract.',
      'Letting development and production use different build commands.',
    ],
    troubleshooting: [
      trouble('The client cannot reach the API.', 'Check the API base URL, CORS origins, cookies and whether the server is running on the expected port.'),
      trouble('A production build fails but development works.', 'Run the exact production build locally and check type errors, missing environment variables and case-sensitive imports.'),
    ],
  },
  {
    id: 'fullstack-express-api',
    courses: ['react', 'node', 'full-stack', 'fullstack', 'express'],
    topics: ['express api', 'routing', 'middleware', 'validation', 'error handling'],
    term: 'Building the Express API',
    definition:
      'Express is a minimal HTTP framework. Routes map methods and paths to handlers; middleware composes cross-cutting behaviour such as authentication, validation and error handling.',
    paragraphs: [
      'Keep route handlers thin. Parse and validate input, call a service, and send a response. Put business logic in services so it can be tested without HTTP. Use a consistent response shape and status codes: 200 for success, 201 for creation, 400/422 for invalid input, 401 for unauthenticated, 403 for forbidden, 404 for missing and 500 for unexpected failures.',
      'Middleware runs in order. Body parsing must come before validation; authentication must come before authorization. An error-handling middleware with four arguments catches errors passed to next(error). Async handlers need a wrapper so rejected promises reach that middleware.',
      'Security middleware belongs in the stack: helmet for headers, cors with an explicit allowlist, rate limiting for abuse-prone endpoints, cookie parsing with httpOnly cookies, and CSRF protection for cookie-authenticated state changes. Never log passwords, tokens or full request bodies containing secrets.',
    ],
    code: [
      code(
        'typescript',
        'A validated Express route',
        `import { Router } from "express";
import { z } from "zod";

const router = Router();

const createCourse = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(20).max(600),
});

router.post("/courses", async (req, res, next) => {
  try {
    const input = createCourse.parse(req.body);
    const course = await courses.create(input);
    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
});

export default router;`,
        ['Validation happens at the boundary before the service is called.', 'Passing errors to next() lets the central error handler format the response.']
      ),
    ],
    commands: [
      cmd('HTTP testing', 'curl -i http://localhost:4000/api/health', 'Inspect status line, headers and body.', ['curl -i http://localhost:4000/api/health']),
      cmd('HTTP testing', 'curl -X POST -H "Content-Type: application/json" -d @body.json http://localhost:4000/api/courses', 'Send a JSON POST request from a file.', ['curl -X POST -H "Content-Type: application/json" -d @body.json http://localhost:4000/api/courses']),
    ],
    diagram: diagram('pipeline', 'Express request pipeline', 'Request, parsers, auth, validation, handler, response, error middleware.'),
    mistakes: [
      'Trusting client-side validation.',
      'Returning stack traces or database errors to clients in production.',
      'Registering the error handler before routes.',
    ],
    troubleshooting: [
      trouble('The API returns HTML instead of JSON on an error.', 'Check the not-found and error middleware order and the Accept header.'),
      trouble('CORS blocks a request with credentials.', 'Set an explicit origin, allow credentials, and never use a wildcard origin with credentials.'),
    ],
  },
  {
    id: 'fullstack-prisma',
    courses: ['react', 'node', 'full-stack', 'fullstack', 'prisma', 'postgresql'],
    topics: ['prisma', 'postgresql', 'schema', 'migration', 'relation', 'data modelling'],
    term: 'Prisma and PostgreSQL data modelling',
    definition:
      'Prisma is a type-safe ORM. The schema declares models and relations; migrations apply versioned SQL changes to PostgreSQL.',
    paragraphs: [
      'Model the domain, not the screens. Give every table a stable primary key, enforce uniqueness where the business requires it, and add indexes for the columns used by filters, joins and ordering. Use relations with explicit onDelete behaviour so deleting a parent does not silently orphan or destroy data.',
      'Migrations are immutable history. Develop with prisma migrate dev, review the generated SQL, and apply to production with prisma migrate deploy. Never edit an applied migration. If a migration is wrong, create a new one that corrects it.',
      'Use transactions when multiple writes must succeed or fail together. Select only the fields you need, paginate large lists, and avoid N+1 queries by including relations deliberately. Prisma types help at compile time, but database constraints are the final guarantee.',
    ],
    code: [
      code(
        'prisma',
        'A relation with indexes',
        `model Course {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  published   Boolean  @default(false)
  lessons     Lesson[]
  createdAt   DateTime @default(now())

  @@index([published])
}

model Lesson {
  id        String  @id @default(cuid())
  courseId  String
  title     String
  order     Int     @default(0)
  course    Course  @relation(fields: [courseId], references: [id], onDelete: Cascade)

  @@index([courseId, order])
}`,
        ['onDelete: Cascade means deleting a course deletes its lessons.', 'The composite index supports ordered lesson queries by course.']
      ),
    ],
    commands: [
      cmd('Prisma', 'npx prisma generate', 'Generate the type-safe client from the schema.', ['npx prisma generate']),
      cmd('Prisma', 'npx prisma migrate dev --name add_resources', 'Create and apply a development migration.', ['npx prisma migrate dev --name add_resources']),
      cmd('Prisma', 'npx prisma migrate deploy', 'Apply pending migrations in production.', ['npx prisma migrate deploy'], {
        warnings: ['migrate deploy never resets data. Back up the database before a destructive schema change.'],
      }),
      cmd('Prisma', 'npx prisma studio', 'Open a local database browser.', ['npx prisma studio']),
    ],
    diagram: diagram('layers', 'Application data layer', 'Route handler, service, Prisma client, connection pool, PostgreSQL.'),
    mistakes: [
      'Using prisma db push in production instead of versioned migrations.',
      'Editing a migration that has already been applied.',
      'Forgetting indexes on foreign keys and filter columns.',
    ],
    troubleshooting: [
      trouble('Prisma cannot reach the database.', 'Check DATABASE_URL, network access, SSL mode and whether the database requires a direct connection for migrations.'),
      trouble('A migration fails halfway.', 'Read the SQL error, restore from backup if needed, and create a corrective migration rather than editing history.'),
    ],
  },
  {
    id: 'fullstack-auth',
    courses: ['react', 'node', 'full-stack', 'fullstack', 'security', 'cybersecurity'],
    topics: ['authentication', 'authorization', 'password hashing', 'session', 'csrf', 'rbac', 'httpOnly'],
    term: 'Authentication, authorization and session security',
    definition:
      'Authentication proves identity. Authorization decides what an identity may do. Passwords must be hashed with a slow, salted algorithm; sessions must be protected against theft and CSRF.',
    paragraphs: [
      'Store passwords with bcrypt, scrypt or Argon2id, never with a fast general-purpose hash. Use a unique salt per password, a sensible cost factor, and a maximum password length. Compare hashes in constant time. Never log or email a password.',
      'A session cookie should be httpOnly, Secure in production, SameSite=Lax or Strict, and scoped to the site. If cookies authenticate state-changing requests, add CSRF protection: a token in a readable cookie echoed in a header, plus origin checks. JWT access tokens are an alternative, but they are not automatically safer and require careful expiry and revocation design.',
      'Authorization belongs on the server. Check the role and the resource ownership for every protected action. Hiding a button in the UI is not access control. Use deny-by-default, centralize policy checks, and test forbidden paths explicitly.',
    ],
    code: [
      code(
        'typescript',
        'Hashing and role checks',
        `import bcrypt from "bcryptjs";

const hash = await bcrypt.hash(password, 12);
const valid = await bcrypt.compare(candidate, hash);

function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Sign in required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

router.delete("/admin/users/:id", requireRole("ADMIN"), deleteUser);`,
        ['bcrypt cost 12 is a reasonable starting point; benchmark on your hardware.', 'Authorization is enforced in the route, not only in the interface.']
      ),
    ],
    diagram: diagram('flow', 'Authentication flow', 'Credentials, hash verification, session cookie, authenticated request, authorization check.'),
    mistakes: [
      'Storing passwords with SHA-256 or MD5.',
      'Putting a JWT in localStorage when an httpOnly cookie would be safer.',
      'Checking only the role and not whether the user owns the resource.',
    ],
    troubleshooting: [
      trouble('The session cookie is not sent on a cross-site request.', 'Check SameSite, Secure, domain and CORS credentials settings.'),
      trouble('Users are logged out immediately in production.', 'Check cookie Secure/SameSite settings, proxy trust and clock skew for token expiry.'),
    ],
  },
  {
    id: 'fullstack-react',
    courses: ['react', 'node', 'full-stack', 'fullstack'],
    topics: ['react', 'routing', 'form', 'query', 'loading state', 'data fetching', 'frontend'],
    term: 'React frontend and data fetching',
    definition:
      'React renders UI from state. Routing maps URLs to pages. A data-fetching library caches server state and handles loading, error and refetch behaviour.',
    paragraphs: [
      'Keep server state and local UI state separate. TanStack Query or SWR owns fetching, caching, retries and invalidation. useState owns ephemeral UI state such as an open modal. Derive values instead of duplicating them in state.',
      'Every data view needs four states: loading, error, empty and success. Forms need validation, disabled submit while pending, and a clear error message. Use accessible labels, focus management and keyboard navigation.',
      'Route-level code splitting keeps the initial bundle small. Protected routes should still rely on the API for authorization. Use environment variables only for public configuration; never put a secret in a VITE_ variable.',
    ],
    code: [
      code(
        'tsx',
        'Query with loading, error and empty states',
        `function CourseList() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/courses").then((res) => res.data.courses),
  });

  if (isLoading) return <Spinner label="Loading courses…" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState title="No courses yet" />;

  return (
    <ul>
      {data.map((course) => (
        <li key={course.id}>{course.title}</li>
      ))}
    </ul>
  );
}`,
        ['The query key is the cache identity.', 'Each state has a deliberate UI rather than a blank screen.']
      ),
    ],
    commands: [
      cmd('Frontend', 'npm run dev -w client', 'Start the Vite development server.', ['npm run dev -w client']),
      cmd('Quality', 'npm run build -w client', 'Create a production build.', ['npm run build -w client']),
    ],
    diagram: diagram('client-server', 'React data flow', 'Component, query cache, HTTP API, database, render states.'),
    mistakes: [
      'Copying server data into local state and letting the two drift.',
      'Ignoring loading and error states.',
      'Using an array index as a key for a reorderable list.',
    ],
    troubleshooting: [
      trouble('The UI shows stale data after a mutation.', 'Invalidate the relevant query keys or update the cache explicitly.'),
      trouble('A protected page flashes before redirecting.', 'Render a loading state while auth is resolving, then redirect.'),
    ],
  },
  {
    id: 'fullstack-testing-deploy',
    courses: ['react', 'node', 'full-stack', 'fullstack'],
    topics: ['testing', 'deployment', 'integration test', 'build', 'production'],
    term: 'Testing and deployment',
    definition:
      'Testing verifies behaviour at unit, integration and end-to-end levels. Deployment packages the built application and runs it with production configuration.',
    paragraphs: [
      'Test the behaviour users depend on. Unit tests cover pure logic; integration tests exercise routes with a real or disposable database; end-to-end tests cover critical journeys in a browser. Keep tests deterministic and independent.',
      'Build the exact artifact that will run in production. Run type checks, tests and migrations in CI. Use a staging environment for smoke tests. Health checks should verify the process and, when appropriate, database connectivity.',
      'Deployments need a rollback plan. Keep migrations backward compatible during a rolling deploy, run them before the new code needs them, and monitor error rates and latency after release. Never deploy with development secrets or an unverified database target.',
    ],
    code: [
      code(
        'yaml',
        'A minimal CI pipeline',
        `name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
      - run: npm test`,
        ['npm ci installs exactly the lockfile.', 'Type check and build before running the test suite.']
      ),
    ],
    commands: [
      cmd('Testing', 'npm test', 'Run the project test suite.', ['npm test']),
      cmd('Build', 'npm run build', 'Build client and server for production.', ['npm run build']),
      cmd('Production', 'NODE_ENV=production npm start', 'Start the built server with production configuration.', ['NODE_ENV=production npm start']),
    ],
    diagram: diagram('pipeline', 'Delivery pipeline', 'Commit, install, typecheck, test, build, migrate, deploy, smoke test.'),
    mistakes: [
      'Deploying a build that was not produced by CI.',
      'Running destructive migrations before a backup.',
      'Skipping smoke tests after deployment.',
    ],
    troubleshooting: [
      trouble('The deployed app returns 502.', 'Check the process logs, PORT binding, start command and whether the build output exists.'),
      trouble('The database is unreachable in production.', 'Check the connection string, SSL mode, pooler versus direct URL, and network allowlists.'),
    ],
  },
  {
    id: 'ai-llm-basics',
    courses: ['ai', 'llm', 'artificial intelligence'],
    topics: ['llm', 'token', 'embedding', 'context window', 'how llms work'],
    term: 'How large language models work',
    definition:
      'A large language model predicts the next token from a sequence of tokens. Embeddings represent text as vectors; the context window bounds how much text the model can attend to at once.',
    paragraphs: [
      'Text is split into tokens, which are subword units rather than words. The model converts tokens into vectors, processes them through many transformer layers, and produces a probability distribution over the next token. Generation repeats this process, sampling from the distribution according to temperature and other settings.',
      'Embeddings map text to vectors whose distances capture semantic similarity. They power semantic search, clustering and retrieval. A context window is the maximum number of tokens the model can consider in one request; it includes the system prompt, conversation history, retrieved documents and the answer.',
      'A model does not retrieve facts from a database unless you give it tools or context. It can hallucinate confidently. Treat output as a draft that must be validated, especially for code, security, medical, legal or financial decisions.',
    ],
    diagram: diagram('pipeline', 'LLM inference pipeline', 'Text, tokenizer, embeddings, transformer layers, next-token distribution, detokenizer.'),
    formulas: [
      formula('Attention', 'Attention(Q, K, V) = softmax(QKᵀ / √dₖ) V', 'Scaled dot-product attention weights values by the similarity between queries and keys.'),
      formula('Cosine similarity', 'cos(a, b) = (a · b) / (‖a‖ ‖b‖)', 'A common similarity measure for embedding vectors.'),
    ],
    mistakes: [
      'Assuming the model has memory of previous conversations without sending history.',
      'Putting critical instructions only at the beginning of a very long context.',
      'Treating generated facts as verified without a source.',
    ],
    troubleshooting: [
      trouble('The model ignores an instruction.', 'Move the instruction closer to the end, make it explicit, and reduce competing context.'),
      trouble('Responses are inconsistent.', 'Lower temperature for deterministic tasks and validate structured output with a schema.'),
    ],
  },
  {
    id: 'ai-prompt-design',
    courses: ['ai', 'llm', 'artificial intelligence'],
    topics: ['prompt', 'structured output', 'schema', 'failure mode', 'prompt design'],
    term: 'Prompt design and structured output',
    definition:
      'A prompt is an interface. Good prompts state the role, task, context, constraints and output format, and they are tested against representative inputs.',
    paragraphs: [
      'Separate instructions from data. Tell the model what it must do, what it must not do, and how to respond when information is missing. Provide examples when the format is subtle, but keep them consistent. Prefer explicit constraints over vague adjectives.',
      'For structured output, define a JSON schema and validate the response at runtime. Do not trust that the model followed the schema. Retry with the validation error, or use a provider feature that enforces a schema. Keep the schema small and flat where possible.',
      'Prompts are code: version them, review them and test them. Build a small evaluation set with expected properties. Track failures by category such as missing field, wrong format, hallucinated fact or refusal. Change one variable at a time.',
    ],
    code: [
      code(
        'json',
        'A small output schema',
        `{
  "type": "object",
  "required": ["summary", "difficulty", "prerequisites"],
  "properties": {
    "summary": { "type": "string", "maxLength": 400 },
    "difficulty": { "enum": ["beginner", "intermediate", "advanced"] },
    "prerequisites": {
      "type": "array",
      "items": { "type": "string" },
      "maxItems": 8
    }
  },
  "additionalProperties": false
}`,
        ['Validate the parsed object against this schema before using it.', 'A closed schema prevents the model from inventing extra fields.']
      ),
    ],
    diagram: diagram('flow', 'Prompt-to-output pipeline', 'Prompt, model, raw output, schema validation, retry or accept.'),
    mistakes: [
      'Putting untrusted user text where it can override system instructions.',
      'Parsing JSON with a permissive regex instead of a real parser and schema.',
      'Changing several prompt variables at once and losing the ability to attribute improvements.',
    ],
    troubleshooting: [
      trouble('The model returns prose around JSON.', 'Ask for JSON only, use a schema-enforced mode, and strip or reject non-JSON output.'),
      trouble('The model invents missing fields.', 'Make fields optional or explicitly allow null, and instruct the model to say when information is unavailable.'),
    ],
  },
  {
    id: 'ai-rag',
    courses: ['ai', 'llm', 'artificial intelligence'],
    topics: ['retrieval', 'rag', 'chunking', 'vector', 'citation', 'embeddings'],
    term: 'Retrieval-augmented generation',
    definition:
      'RAG retrieves relevant documents from an index and places them in the model context so answers can be grounded in source material.',
    paragraphs: [
      'The pipeline has offline and online halves. Offline: ingest documents, clean them, split them into chunks, embed each chunk and store vectors with metadata. Online: embed the query, retrieve candidate chunks, rerank them, build a context window and ask the model to answer with citations.',
      'Chunking is a design decision. Chunks must be small enough to fit several in the context but large enough to preserve meaning. Respect document structure: headings, code blocks and tables should not be split arbitrarily. Store source, title, section and URL metadata for citations.',
      'Retrieval quality limits answer quality. Measure recall and precision on a labelled query set before tuning the prompt. If the answer is not in the retrieved context, the model should say so. Never present an unsupported answer as if it came from a source.',
    ],
    code: [
      code(
        'python',
        'Minimal retrieval loop',
        `def answer(question: str, top_k: int = 5) -> str:
    query_vector = embed(question)
    hits = vector_store.search(query_vector, top_k=top_k)
    context = "\\n\\n".join(
        f"[{hit.id}] {hit.title}\\n{hit.text}" for hit in hits
    )
    prompt = f"""Answer using only the context below.
Cite source ids in square brackets. If the answer is absent, say so.

Context:
{context}

Question: {question}
"""
    return llm.generate(prompt)`,
        ['The prompt forbids unsupported answers.', 'Source ids make citations checkable.']
      ),
    ],
    commands: [
      cmd('Python', 'python -m pip install sentence-transformers', 'Install a local embedding library.', ['python -m pip install sentence-transformers'], {
        warnings: ['Model downloads can be large; check licensing and disk space.'],
      }),
    ],
    diagram: diagram('pipeline', 'RAG pipeline', 'Ingest, chunk, embed, index, query, retrieve, rerank, generate with citations.'),
    mistakes: [
      'Retrieving too few or too many chunks.',
      'Ignoring document structure when chunking.',
      'Allowing the model to answer without checking the retrieved context.',
    ],
    troubleshooting: [
      trouble('Answers miss obvious facts that exist in the corpus.', 'Inspect retrieval results first; improve chunking, embeddings or query expansion before changing the prompt.'),
      trouble('Citations point to the wrong source.', 'Store stable source ids with each chunk and require the model to cite only retrieved ids.'),
    ],
  },
  {
    id: 'ai-evaluation-safety',
    courses: ['ai', 'llm', 'artificial intelligence'],
    topics: ['evaluation', 'safety', 'cost', 'quality', 'production'],
    term: 'Evaluation, safety and cost control',
    definition:
      'Evaluation measures whether an AI system meets quality, safety and cost requirements. Production AI needs guardrails, observability and a budget.',
    paragraphs: [
      'Define success before choosing a model. Build a representative evaluation set with expected properties, not just one happy-path prompt. Use deterministic checks for format and factual constraints, and human review for subjective quality. Track regressions when prompts, models or retrieval change.',
      'Safety controls include input validation, prompt-injection defences, output filtering, rate limits, tool permission boundaries and human approval for high-impact actions. Treat all model output as untrusted input. Log enough to investigate incidents without storing unnecessary personal data.',
      'Cost has two parts: tokens and latency. Measure tokens per request, cache stable prompts and retrieval results, choose smaller models for simple tasks, and cap output length. Monitor spend per feature and per user. A cheaper model that fails more often can be more expensive overall.',
    ],
    formulas: [
      formula('Precision', 'Precision = TP / (TP + FP)', 'Of the items the system flagged, how many were correct.'),
      formula('Recall', 'Recall = TP / (TP + FN)', 'Of the items that should have been found, how many were found.'),
      formula('F1 score', 'F1 = 2 · (Precision · Recall) / (Precision + Recall)', 'Harmonic mean of precision and recall.'),
    ],
    diagram: diagram('pipeline', 'AI quality loop', 'Dataset, evaluation, error analysis, prompt or model change, regression check, deploy.'),
    mistakes: [
      'Shipping without an evaluation set.',
      'Optimising average quality while ignoring rare but severe failures.',
      'Letting an agent call destructive tools without approval or limits.',
    ],
    troubleshooting: [
      trouble('Quality dropped after a model upgrade.', 'Run the evaluation set, compare per-category results, and pin the previous model until regressions are fixed.'),
      trouble('Costs are higher than expected.', 'Measure input and output tokens, cache repeated context, shorten prompts and route simple requests to smaller models.'),
    ],
  },
  {
    id: 'ml-mental-model',
    courses: ['machine learning', 'ml', 'artificial intelligence'],
    topics: ['machine learning', 'can and cannot', 'mental model', 'ml projects'],
    term: 'What machine learning can and cannot do',
    definition:
      'Machine learning learns patterns from data to make predictions or decisions. It is not magic, and it cannot reliably solve problems without representative data or a measurable objective.',
    paragraphs: [
      'Supervised learning maps inputs to labelled outputs. Unsupervised learning finds structure without labels. Reinforcement learning learns actions from rewards. Most business problems are supervised: predict a value, classify an item or rank candidates.',
      'A model only knows what is in its training data and features. Distribution shift, label noise, missing data and leakage are common failure modes. If the future does not resemble the past, a learned pattern may not hold. Causation requires experiment design, not just correlation.',
      'Start with the decision the model will support. Define the target, the unit of prediction, the cost of errors and the baseline. A simple rule or existing process is often the right baseline. Machine learning is justified when it improves a measurable outcome enough to cover its operational cost.',
    ],
    diagram: diagram('pipeline', 'ML project lifecycle', 'Problem framing, data, features, model, evaluation, deployment, monitoring.'),
    mistakes: [
      'Starting with a model before defining the decision and success metric.',
      'Using accuracy on an imbalanced classification problem.',
      'Ignoring how the model will be maintained after deployment.',
    ],
    troubleshooting: [
      trouble('The model performs well offline but poorly in production.', 'Check for data leakage, distribution shift and differences between training and serving features.'),
      trouble('Stakeholders expect perfect predictions.', 'Communicate the baseline, error costs and uncertainty; show a confusion matrix rather than a single score.'),
    ],
  },
  {
    id: 'ml-data-features',
    courses: ['machine learning', 'ml'],
    topics: ['data cleaning', 'feature engineering', 'missing values', 'outliers', 'features'],
    term: 'Data cleaning and feature engineering',
    definition:
      'Data cleaning fixes or removes invalid data. Feature engineering creates informative inputs that make the learning problem easier.',
    paragraphs: [
      'Profile the data before modelling: row counts, types, missingness, duplicates, ranges and category frequencies. Distinguish missing at random from missing for a reason. Impute with a documented strategy or let the model handle missing values if it supports them. Never silently drop rows that matter.',
      'Features should be available at prediction time. Avoid leakage from the target or from future information. Encode categorical variables appropriately, scale numeric features for distance-based models, and handle skewed distributions with transforms when justified.',
      'Keep preprocessing inside a pipeline so the same transformations are applied during training and inference. Fit imputers and scalers on training data only. Version the dataset and the feature definitions so results are reproducible.',
    ],
    code: [
      code(
        'python',
        'A scikit-learn preprocessing pipeline',
        `from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

numeric = Pipeline([
    ("impute", SimpleImputer(strategy="median")),
    ("scale", StandardScaler()),
])
categorical = Pipeline([
    ("impute", SimpleImputer(strategy="most_frequent")),
    ("encode", OneHotEncoder(handle_unknown="ignore")),
])
preprocess = ColumnTransformer([
    ("num", numeric, ["age", "income"]),
    ("cat", categorical, ["country", "plan"]),
])`,
        ['Fit the pipeline on the training split only.', 'handle_unknown="ignore" prevents unseen categories from crashing inference.']
      ),
    ],
    diagram: diagram('pipeline', 'Feature pipeline', 'Raw data, cleaning, imputation, encoding, scaling, model.'),
    mistakes: [
      'Fitting a scaler on the full dataset before splitting.',
      'Using a feature that is only known after the outcome.',
      'Imputing with a statistic that leaks test data.',
    ],
    troubleshooting: [
      trouble('The model performs suspiciously well.', 'Look for target leakage and duplicate rows across train and test.'),
      trouble('Inference fails on unseen categories.', 'Use handle_unknown="ignore" or a category policy that maps rare values to "other".'),
    ],
  },
  {
    id: 'ml-sklearn-models',
    courses: ['machine learning', 'ml'],
    topics: ['regression', 'classification', 'scikit-learn', 'train models', 'end to end'],
    term: 'Regression and classification with scikit-learn',
    definition:
      'Regression predicts a continuous value. Classification predicts a class. scikit-learn provides consistent fit, predict and score APIs for both.',
    paragraphs: [
      'Split data into training and test sets before fitting anything. Use cross-validation on the training set for model selection and keep the test set for a final unbiased estimate. For time-series data, split by time rather than randomly.',
      'Start with simple baselines: mean prediction for regression, majority class for classification. Then try linear models, trees and ensembles. Regularisation controls overfitting. For imbalanced classes, use class weights or resampling and choose metrics that reflect the real cost of errors.',
      'A model is more than a score. Inspect coefficients or feature importance, examine errors by segment, and check calibration for probabilistic classifiers. Save the fitted pipeline, not just the estimator, so preprocessing travels with the model.',
    ],
    code: [
      code(
        'python',
        'Train and evaluate a classifier',
        `from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

X, y = load_breast_cancer(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

model = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
scores = cross_val_score(model, X_train, y_train, cv=5, scoring="f1")
model.fit(X_train, y_train)
print("CV F1:", scores.mean())
print(classification_report(y_test, model.predict(X_test)))`,
        ['The pipeline keeps scaling inside cross-validation.', 'stratify preserves class proportions in the split.']
      ),
    ],
    formulas: [
      formula('Linear regression', 'ŷ = β₀ + β₁x₁ + … + βₙxₙ', 'The model predicts a weighted sum of input features.'),
      formula('Logistic function', 'σ(z) = 1 / (1 + e⁻ᶻ)', 'Maps a linear score to a probability between 0 and 1.'),
    ],
    diagram: diagram('pipeline', 'Model training workflow', 'Split, preprocess, cross-validate, fit, evaluate, inspect errors.'),
    mistakes: [
      'Evaluating on the training data.',
      'Scaling before splitting and leaking test statistics.',
      'Using accuracy when one class dominates.',
    ],
    troubleshooting: [
      trouble('Cross-validation score is much higher than the test score.', 'Check for leakage, duplicate rows and distribution differences between splits.'),
      trouble('The model predicts only one class.', 'Inspect class balance, adjust class weights, and check that the features actually carry signal.'),
    ],
  },
  {
    id: 'ml-evaluation',
    courses: ['machine learning', 'ml'],
    topics: ['evaluation', 'overfitting', 'cross-validation', 'measure', 'generalisation'],
    term: 'Evaluation, overfitting and cross-validation',
    definition:
      'Generalisation is performance on unseen data. Overfitting means fitting noise in the training set. Cross-validation estimates generalisation by rotating validation splits.',
    paragraphs: [
      'A single train/test split is noisy, especially with small datasets. k-fold cross-validation trains k models on different folds and reports the distribution of scores. Stratified folds preserve class proportions; grouped folds keep related records together; time-series folds respect chronology.',
      'Choose metrics from the decision. Precision matters when false positives are costly; recall matters when false negatives are costly. F1 balances both. ROC-AUC measures ranking across thresholds; precision-recall curves are more informative for rare positives. Regression uses MAE, RMSE and R², each with different sensitivity to outliers.',
      'Overfitting is diagnosed by a large gap between training and validation performance. More data, simpler models, regularisation, feature selection and early stopping can help. Underfitting shows poor performance on both sets and calls for a richer model or better features.',
    ],
    formulas: [
      formula('Mean absolute error', 'MAE = (1/n) Σ |yᵢ − ŷᵢ|', 'Average absolute difference between actual and predicted values.'),
      formula('Root mean squared error', 'RMSE = √((1/n) Σ (yᵢ − ŷᵢ)²)', 'Penalises large errors more heavily than MAE.'),
      formula('R²', 'R² = 1 − SS_res / SS_tot', 'Fraction of variance explained relative to a mean baseline.'),
    ],
    diagram: diagram('flow', 'Bias-variance trade-off', 'Underfitting, balanced fit and overfitting across model complexity.'),
    mistakes: [
      'Tuning hyperparameters on the test set.',
      'Using random folds for time-series or grouped data.',
      'Reporting one metric without the confusion matrix or error distribution.',
    ],
    troubleshooting: [
      trouble('Validation scores vary wildly across folds.', 'Increase folds or data, check for outliers and use repeated cross-validation.'),
      trouble('Test performance is much worse than validation.', 'The test set may differ in distribution, or the model selection leaked information.'),
    ],
  },
  {
    id: 'ml-end-to-end',
    courses: ['machine learning', 'ml'],
    topics: ['end-to-end project', 'raw csv', 'documented model', 'project'],
    term: 'A small end-to-end machine learning project',
    definition:
      'An end-to-end project goes from a raw dataset to a documented, reproducible model with an evaluation report and a clear usage path.',
    paragraphs: [
      'Start with a question and a dataset. Document the source, licence, schema and known limitations. Split the data, build a preprocessing pipeline, train a baseline and compare a small set of candidate models. Record the exact versions and random seeds.',
      'Evaluate with metrics tied to the decision, then inspect errors by segment. Write a short model card: intended use, data, features, metrics, limitations and ethical considerations. Save the fitted pipeline and a sample inference script.',
      'Reproducibility is part of the deliverable. A fresh environment should be able to install dependencies, run the training script and reproduce the reported metrics. Store the data or a stable pointer to it, and never commit secrets or personal data.',
    ],
    code: [
      code(
        'text',
        'Project deliverables',
        `README.md            — question, data source, how to run
data/README.md       — schema, licence, limitations
src/preprocess.py    — cleaning and feature pipeline
src/train.py         — training and evaluation
src/predict.py       — load model and score new rows
reports/metrics.json — evaluation results
reports/model-card.md — intended use and limitations
requirements.txt     — pinned dependencies`,
        ['A reader should be able to reproduce the result without asking questions.']
      ),
    ],
    diagram: diagram('pipeline', 'End-to-end project', 'Question, data, pipeline, baseline, model, evaluation, documentation, inference.'),
    mistakes: [
      'Leaving the dataset source and licence undocumented.',
      'Committing personal data or API keys.',
      'Reporting a score without the code that produced it.',
    ],
    troubleshooting: [
      trouble('A fresh environment cannot reproduce the result.', 'Pin dependencies, set random seeds, and document data acquisition and preprocessing.'),
      trouble('The model is not usable by anyone.', 'Provide a prediction script or API with a clear input schema and example.'),
    ],
  },
];
