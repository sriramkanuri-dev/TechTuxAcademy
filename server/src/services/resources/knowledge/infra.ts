import { cmd, code, diagram, formula, trouble, type ConceptDefinition } from './shared';

export const infraConcepts: ConceptDefinition[] = [
  {
    id: 'devops-principles',
    courses: ['devops', 'cloud', 'delivery'],
    topics: ['devops principles', 'delivery pipeline', 'high-performing', 'pipeline'],
    term: 'DevOps principles and the delivery pipeline',
    definition:
      'DevOps is a set of practices that shorten the path from a change to production while improving reliability and feedback.',
    paragraphs: [
      'High-performing teams optimise flow: small changes, automated tests, fast builds, trunk-based development and a deployment pipeline that makes releases routine. The goal is not "more tools" but shorter feedback loops and fewer handoffs.',
      'A delivery pipeline has stages: source, build, test, package, deploy, verify and observe. Each stage should be automated, reproducible and fast enough to run on every change. Artifacts should be immutable and promoted between environments rather than rebuilt.',
      'Measure lead time, deployment frequency, change failure rate and time to restore. These DORA metrics describe outcomes, not activity. Blame-free retrospectives turn incidents into improvements.',
    ],
    diagram: diagram('pipeline', 'Delivery pipeline', 'Commit, build, test, package, deploy, verify, observe, learn.'),
    mistakes: [
      'Automating deployment without automated tests.',
      'Maintaining long-lived branches that drift from main.',
      'Measuring individual productivity instead of system flow.',
    ],
    troubleshooting: [
      trouble('Releases are slow and risky.', 'Reduce batch size, automate the repeatable steps and add smoke tests.'),
      trouble('The pipeline is flaky.', 'Quarantine flaky tests, fix the root cause, and make test data deterministic.'),
    ],
  },
  {
    id: 'devops-docker',
    courses: ['devops', 'cloud', 'docker'],
    topics: ['docker', 'image', 'layer', 'compose', 'container'],
    term: 'Docker images, layers and Compose',
    definition:
      'A container packages an application with its user-space dependencies. An image is a stack of immutable layers; a container is a running instance of an image.',
    paragraphs: [
      'Each Dockerfile instruction creates a layer. Order instructions from least to most frequently changing so dependency installation is cached. Use a small, trusted base image, pin versions, run as a non-root user and copy only what the application needs.',
      'A multi-stage build compiles in a builder image and copies the artifact into a slim runtime image. This reduces size and attack surface. Use .dockerignore to keep node_modules, .git and secrets out of the build context.',
      'Docker Compose describes multiple services, networks and volumes for local development or small deployments. It is not a production orchestrator. For production, use a managed container platform or Kubernetes with proper secrets, health checks and persistent storage.',
    ],
    code: [
      code(
        'docker',
        'Multi-stage Node.js image',
        `FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]`,
        ['The build stage has dev dependencies; the runtime stage does not.', 'Running as node avoids root inside the container.']
      ),
    ],
    commands: [
      cmd('Docker', 'docker build -t app:1.0 .', 'Build an image from the current directory.', ['docker build -t app:1.0 .']),
      cmd('Docker', 'docker run --rm -p 4000:4000 app:1.0', 'Run a container and publish a port.', ['docker run --rm -p 4000:4000 app:1.0'], {
        warnings: ['Do not pass secrets as build arguments; they persist in image history.'],
      }),
      cmd('Docker', 'docker compose up -d', 'Start a Compose stack in the background.', ['docker compose up -d', 'docker compose logs -f']),
      cmd('Docker', 'docker image prune -f', 'Remove unused dangling images.', ['docker image prune -f']),
    ],
    diagram: diagram('layers', 'Container image layers', 'Base image, dependencies, application code, writable container layer.'),
    mistakes: [
      'Running as root in the container.',
      'Copying the entire build context including secrets and node_modules.',
      'Using latest tags and unpinned base images in production.',
    ],
    troubleshooting: [
      trouble('The container exits immediately.', 'Check docker logs, the entrypoint, environment variables and whether the process stays in the foreground.'),
      trouble('Changes are not reflected in the image.', 'Check layer cache order and .dockerignore; rebuild with --no-cache to verify.'),
    ],
  },
  {
    id: 'devops-github-actions',
    courses: ['devops', 'cloud', 'github actions'],
    topics: ['github actions', 'ci/cd', 'workflow', 'automate tests'],
    term: 'CI/CD with GitHub Actions',
    definition:
      'GitHub Actions runs workflows in response to repository events. A workflow contains jobs, and each job runs steps on a runner.',
    paragraphs: [
      'A workflow is YAML stored in .github/workflows. Triggers include push, pull_request, schedule and manual dispatch. Jobs run in parallel by default; use needs to express dependencies. Steps can run shell commands or reusable actions.',
      'Cache dependencies keyed by the lockfile to speed up installs. Use least-privilege permissions for GITHUB_TOKEN and store secrets in repository or environment secrets. Never print secrets; mask derived values when necessary.',
      'Separate CI from deployment. Build and test every pull request; deploy only from a protected branch or a tagged release. Use environments with required reviewers for production and keep deployment credentials scoped to the environment.',
    ],
    code: [
      code(
        'yaml',
        'Build, test and deploy workflow',
        `name: ci-cd
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
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
      - run: npm test
      - run: npm run build
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Deploy using environment-scoped secrets"`,
        ['The deploy job only runs after tests pass on main.', 'Environment secrets are not exposed to pull requests from forks.']
      ),
    ],
    commands: [
      cmd('GitHub CLI', 'gh run list', 'List recent workflow runs.', ['gh run list']),
      cmd('GitHub CLI', 'gh run watch', 'Watch a workflow run until it completes.', ['gh run watch']),
      cmd('GitHub CLI', 'gh secret set PROD_TOKEN', 'Set a repository or environment secret interactively.', ['gh secret set PROD_TOKEN']),
    ],
    diagram: diagram('pipeline', 'GitHub Actions workflow', 'Event, workflow, jobs, steps, runner, artifacts, deployment.'),
    mistakes: [
      'Storing secrets in workflow files.',
      'Giving the token write permissions when read is enough.',
      'Deploying from untrusted pull request code with production secrets.',
    ],
    troubleshooting: [
      trouble('A workflow works on one branch but not another.', 'Check triggers, branch protection and environment approval rules.'),
      trouble('A secret is empty in a pull request.', 'Fork pull requests do not receive repository secrets by design.'),
    ],
  },
  {
    id: 'devops-kubernetes',
    courses: ['devops', 'cloud', 'kubernetes'],
    topics: ['kubernetes', 'pod', 'deployment', 'service', 'ingress', 'cluster'],
    term: 'Kubernetes core concepts',
    definition:
      'Kubernetes schedules containers across a cluster. Pods are the smallest deployable unit; Deployments manage replica sets; Services provide stable networking; Ingress exposes HTTP routes.',
    paragraphs: [
      'A Pod contains one or more containers that share a network namespace and volumes. A Deployment declares the desired number of replicas and a pod template; the controller reconciles the actual state. A Service selects pods by labels and gives them a stable virtual IP or DNS name.',
      'Configuration belongs in ConfigMaps and Secrets, mounted or injected as environment variables. Resource requests and limits influence scheduling and protect the cluster. Probes tell Kubernetes when a pod is ready and when it is alive; without them, traffic can reach a starting or stuck container.',
      'Ingress or a Gateway API resource routes external traffic to Services. TLS termination, host rules and path routing are configured there. Persistent storage requires a StorageClass and PersistentVolumeClaim; not every workload should be stateful in Kubernetes.',
    ],
    commands: [
      cmd('Kubernetes', 'kubectl get pods', 'List pods in the current namespace.', ['kubectl get pods', 'kubectl get pods -A']),
      cmd('Kubernetes', 'kubectl describe pod NAME', 'Show events, state and container details for a pod.', ['kubectl describe pod web-7d9f8c6b5-abcde']),
      cmd('Kubernetes', 'kubectl logs deployment/web --tail=100', 'Read logs from a deployment.', ['kubectl logs deployment/web --tail=100', 'kubectl logs -f pod/NAME']),
      cmd('Kubernetes', 'kubectl apply -f deployment.yaml', 'Apply a manifest to the cluster.', ['kubectl apply -f deployment.yaml']),
      cmd('Kubernetes', 'kubectl rollout status deployment/web', 'Watch a deployment rollout.', ['kubectl rollout status deployment/web', 'kubectl rollout undo deployment/web']),
    ],
    diagram: diagram('layers', 'Kubernetes objects', 'Cluster, node, pod, deployment, service, ingress, persistent volume.'),
    mistakes: [
      'Deploying without readiness and liveness probes.',
      'Storing secrets in plain ConfigMaps.',
      'Using the default namespace for everything and losing isolation.',
    ],
    troubleshooting: [
      trouble('A pod is stuck in CrashLoopBackOff.', 'Read kubectl logs and kubectl describe for the exit code, events and failing command.'),
      trouble('A Service has no endpoints.', 'Check the selector, pod labels and readiness probe status.'),
    ],
  },
  {
    id: 'devops-observability',
    courses: ['devops', 'cloud'],
    topics: ['observability', 'logs', 'metrics', 'zero-downtime', 'rollout', 'monitoring'],
    term: 'Observability and safe rollouts',
    definition:
      'Observability is the ability to understand a system from its outputs: logs, metrics and traces. Safe rollouts limit the blast radius of a change.',
    paragraphs: [
      'Logs record discrete events, metrics aggregate numeric time series, and traces follow a request across services. Use structured logs with correlation ids, meaningful metric names and trace context. Dashboards should answer operational questions, not display every possible number.',
      'Define service-level indicators (SLIs) and objectives (SLOs). Availability, latency, error rate and saturation are common. Alert on symptoms that affect users, not on every internal threshold. Runbooks should explain the first diagnostic steps.',
      'A zero-downtime rollout needs health checks, graceful shutdown, connection draining and backward-compatible migrations. Canary or blue-green deployments reduce risk. Watch error rate and latency during the rollout and roll back automatically when the objective is breached.',
    ],
    formulas: [
      formula('Availability', 'Availability = successful requests / total requests', 'A basic service-level indicator over a time window.'),
      formula('Error budget', 'Error budget = 1 − SLO', 'The amount of unreliability a service can tolerate in a period.'),
    ],
    diagram: diagram('timeline', 'Safe rollout', 'Deploy canary, observe, expand traffic, verify, roll back if needed.'),
    mistakes: [
      'Alerting on CPU alone while users experience errors.',
      'Deploying a breaking database migration and new code at the same time.',
      'Shutting down without draining in-flight requests.',
    ],
    troubleshooting: [
      trouble('Error rate spikes after a deploy.', 'Compare the canary and stable versions, check logs and traces, and roll back first if user impact is ongoing.'),
      trouble('Metrics are missing.', 'Check the scrape target, labels, service discovery and exporter health.'),
    ],
  },
  {
    id: 'devops-capstone',
    courses: ['devops', 'cloud'],
    topics: ['capstone', 'full-stack app', 'deploy', 'pipeline together'],
    term: 'Capstone: deploy a full-stack application',
    definition:
      'A capstone deployment combines source control, CI, container packaging, a database, secrets, a reverse proxy, TLS and observability.',
    paragraphs: [
      'Start with a reproducible build. The pipeline should install from a lockfile, run tests, build the client and server, and produce an immutable artifact. The runtime should receive configuration only through environment variables and secrets.',
      'Provision the database separately, run migrations before the new application version starts, and verify connectivity. Put a reverse proxy or platform router in front of the app for TLS and HTTP routing. Health checks should cover the process and critical dependencies.',
      'Document the runbook: deploy, roll back, rotate secrets, restore a backup and inspect logs. A deployment is complete only when the live URL, authentication, database writes and error monitoring have been verified.',
    ],
    diagram: diagram('client-server', 'Capstone deployment', 'Browser, TLS proxy, app server, database, object storage, monitoring.'),
    mistakes: [
      'Hard-coding production URLs and secrets in the image.',
      'Running migrations after the new code is already serving traffic when the schema is not backward compatible.',
      'Skipping a post-deploy smoke test.',
    ],
    troubleshooting: [
      trouble('The app starts but cannot write to the database.', 'Check migrations, connection string, SSL mode, user privileges and network access.'),
      trouble('TLS works but the app redirects to HTTP.', 'Check proxy headers, trust proxy settings and the public base URL.'),
    ],
  },
  {
    id: 'security-mindset',
    courses: ['security', 'cybersecurity'],
    topics: ['security mindset', 'threat model', 'asset', 'trust boundary', 'attacker'],
    term: 'The security mindset and threat modelling',
    definition:
      'Threat modelling identifies assets, attackers, trust boundaries and abuse cases before code is written. The security mindset assumes components can fail or be compromised.',
    paragraphs: [
      'Start by listing assets: data, credentials, availability and reputation. Identify who might want them and what capabilities they have. Draw trust boundaries where data crosses from a less trusted zone to a more trusted one: browser to API, API to database, service to third-party API.',
      'Use STRIDE as a prompt: spoofing, tampering, repudiation, information disclosure, denial of service and elevation of privilege. For each threat, decide whether to mitigate, transfer, accept or avoid. Record the decision so future changes can be evaluated against it.',
      'Security is a property of the whole system, not a checklist. Least privilege, defence in depth, secure defaults, fail-safe behaviour and complete mediation are durable principles. Assume every input is hostile and every secret can leak.',
    ],
    diagram: diagram('flow', 'Threat model', 'Assets, actors, trust boundaries, threats, mitigations, residual risk.'),
    mistakes: [
      'Threat modelling only after the architecture is frozen.',
      'Focusing on exotic attacks while ignoring default credentials and missing authorization.',
      'Treating compliance as equivalent to security.',
    ],
    troubleshooting: [
      trouble('A new feature has no security review.', 'Add abuse cases to the design review and test authorization and input validation explicitly.'),
      trouble('A threat model is stale.', 'Revisit it when data flows, trust boundaries or dependencies change.'),
    ],
  },
  {
    id: 'security-auth',
    courses: ['security', 'cybersecurity'],
    topics: ['authentication', 'session', 'bcrypt', 'argon2', 'httpOnly', 'password storage'],
    term: 'Authentication, sessions and password storage',
    definition:
      'Authentication verifies identity. Password storage must use a slow, salted password hash. Session cookies must be httpOnly, Secure and SameSite-protected.',
    paragraphs: [
      'Use Argon2id or bcrypt with a per-password salt and a cost calibrated to your hardware. Rehash on login when the cost changes. Enforce a minimum length, block known-breached passwords, and rate-limit login attempts without leaking whether an account exists.',
      'Session identifiers must be random and unpredictable. Store them server-side or use signed tokens with expiry and rotation. Set httpOnly to block JavaScript access, Secure to require HTTPS, and SameSite to limit cross-site sending. Regenerate the session on login to prevent fixation.',
      'Multi-factor authentication raises the cost of credential theft. Recovery codes and reset flows are part of the authentication system and are often the weakest link. Protect them with the same rigour as passwords.',
    ],
    code: [
      code(
        'typescript',
        'Secure cookie settings',
        `res.cookie("session", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});`,
        ['SameSite=Lax blocks most cross-site POSTs while allowing normal top-level navigation.', 'Use SameSite=None only when cross-site cookies are genuinely required, and only with Secure.']
      ),
    ],
    diagram: diagram('flow', 'Login and session', 'Credentials, rate limit, hash verification, session creation, cookie, authorization.'),
    mistakes: [
      'Storing passwords with reversible encryption or fast hashes.',
      'Putting session tokens in localStorage.',
      'Revealing whether an email exists during login or reset.',
    ],
    troubleshooting: [
      trouble('Cookies are not stored in production.', 'Check Secure, SameSite, domain, HTTPS and the browser cookie rules.'),
      trouble('Sessions are stolen and replayed.', 'Rotate session ids on login and privilege change, shorten idle timeouts, and support revocation.'),
    ],
  },
  {
    id: 'security-owasp',
    courses: ['security', 'cybersecurity', 'web'],
    topics: ['owasp', 'xss', 'injection', 'csrf', 'ssrf', 'access control', 'top 10'],
    term: 'OWASP Top 10 in practice',
    definition:
      'The OWASP Top 10 is a awareness list of common web application risks, including broken access control, injection, cryptographic failures and SSRF.',
    paragraphs: [
      'Broken access control is the most common serious issue: users can act on resources they do not own, or call admin endpoints without the admin role. Enforce authorization on the server for every request and test it with a lower-privileged account.',
      'Injection occurs when untrusted data is interpreted as code or query syntax. Use parameterized queries, avoid string-built SQL, and never pass user input to a shell. XSS occurs when untrusted data is rendered as HTML; use framework escaping, a strict Content Security Policy and sanitise only where HTML is genuinely required.',
      'CSRF tricks a logged-in browser into sending a state-changing request. Use SameSite cookies and a CSRF token. SSRF tricks the server into requesting an internal URL; validate and allowlist outbound destinations, block link-local and metadata addresses, and do not follow redirects blindly.',
    ],
    commands: [
      cmd('Security testing', 'curl -i -X POST https://app.example/api/admin/users', 'Verify an admin endpoint rejects an unauthenticated request.', ['curl -i -X POST https://app.example/api/admin/users']),
      cmd('Security testing', 'npx snyk test', 'Scan dependencies for known vulnerabilities.', ['npx snyk test'], {
        warnings: ['A scanner does not replace threat modelling or manual authorization testing.'],
      }),
    ],
    diagram: diagram('flow', 'Request attack surface', 'Browser input, API boundary, authorization, query layer, rendering, outbound requests.'),
    mistakes: [
      'Relying on client-side validation for security.',
      'Concatenating user input into SQL or shell commands.',
      'Allowing arbitrary outbound URLs from the server.',
    ],
    troubleshooting: [
      trouble('A user can read another user\'s data by changing an id.', 'Add ownership checks to the query itself, not just to the UI.'),
      trouble('A scanner reports a dependency vulnerability.', 'Assess reachability and exploitability, then upgrade or mitigate; do not ignore it because the scanner is noisy.'),
    ],
  },
  {
    id: 'security-linux-hardening',
    courses: ['security', 'cybersecurity'],
    topics: ['linux hardening', 'monitoring', 'baseline', 'server security'],
    term: 'Linux hardening and monitoring',
    definition:
      'Linux hardening reduces the attack surface: minimal services, strong access control, patching, firewalling, logging and integrity monitoring.',
    paragraphs: [
      'Remove or disable unused services, close unused ports and uninstall unnecessary packages. Use SSH keys, disable direct root login and restrict administrative access. Keep the kernel and user-space patched, and reboot when required.',
      'Enable a host firewall and a mandatory access control system such as SELinux or AppArmor. Configure auditd or equivalent logging, forward logs off-host, and alert on authentication failures, privilege changes and unexpected outbound connections.',
      'Monitor file integrity for critical paths, review scheduled jobs and service accounts, and rotate credentials. A baseline is only useful if you can detect drift from it.',
    ],
    commands: [
      cmd('Hardening', 'ss -tulpn', 'List listening services and owning processes.', ['sudo ss -tulpn']),
      cmd('Hardening', 'systemctl list-unit-files --state=enabled', 'List services enabled at boot.', ['systemctl list-unit-files --state=enabled']),
      cmd('Hardening', 'auditctl -l', 'List active audit rules.', ['sudo auditctl -l']),
      cmd('Monitoring', 'journalctl -p warning -b', 'Show warning-and-above messages from the current boot.', ['journalctl -p warning -b']),
      cmd('Integrity', 'aide --check', 'Check file integrity against the AIDE baseline.', ['sudo aide --check']),
    ],
    diagram: diagram('layers', 'Hardening layers', 'Network, host, accounts, services, kernel controls, logging, monitoring.'),
    mistakes: [
      'Hardening a server without a console fallback.',
      'Disabling SELinux or AppArmor to fix one denial.',
      'Logging locally only, so an attacker can erase the evidence.',
    ],
    troubleshooting: [
      trouble('A hardening change breaks an application.', 'Roll back the specific control, read the denial or audit log, and apply a targeted exception.'),
      trouble('Unexpected outbound connections appear.', 'Identify the process with ss and auditd, then isolate the host and investigate.'),
    ],
  },
  {
    id: 'security-incident-response',
    courses: ['security', 'cybersecurity'],
    topics: ['incident response', 'detect', 'contain', 'eradicate', 'learn'],
    term: 'Incident response basics',
    definition:
      'Incident response is a structured process: prepare, detect, contain, eradicate, recover and learn. Evidence must be preserved while restoring service.',
    paragraphs: [
      'Preparation includes runbooks, contact lists, logging, backups and decision authority. Detection combines alerts, user reports and anomaly analysis. Triage establishes scope and severity before a response consumes resources.',
      'Containment stops spread without destroying evidence: isolate a host, revoke credentials, block an address or disable a feature. Eradication removes the root cause, not only the symptom. Recovery restores from known-good state and verifies integrity.',
      'A post-incident review is blameless and specific. Document the timeline, what worked, what failed and which controls to add. Track the follow-up actions to completion.',
    ],
    diagram: diagram('timeline', 'Incident response lifecycle', 'Prepare, detect, contain, eradicate, recover, learn.'),
    mistakes: [
      'Deleting logs or rebuilding a host before preserving evidence.',
      'Declaring an incident over before verifying persistence mechanisms are gone.',
      'Writing a review that names individuals instead of fixing the system.',
    ],
    troubleshooting: [
      trouble('The scope of an incident is unclear.', 'Preserve evidence, correlate authentication, network and application logs, and establish a timeline.'),
      trouble('The same incident recurs.', 'Look for an unaddressed initial access vector or persistence mechanism; verify the eradication step.'),
    ],
  },
  {
    id: 'database-sql',
    courses: ['database', 'sql', 'postgresql', 'prisma'],
    topics: ['sql', 'database', 'query', 'index', 'transaction', 'join'],
    term: 'SQL, indexes and transactions',
    definition:
      'SQL is a declarative language for querying and modifying relational data. Indexes accelerate lookups; transactions group statements into atomic units.',
    paragraphs: [
      'SELECT describes the result you want; the planner chooses how to execute it. Use explicit JOINs, filter early and select only needed columns. Understand NULL semantics: NULL is unknown, so comparisons with = NULL do not match; use IS NULL.',
      'An index speeds up reads but costs storage and write time. Index columns used in WHERE, JOIN and ORDER BY, and consider composite indexes ordered by selectivity and query pattern. Use EXPLAIN ANALYZE to verify that the planner uses the index and to find sequential scans on large tables.',
      'A transaction provides atomicity, consistency, isolation and durability. Choose an isolation level deliberately; higher isolation reduces anomalies but increases contention. Keep transactions short, and never perform network calls inside a transaction.',
    ],
    code: [
      code(
        'sql',
        'A join with aggregation',
        `SELECT c.title,
       COUNT(e.id) AS enrollments,
       AVG(l.duration_minutes) AS avg_lesson_minutes
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id
LEFT JOIN lessons l ON l.course_id = c.id
WHERE c.published = true
GROUP BY c.id, c.title
ORDER BY enrollments DESC
LIMIT 20;`,
        ['LEFT JOIN keeps courses with no enrollments.', 'Group by the primary key and any selected non-aggregated columns.']
      ),
    ],
    commands: [
      cmd('PostgreSQL', 'psql "$DATABASE_URL"', 'Connect to a PostgreSQL database.', ['psql "$DATABASE_URL"']),
      cmd('PostgreSQL', 'EXPLAIN ANALYZE SELECT ...', 'Show the query plan with actual timing.', ['EXPLAIN ANALYZE SELECT * FROM courses WHERE slug = \'linux\';']),
      cmd('PostgreSQL', '\\d+ courses', 'Describe a table, columns, indexes and constraints.', ['\\d+ courses']),
    ],
    diagram: diagram('layers', 'Query execution', 'SQL text, parser, planner, executor, storage engine, result.'),
    mistakes: [
      'Using SELECT * in production queries.',
      'Adding indexes without checking write cost and actual query plans.',
      'Holding a transaction open while waiting on a user or network call.',
    ],
    troubleshooting: [
      trouble('A query suddenly became slow.', 'Compare EXPLAIN ANALYZE plans, check statistics freshness, indexes and data growth.'),
      trouble('A transaction is blocked.', 'Inspect pg_stat_activity and pg_locks; find the blocking session and resolve it safely.'),
    ],
  },
  {
    id: 'git-version-control',
    courses: ['git', 'devops', 'programming'],
    topics: ['git', 'version control', 'commit', 'branch', 'merge', 'rebase'],
    term: 'Git version control essentials',
    definition:
      'Git stores snapshots of a project as commits. Branches are movable references; merges combine histories; remotes share commits.',
    paragraphs: [
      'A commit records a tree, a parent and metadata. The working tree, index and repository are separate: git add stages changes, git commit records them. A branch is a pointer to a commit, so creating one is cheap.',
      'Merge preserves history and creates a merge commit when histories diverge. Rebase rewrites commits onto a new base and produces a linear history, but it must not be used on commits others have already pulled. Never force-push a shared branch without coordination.',
      'Write commits that explain why, not only what. Keep changes focused. Use tags for releases, .gitignore for generated files and secrets, and review diffs before committing. A clean history is a communication tool.',
    ],
    commands: [
      cmd('Git', 'git status', 'Show working tree and index state.', ['git status', 'git status --short']),
      cmd('Git', 'git diff', 'Show unstaged changes.', ['git diff', 'git diff --staged']),
      cmd('Git', 'git switch -c feature/resources', 'Create and switch to a new branch.', ['git switch -c feature/resources']),
      cmd('Git', 'git add -p', 'Stage changes interactively by hunk.', ['git add -p']),
      cmd('Git', 'git commit -m "Add lesson resource generation"', 'Record staged changes as a commit.', ['git commit -m "Add lesson resource generation"']),
      cmd('Git', 'git log --oneline --graph --decorate -20', 'Show a compact commit graph.', ['git log --oneline --graph --decorate -20']),
      cmd('Git', 'git push -u origin feature/resources', 'Push a branch and set its upstream.', ['git push -u origin feature/resources']),
    ],
    diagram: diagram('flow', 'Git workflow', 'Working tree, index, local commits, remote, pull request, merge.'),
    mistakes: [
      'Committing .env files or credentials.',
      'Force-pushing a shared branch.',
      'Mixing unrelated changes in one commit.',
    ],
    troubleshooting: [
      trouble('You committed a secret.', 'Rotate the secret immediately, remove it from history if necessary, and add a prevention rule.'),
      trouble('A merge conflict is confusing.', 'Resolve file by file, run tests, and commit the resolution; do not blindly choose one side.'),
    ],
  },
  {
    id: 'networking-tcp-ip',
    courses: ['networking', 'security', 'linux'],
    topics: ['tcp', 'ip', 'dns', 'http', 'network', 'subnet', 'port'],
    term: 'TCP/IP, DNS and HTTP essentials',
    definition:
      'TCP/IP is the layered protocol suite behind the internet. IP routes packets; TCP provides reliable streams; DNS resolves names; HTTP carries application requests.',
    paragraphs: [
      'An IP address identifies an interface; a subnet mask or prefix defines the local network. The default gateway forwards traffic outside the local subnet. ARP maps IPv4 addresses to link-layer addresses; IPv6 uses neighbour discovery.',
      'TCP establishes a connection with a handshake, provides ordered reliable delivery and uses flow and congestion control. UDP is connectionless and does not guarantee delivery, which is useful for real-time media and DNS queries. Ports identify services on a host.',
      'DNS is a hierarchical, cached naming system. Records include A/AAAA for addresses, CNAME for aliases, MX for mail and TXT for verification and policy. HTTP is a request-response protocol; HTTPS adds TLS for confidentiality, integrity and server authentication.',
    ],
    formulas: [
      formula('Subnet hosts', 'Usable hosts = 2^(32 − prefix) − 2', 'For IPv4, subtracting the network and broadcast addresses.'),
      formula('Shannon capacity', 'C = B log₂(1 + S/N)', 'Theoretical channel capacity for bandwidth B and signal-to-noise ratio S/N.'),
    ],
    diagram: diagram('network', 'TCP/IP layers', 'Application, transport, internet, link and physical layers.'),
    mistakes: [
      'Confusing a public IP with a private RFC 1918 address.',
      'Assuming DNS changes propagate instantly; TTL caching delays updates.',
      'Testing only ICMP when a TCP service is the real question.',
    ],
    troubleshooting: [
      trouble('A hostname resolves to the wrong address.', 'Check DNS records, local hosts files, resolver cache and TTL.'),
      trouble('A TCP connection times out rather than being refused.', 'A timeout often indicates a firewall or routing drop; a refusal means the host is reachable but nothing is listening.'),
    ],
  },
];
