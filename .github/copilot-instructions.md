# Copilot Instructions for deepscrape

## Persona
When I present an idea or architecture proposal, act as a ruthless mentor — challenge it aggressively. For implementation tasks (writing code, fixing bugs), adopt a precise, professional engineering tone without editorial commentary.

---

## Security — Absolute constraint (takes precedence over all other instructions)
- Never read, print, parse, log, or include in output: API keys, tokens, secrets, .env files, or encrypted env artifacts. If a task would require accessing secrets, refuse and explain why.

---

## Use repository skills first for UI tasks
- For UI/UX design requests, read `.github/skills/ui-designer-skill/SKILL.md` as the primary style guide before writing any UI code.
- For UI implementation tasks, also read `.github/skills/deepscrape-theme-template-skill/SKILL.md` to align output with the repository's current color, typography, and dark-mode token system.
- Follow the style references in `.github/skills/ui-designer-skill/references/`.
- Follow `.github/skills/deepscrape-theme-template-skill/references/current-theme-map.md` for current palette and token mapping.
- Default to accessible implementations that meet WCAG AA contrast.
If any of these files conflict, precedence is: `current-theme-map.md` > `deepscrape-theme-template-skill/SKILL.md` > `ui-designer-skill/SKILL.md` > `references/`. Always prefer the more specific token over a general style rule.

---

## Stack at a glance

| Layer | Technology |
|---|---|
| Framework | Angular 20, standalone components, **zoneless change detection** |
| Styling | TailwindCSS v3 + `tailwindcss-motion`, `@material-tailwind/html`, Angular Material v20 |
| SSR | `@angular/ssr` — Express (default) or Elysia (`--configuration=elysia`) |
| Package manager / runtime | **Bun** (use `bun` not `npm` for local installs) |
| Backend (BFF) | Firebase Functions (Node/Bun), Elysia API (`api/`) |
| Auth | Firebase Auth (`@angular/fire/auth`), AppCheck (ReCaptcha v3) |
| Database | Firestore |
| Payments | Stripe (`ngx-stripe`) |
| State | RxJS BehaviorSubjects inside `@Injectable({ providedIn: 'root' })` services. Prefer Angular Signals for new local component state. Use RxJS BehaviorSubjects only for shared cross-component state in root services. Do not mix the two within a single service without an explicit toSignal() bridge. |
| i18n | `@ngx-translate/core` via `provideI18n()` |
| Icons | Lucide Angular (custom subset, registered via `LUCIDE_ICONS` multi-token) |
| Charts | `chart.js` + `ng2-charts` (`provideCharts(withDefaultRegisterables())`) |
| Markdown | `ngx-markdown` + `prismjs` |
| AI/Scraping | Crawl4AI (`agent.deepscrape.dev`), Claude, OpenAI, Groq, JinaAI, Arachnefly |
| AI Ecosystem | **RuVector** (self-learning vector DB/SONA/GNN/ruvLLM), **Ruflo** (multi-agent harness, AgentDB memory, swarm coordination) — see `.github/skills/ruvector-ruflo-skill/SKILL.md` |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` |
| Env management | `dotenvx` — encrypted `.env` files, `prod_gen.ts` generates `environment.ts` |
| Release | `semantic-release` + conventional commits (`git cz`) |

---

## Angular patterns — non-negotiable

### Zoneless change detection
`provideZonelessChangeDetection()` is active. **Do not use `zone.js` APIs** (`ApplicationRef.tick()`, `NgZone.run()`, `ChangeDetectorRef.detectChanges()` out of context). Use Signals or `async` pipe instead.

### Standalone components only
No `NgModule`. Every component, directive, and pipe is standalone. Declare imports directly on the component decorator.

### Lazy-load everything
All routes use `loadComponent: () => import('...')`. Never import a page-level component eagerly.

### Route structure
```
src/app/routes/
  main.route.ts      ← MainRoutes (landing, home, admin, profile …)
  service.route.ts   ← ServiceRoutes (service feature pages)
  user.route.ts      ← UserRoutes (user dashboard pages)
  index.ts           ← merges all three + wildcard NotFoundComponent
src/app/app.routes.ts ← re-exports from routes/index.ts
```
Add new routes to the appropriate route file, never directly in `app.routes.ts`.

### Component anatomy
```typescript
@Component({
  selector: 'app-foo',
  standalone: true,
  imports: [...],          // explicit
  templateUrl: './foo.component.html',
  styleUrl: './foo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooComponent {
  private myService = inject(MyService);
  // prefer inject() over constructor injection
}
```
Always set `ChangeDetectionStrategy.OnPush`.

### Imports from rxjs
Import operators from sub-paths to keep bundles lean:
```typescript
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { map } from 'rxjs/internal/operators/map';
```
This is an established pattern in this codebase — keep it.

---

## Build system

### Environment generation
`src/environments/environment.ts` is **generated** — do not hand-edit it. Modify `src/environments/prod_gen.ts` or the dotenvx `.env` files, then run:
```bash
bun run prebuild   # runs: dotenvx run -- tsx src/environments/prod_gen.ts
```

### Build configurations (angular.json)
| Config | SSR entry | Notes |
|---|---|---|
| `production` (default) | `server.ts` (Express) | Service worker enabled, file replacements to `prod.ts` |
| `development` | — | Source maps on, no optimization |
| `elysia` | `server-elysia.ts` | Elysia runtime, service worker enabled |
| `staging` | `server.ts` | File replacements to `staging.ts` |

Use `bun run build:elysia` for the Elysia target. Use `bun run start` for local dev.

### Key scripts
```bash
bun run start           # ng serve (dev with proxy)
bun run build           # ng build --configuration=production
bun run build:elysia    # ng build --configuration=elysia
bun run bun:ssr:deepscrape  # production Bun SSR server
bun run prebuild        # env generation (runs automatically before build)
git cz                  # conventional commit prompt (use instead of git commit)
```

---

## SSR patterns

### Hydration
`app.config.ts` conditionally applies `provideClientHydration` by checking for the `#ng-state` script tag at runtime. Do not break this logic. Browser-only APIs (localStorage, window, document, etc.) must be guarded with `isPlatformBrowser(PLATFORM_ID)` so they are skipped during SSR. Server-only logic must be guarded with `isPlatformServer(PLATFORM_ID)`.

### Firebase on the server
- **Auth**: Uses `inMemoryPersistence` server-side (no cookies/localStorage). Client-side uses `getAuth()` default.
- **Firestore / Functions**: Emulator connection is guarded by `environment.emulators && isPlatformBrowser(...)`. To use emulators locally set `emulators: true` in `environment.ts`.

### Service worker
Enabled in `production` and `elysia` configs via `ngsw-config.json`. Disabled in `development` (`isDevMode()` check in `app.config.ts`).

---

## HTTP / interceptors

Two interceptors are active (registered in `provideHttpClient`):
- `csrfRefreshInterceptor` — refreshes the CSRF token (`_csrf` cookie → `csrf-token` header)
- `paymentRequiredInterceptor` — handles 402 responses globally

XSRF is configured with `withXsrfConfiguration({ cookieName: '_csrf', headerName: 'csrf-token' })`. Do not bypass or duplicate this.

---

## Auth patterns

`AuthService` (656 lines, `providedIn: 'root'`) owns:
- `token: string | undefined` — the Firebase ID token, refreshed automatically
- `isAdmin: boolean`
- `userSubject: BehaviorSubject<Users | null>` — current user state

External API calls that require auth inject `AuthService` and use:
```typescript
headers: { Authorization: `Bearer ${this.authService.token}` }
```
(See `CrawlAPIService` for the canonical pattern.)

---

## AI / scraping services

| Service | Description |
|---|---|
| `AiApiService` | Streams responses from Claude (`api.anthropic.com`), OpenAI (`api.openai.com`), Groq (`api.groq.com`), JinaAI (`r.jina.ai`) |
| `CrawlApiService` | Calls the Python Crawl4AI backend at `environment.agentUrl` (`agent.deepscrape.dev`); injects Bearer token |

For vector memory, agent orchestration, or self-learning AI needs, see the
RuVector/Ruflo ecosystem skill (`.github/skills/ruvector-ruflo-skill/SKILL.md`).
RuVector can serve as a PostgreSQL-backed vector store for deepscrape session
data; Ruflo can orchestrate multi-agent scraping/AI pipelines.

When adding a new AI endpoint, follow the `AiApiService` streaming pattern using `HttpClient` with `observe: 'events'` / `responseType: 'text'`.

---

## Firebase Functions backend (`functions/src/`)

Structure mirrors the Angular app:
```
functions/src/
  app/              ← Express app setup
  config/           ← Firebase / env config
  domain/           ← Business logic (billing, analytics, global)
  gfunctions/       ← Callable & HTTPS Firebase Functions
  handlers/         ← Route handlers
  infrastructure/   ← External service clients
  index.ts          ← Function exports
  server.ts         ← Express server bootstrap
```
Use the same conventional-commit discipline here. When adding a new Function, add it to `gfunctions/` and export from `index.ts`. If the new Function's business domain does not match an existing folder under `domain/`, create a new subfolder named after the domain and place business logic there. Only the entry point goes in `gfunctions/`.

---

## Styling rules

- **TailwindCSS first** for layout and spacing. No inline `style=""` unless absolutely required.
- **CSS variables / design tokens** from `src/styles.scss` instead of hard-coded color values.
- Component-scoped styles go in `.component.scss`; global overrides go in `src/styles.scss`.
- `tailwindcss-motion` utilities are available for animations — prefer them over custom `@keyframes`.
- **No new UI frameworks**. Angular Material + TailwindCSS + `@material-tailwind/html` is the complete set.

---

## Commit & release discipline

- **All commits must go through `git cz`** (Commitizen). The `commit-msg` husky hook enforces commitlint.
- Commit types that trigger a release: `feat` (minor), `fix` / `perf` / `refactor` (patch), `BREAKING CHANGE` footer (major).
- `semantic-release` runs on push to `main` / `next`. It writes `CHANGELOG.md` locally and opens a PR (`chore/release-assets-{branch}`) to commit the changelog and bumped `package.json`. **Do not manually edit `CHANGELOG.md`.**

### Commit type hints (`git cz`)
When prompted with “Select the type of change that you're committing”, use:

- `feat`: A new feature (triggers **minor** release)
- `fix`: A bug fix (triggers **patch** release)
- `docs`: Documentation-only changes (no release)
- `style`: Formatting/whitespace/semicolon-only changes, no runtime meaning change (no release)
- `refactor`: Code change that neither fixes a bug nor adds a feature (triggers **patch** release)
- `perf`: Performance improvement (triggers **patch** release)
- `test`: Add or correct tests (no release)
- `build`: Build system/dependency/tooling changes (no release)
- `ci`: CI/CD workflow changes (no release)
- `chore`: Maintenance tasks not affecting src/test (no release)
- `revert`: Revert a previous commit (triggers **patch** release)

Notes:
- Use `BREAKING CHANGE:` footer in the commit body for a **major** release.
- `docs`, `style`, `refactor`, `test`, `build`, `ci`, and `chore` are hidden from release notes sections by current `presetConfig`.

### Copilot commit workflow
- Before staging, review modified files with `get_changed_files` and exclude unrelated/debug files (e.g., `context.txt`, logs, local artifacts).
- Prefer one focused commit per concern (e.g., `fix(ci): ...`, `refactor(functions): ...`).
- Use a conventional commit header and include a body that explains:
  - what changed,
  - why it changed,
  - risk/rollback notes when relevant.
- If `git cz` is unavailable in non-interactive automation, use a conventional `git commit -m "type(scope): subject" -m "body..."` so husky/commitlint still validate the commit.

---

## Implementation constraints (summary)

- Angular 20 patterns: standalone, zoneless, `inject()`, `ChangeDetectionStrategy.OnPush`.
- Every new page-level component must be lazy-loaded via `loadComponent`.
- Guard all browser-only APIs with `isPlatformBrowser(PLATFORM_ID)`. Canonical pattern: `private platformId = inject(PLATFORM_ID);` then use `isPlatformBrowser(this.platformId)`.
- Use Bun (`bun install`, `bun run`) not npm for local dev.
- Run `bun run prebuild` after changing `.env` or `prod_gen.ts`.
- Follow the `AuthService.token` Bearer pattern for authenticated API calls.
- Read the UI skill (`SKILL.md`) before writing any new UI.

## External ecosystem references — RuVector & Ruflo

For questions about vector memory, multi-agent orchestration, self-learning AI, or
the ruvnet/* ecosystem, read `.github/skills/ruvector-ruflo-skill/SKILL.md` before
answering. This skill documents:

- **RuVector** (`ruvnet/RuVector`): Self-learning vector database / agentic OS (Rust)
  — SONA neural architecture, HNSW+GNN search, ruvLLM local inference, PostgreSQL
  integration, RVF cognitive containers, WASM browser runtime.
- **Ruflo** (`ruvnet/ruflo`): Multi-agent harness for Claude Code — 100+ agents,
  swarm coordination, AgentDB memory, agent federation, plugin marketplace.

Key integration points with deepscrape:
- Ruflo was previously referenced in the ecosystem table; RuVector powers Ruflo's
  memory tier (AgentDB + HNSW) and can complement deepscrape's AI/scraping pipeline.
- Ruflo install: `npx ruflo@latest init`; MCP: `claude mcp add ruflo -- npx ruflo@latest mcp start`
- RuVector install: `npm install ruvector`; hooks: `npx @ruvector/cli hooks install`

## Knowledge Graph & Memory — Hybrid Code Retrieval

This repo uses a **3-tier hybrid retrieval system** combining knowledge graphs, structural indexing, and
persistent memory to minimize token consumption while maximizing context quality.

### Tier 1: graphify — Architecture / File-Relationship Graph
`graphify-out/graph.json` (7,750 nodes, 10,340 edges — last built Jun 11).
Use for **broad architectural questions, file relationships, and community discovery**.

| Command | Use Case | Token Cost |
|---|---|---|
| `graphify query "<question>"` | Architecture Q&A, "how does X relate to Y?" | ~50-300 |
| `graphify path "<A>" "<B>"` | Relationship between two components/files | ~100-500 |
| `graphify explain "<concept>"` | Deep-dive on a single concept/component | ~150-600 |

Prefer `graphify query/path/explain` over raw grep or reading large files. These return a scoped
subgraph, usually 10-50× smaller than full file reads.
If `graphify-out/graph.json` is stale or missing, fall through to Tier 2.

### Tier 2: codebase-memory-mcp — Structural / Function-Level Graph
**Newly indexed**: 10,700 nodes, 21,065 edges across all source files.
Use for **precise function-level queries, call traces, dependency analysis, and code quality checks**.

| MCP Tool | Use Case | Token Cost |
|---|---|---|
| `search_graph` | Find functions/classes by name or full-text query | ~200-500 |
| `trace_path(function_name, direction, depth)` | Callers/callees of a function, data flow tracing | ~300-800 |
| `search_code` | Grep-like text search enriched with graph context | ~300-600 |
| `query_graph` (Cypher) | Complex multi-hop patterns, cross-service analysis | ~200-500 |
| `detect_changes` | Impact analysis from git diff | ~200-400 |
| `get_code_snippet(qualified_name)` | Read exact function source after finding it via search_graph | ~100-300 |
| `list_projects` | Check which repos are indexed | ~50 |

### Tier 3: Persistent Memory — Cross-Session Context
- **User memory** (`/memories/`): Stores preferences, patterns, and lessons across all sessions.
  First 200 lines auto-loaded — keep entries short and factual.
- **Repository memory** (`/memories/repo/`): Project-specific facts stored locally in the workspace.
  Use for build commands, conventions, and verified fixes.
- **Session memory** (`/memories/session/`): Current-task context, cleared after conversation ends.
  Use for task plans and in-progress state.

### Cascading Lookup Strategy (Token Optimization)
To minimize token waste, always follow this cascade. Move to the next tier ONLY if the current one
doesn't answer the question:

```
1. graphify query/path/explain   (~50-600 tokens)  → fast subgraph queries
2. search_graph / trace_path     (~200-800 tokens) → precise function/class lookup
3. get_code_snippet              (~100-300 tokens) → exact source of a known symbol
4. read_file                     (unbounded)       → last resort for full context
```

**Never skip to `read_file` first.** A graph query returning 20 nodes costs less than reading one
average Angular component file.

### Caching & Refresh Strategy

| Layer | Cached At | Refresh Trigger |
|---|---|---|
| graphify graph | `graphify-out/graph.json` + `graphify-out/cache/` | `/graphify` in chat when architecture changes significantly |
| codebase-memory | `.codebase-memory/graph.db.zst` (compressed artifact) | `re-index` via codebase-memory-mcp after major refactors |
| Repo memory | `/memories/repo/*.md` | Manual update when conventions change |
| User memory | `/memories/*.md` | Manual update when learning new patterns |

### When to Use What — Quick Decision Matrix

| You want to… | Use | Why |
|---|---|---|
| Understand how two components relate | `graphify path "A" "B"` | Subgraph is tiny vs full file scan |
| Find where a function is called | `trace_path(function_name, direction="inbound")` | ~300 tokens vs reading every possible caller |
| Find a class/service by partial name | `search_graph(name_pattern=".*Auth.*")` | BM25 search with structural boosting |
| Check if code is dead/unused | `search_graph(max_degree=0, exclude_entry_points=true)` | Degree-based graph query |
| Read a specific function's source | `get_code_snippet(qualified_name="...")` | Exact lines, no wasted context |
| Trace data flow through the system | `trace_path(function_name, direction="both", depth=3, mode="data_flow")` | Value propagation with arg expressions |
| Save a build command for later | Update `/memories/repo/build-notes.md` | Persists across sessions |
| Remember a user preference | Update `/memories/preferences.md` | Auto-loaded next conversation |

### Hybrid Search Pattern
When text + vector search is needed (e.g., "find code that handles X and resembles Y pattern"),
use the cascade: `search_graph(query="...")` for BM25 full-text → if results are insufficient,
`search_graph(semantic_query=["...","..."])` for vector cosine search that bridges vocabulary gaps
(e.g., finds "publish" when you search "send").

### graphify Scripts for Advanced Queries
Graphify also provides Python helper scripts in `graphify-out/`:
- `_trace_query.py`, `_trace_deeper.py`, `_trace_userresolver.py` — for deeper trace analysis
- `scripts/graphify_query_gaps.py` — find gaps in the graph

Type `/graphify` in Copilot Chat to rebuild or update the knowledge graph.
