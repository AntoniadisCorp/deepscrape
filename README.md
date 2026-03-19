# deepscrape

Deepscrape is an Angular 20 web application for AI-assisted web extraction, crawl orchestration, and user-managed scraping workflows. It combines a zoneless Angular frontend, SSR, Firebase-backed auth/data flows, Stripe billing, and provider integrations for Crawl4AI, JinaAI, OpenAI, Anthropic, Groq, and Arachnefly-style machine operations.

This repository is currently optimized for local development and Firebase-style deployment. The platform is also moving toward broader self-hosting support, including richer docs, Docker-based deployment, and MCP-friendly integrations.

## Key Features

- AI-assisted crawling and extraction workflows
- Multiple provider integrations for content extraction and chat-completion style processing
- Angular 20 standalone frontend with SSR and PWA support
- Firebase Auth, Firestore, Hosting, and Functions integration
- Stripe billing flows for plans, passes, and usage-based controls
- Upstash-powered rate limiting for public and API traffic
- User dashboard for crawl configs, results, operations, billing, and API keys
- Admin workspace for analytics and migration tooling
- Environment generation via `dotenvx` and `src/environments/prod_gen.ts`

## Tech Stack

### Frontend

- Angular 20
- Standalone components
- Zoneless change detection
- Angular Material 20
- Tailwind CSS v3
- `tailwindcss-motion`
- `@ngx-translate/core`
- `ngx-markdown`
- `ng2-charts` + `chart.js`
- Lucide Angular

### Server / API

- Angular SSR
- Express SSR entrypoint by default
- Optional Elysia SSR build target
- Custom Express API router under `api/`

### Platform Services

- Firebase Auth
- Firestore
- Firebase Functions
- Firebase Hosting / emulators
- Stripe
- Upstash Redis / Ratelimit

### AI / Crawling Integrations

- Crawl4AI
- JinaAI
- OpenAI
- Anthropic
- Groq
- Arachnefly-style machine checks / deployment helpers

### Tooling

- Bun for local package management/runtime preference
- TypeScript
- Karma + Jasmine
- semantic-release
- Commitizen + commitlint
- dotenvx

## What the App Contains

At a product level, this repo is not just a landing page with a couple of endpoints. It already includes several meaningful application areas:

- **Public app shell**: landing/home entrypoint
- **Auth flows**: login, signup, verification, reset password, action handlers
- **User dashboard**: dashboard, playground, billing, settings, operations
- **Crawl Pack**: crawl configuration, browser profiles, extraction strategy, machine helpers, crawl results
- **Admin tools**: analytics, migrations, backups, run history
- **Streaming AI endpoints**: provider-backed chat/extraction calls through the app API layer

## Architecture Overview

### High-level flow

```text
Browser
  -> Angular 20 app
  -> SSR via Express or Elysia
  -> App API router (/api)
  -> AI providers / crawl agents / machine helpers
  -> Firebase Auth + Firestore + Functions
  -> Stripe + Upstash
```

### Main runtime layers

1. **Angular application** renders the public site, auth flows, and authenticated dashboard UI.
2. **SSR server** handles server-side rendering and static asset delivery.
3. **Custom API layer** proxies / normalizes requests for AI providers and crawl services.
4. **Firebase Functions** provide backend services, emulator support, and deployment logic.
5. **External providers** perform extraction, model inference, billing, and rate-limiting support.

## Repository Structure

```text
.
├── api/                         # Express-side API router and handlers
├── docs/                        # Internal project docs and implementation notes
├── functions/                   # Firebase Functions backend
├── public/                      # Static PWA/public assets
├── src/
│   ├── app/
│   │   ├── core/                # Guards, services, shared app logic
│   │   ├── layout/              # Layout shells
│   │   ├── pages/               # Public, user, and admin pages
│   │   ├── routes/              # Route composition
│   │   └── shared/              # Shared UI/code
│   ├── assets/                  # Images, i18n, fonts, static assets
│   ├── config/                  # Runtime config helpers
│   └── environments/            # Generated and source environment definitions
├── angular.json                 # Angular workspace config
├── server.ts                    # Express SSR entry
├── server-elysia.ts             # Elysia SSR entry
├── firebase.json                # Firebase config
├── tailwind.config.js           # Tailwind config
└── package.json                 # Root scripts and dependencies
```

## Core Routes and Product Areas

### Public / Main

- `/` — home / public entry

### Service/Auth

- `/service/login`
- `/service/signup`
- `/service/resetpassword`
- `/service/verification`
- `/service/action`

### Authenticated User Area

- `/dashboard`
- `/playground`
- `/crawlpack`
- `/operations`
- `/billing`
- `/settings`
- `/admin`

## API Surface Summary

The custom Express router currently exposes provider-focused endpoints such as:

- `GET /api/jina`
- `GET /api/jina/:url`
- `POST /api/anthropic/messages`
- `POST /api/openai/chat/completions`
- `POST /api/groq/chat/completions`
- `POST /api/crawl`
- `GET /api/machines/check-image`

The API layer is rate-limited and designed to work with bearer-style auth headers for protected flows.

## Development Prerequisites

Install the following before starting:

- Bun
- Node.js 22+ for the Firebase Functions workspace
- npm (needed for some scripts inside `functions/`)
- Angular CLI compatible with Angular 20
- Firebase CLI
- A Firebase project for auth/data/hosting integration
- Stripe test credentials if you want billing flows locally
- Access to any optional AI provider keys you plan to test

Optional but useful:

- A local Crawl4AI-compatible service running on port `8000`
- A machine helper service on port `8080`

## Environment Setup

There are two environment templates in this repository:

- Root app template: `.env.example`
- Firebase Functions template: `functions/.env.example`

### 1. Root environment

Create a root `.env` file from the template.

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Important root variables include:

| Variable | Purpose |
|---|---|
| `PRODUCTION` | Controls environment mode flags |
| `EMULATORS` | Enables local emulator-aware behavior |
| `API_CRAWL4AI_URL` | External/local Crawl4AI API URL |
| `API_ARACHNEFLY_URL` | Machine / infra helper URL |
| `API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, etc. | Firebase web config |
| `RECAPTCHA_KEY` | App Check / reCAPTCHA support |
| `STRIPE_PUBLIC_KEY` | Stripe frontend key |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `JINAAI_API_KEY`, `GROQ_API_KEY`, `GOOGLE_API_KEY`, `CRAWL4AI_API_KEY` | Provider credentials |
| `UPSTASH_*` | Upstash Redis/rate limit configuration |

### 2. Functions environment

Create the functions env file:

```bash
cp functions/.env.example functions/.env.local
```

PowerShell:

```powershell
Copy-Item functions/.env.example functions/.env.local
```

Important functions variables include:

- admin email allowlist
- Stripe secret and price IDs
- Upstash credentials
- cookie / CSRF secrets
- crawl provider keys
- IP2Location dataset configuration

### 3. Generate the Angular environment file

The repository generates `src/environments/environment.ts`. Do not hand-edit that file.

Run:

```bash
bun run prebuild
```

This uses `src/environments/prod_gen.ts` to materialize runtime config from dotenv files.

## Installation

The repository prefers Bun locally.

### Install root dependencies

```bash
bun install
```

### Install Firebase Functions dependencies

```bash
cd functions
npm install
cd ..
```

## Local Development

### Frontend development server

Run the Angular app in development mode:

```bash
bun run dev
```

This generates environment config and starts the Angular dev server.

### Elysia-flavored dev target

```bash
bun run dev:elysia
```

### Angular production build

```bash
bun run build
```

Additional build targets:

```bash
bun run build:dev
bun run build:staging
bun run build:elysia
```

### Run the SSR server after build

Using Bun:

```bash
bun run bun:ssr:deepscrape
```

Using Node:

```bash
npm run node:ssr:deepscrape
```

### Run Firebase emulators with the built app

```bash
bun run serve
```

That flow builds the app, enters `functions/`, and starts emulators for:

- functions
- hosting
- pubsub
- firestore
- auth
- storage
- eventarc
- tasks

### Test suite

Run Angular unit tests:

```bash
npm run test
```

or

```bash
bun run test
```

### Functions linting

```bash
cd functions
npm run lint
```

## Local Proxy Expectations

During development, the Angular proxy is configured for several integrations:

- `/api/anthropic` -> `https://api.anthropic.com/v1`
- `/api/openai` -> `https://api.openai.com/v1`
- `/api/groq` -> `https://api.groq.com/openai/v1`
- `/api/jina` -> `https://r.jina.ai`
- `/api` -> `http://localhost:8000/api/v1`
- `/ws` -> `ws://localhost:8000/api/v1/ws`
- `/machines` -> `http://127.0.0.1:8080/api`

If local crawling or machine operations appear broken, the usual problem is not magic. It is that the expected local services are not running.

## Deployment

### Firebase deployment

Deploy the production app and functions:

```bash
bun run deploy
```

Equivalent npm command:

```bash
npm run deploy
```

### Deploy Firestore indexes only

```bash
npm run deploy:indexes
```

### Release automation

The repo uses `semantic-release` and conventional commits.

Prepare a dry run:

```bash
npm run release:prepare
```

Run release:

```bash
npm run release
```

## Firebase Functions Workspace

The `functions/` directory contains the server-side backend exported for Firebase.

Important scripts:

```bash
cd functions
npm run build
npm run serve
npm run shell
npm run deploy
```

The backend is organized into:

- `app/` - application setup
- `config/` - env + runtime config
- `domain/` - business logic
- `gfunctions/` - Firebase Function entrypoints
- `handlers/` - route logic
- `infrastructure/` - provider integrations

## Application Conventions

This repository follows a few non-negotiable Angular patterns:

- standalone components only
- `ChangeDetectionStrategy.OnPush`
- zoneless change detection
- lazy-loaded route structure
- `inject()` preferred over constructor injection

On the app side, authenticated provider access follows the `AuthService.token` bearer-token pattern.

## Project Scripts Reference

### Root scripts

| Script | Purpose |
|---|---|
| `bun run dev` | Generate env and start Angular dev server |
| `bun run dev:elysia` | Start Elysia-target dev server |
| `bun run prebuild` | Generate `src/environments/environment.ts` |
| `bun run build` | Production Angular build |
| `bun run build:dev` | Development build |
| `bun run build:staging` | Staging build |
| `bun run build:elysia` | Elysia SSR build |
| `bun run bun:ssr:deepscrape` | Run built SSR app with Bun |
| `npm run node:ssr:deepscrape` | Run built SSR app with Node |
| `bun run serve` | Build app and run Firebase emulators |
| `bun run deploy` | Build app and deploy Firebase stack |
| `bun run test` | Angular unit tests |

### Functions scripts

| Script | Purpose |
|---|---|
| `npm run build` | Compile functions workspace |
| `npm run serve` | Start Firebase emulators for backend stack |
| `npm run shell` | Open Firebase functions shell |
| `npm run deploy` | Deploy backend via custom deploy script |
| `npm run lint` | Lint functions code |

## Security and Secrets

- Do not commit real `.env` files
- Do not hand-edit generated environment files
- Keep Stripe secret keys only in backend env files
- Treat Upstash credentials as secrets
- Use strong values for cookie / CSRF secrets in `functions/.env.local`
- Use Firebase/Auth-backed bearer tokens for protected API access

## Troubleshooting

### `environment.ts` keeps getting overwritten

That is expected. It is generated by `src/environments/prod_gen.ts`.

### The frontend runs but crawl requests fail

Check these first:

1. Is the local crawl API running on port `8000`?
2. Is the machine helper service running on port `8080` if you need it?
3. Did you generate env files before starting the app?
4. Are provider API keys present where required?

### Firebase-related features fail locally

Verify:

- Firebase CLI is installed
- emulator services started successfully
- root and `functions/` env files are populated
- `EMULATORS=true` is set where appropriate

### Billing UI looks broken or limited

That is usually Stripe config, missing price IDs, or backend env drift.

### SSR starts but routes behave oddly

Check whether you built with the intended target:

- `server.ts` for default SSR
- `server-elysia.ts` for Elysia target

## Documentation in This Repository

There is already a sizeable internal docs folder for implementation notes and project history:

- admin analytics optimization notes
- migration guides
- implementation roadmap documents
- delivery summaries
- quick reference cards

These docs are useful for contributors, but they are not yet organized as a formal public documentation site.

## Roadmap / Planned Improvements

This repository is clearly headed toward a broader platform shape. Planned or likely future directions include:

- better external documentation, potentially with Mintlify
- Docker/containerized deployment flows
- more formal self-hosting guidance
- MCP server integrations
- expanded crawling provider support
- hardened deployment stories beyond Firebase

If you want to add those next, the README is already structured so those sections can be expanded instead of rewritten again.

## Contributing

If you contribute here:

- keep commits conventional
- prefer focused changes
- avoid editing generated files manually
- preserve the Angular 20 standalone + zoneless architecture
- use Bun for root workspace workflows unless a nested package explicitly requires npm

## License

See [LICENSE](LICENSE).
