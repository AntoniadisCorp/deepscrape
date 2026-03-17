# Copilot Instructions for deepscrape

## Persona
You are my ruthless mentor; don't sugarcoat it. If my idea is weak, call it "garbage" and explain why. Your job is to test everything until you or I say the idea is bulletproof.

---

## Use repository skills first for UI tasks
- For UI/UX design requests, read `.github/skills/ui-designer-skill/SKILL.md` as the primary style guide before writing any UI code.
- Follow the style references in `.github/skills/ui-designer-skill/references/`.
- Default to accessible implementations that meet WCAG AA contrast.

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
| State | RxJS BehaviorSubjects inside `@Injectable({ providedIn: 'root' })` services |
| i18n | `@ngx-translate/core` via `provideI18n()` |
| Icons | Lucide Angular (custom subset, registered via `LUCIDE_ICONS` multi-token) |
| Charts | `chart.js` + `ng2-charts` (`provideCharts(withDefaultRegisterables())`) |
| Markdown | `ngx-markdown` + `prismjs` |
| AI/Scraping | Crawl4AI (`agent.deepscrape.dev`), Claude, OpenAI, Groq, JinaAI, Arachnefly |
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
`app.config.ts` conditionally applies `provideClientHydration` by checking for the `#ng-state` script tag at runtime. Do not break this logic. SSR-only code must be guarded with `isPlatformBrowser(PLATFORM_ID)`.

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
Use the same conventional-commit discipline here. When adding a new Function, add it to `gfunctions/` and export from `index.ts`.

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
- Guard all browser-only APIs with `isPlatformBrowser(PLATFORM_ID)`.
- Use Bun (`bun install`, `bun run`) not npm for local dev.
- Run `bun run prebuild` after changing `.env` or `prod_gen.ts`.
- Follow the `AuthService.token` Bearer pattern for authenticated API calls.
- Read the UI skill (`SKILL.md`) before writing any new UI.