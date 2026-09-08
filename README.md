<div align="center">

# deepscrape

### The web scraping API for AI agents.

When the web rains raw pages, we catch them — and hand your agents clean, structured, AI-ready data.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)](https://angular.dev)

</div>

**deepscrape** is what runs on [deepscrape.dev](https://deepscrape.dev) — a complete
web-extraction platform, not just a scraper. You point it at a site, it renders the
page like a real browser, gets around proxies and bot protection, pulls out the data
you need, and hands it to whichever AI you prefer.

**This repository** is the full source: the Angular app, the server that renders it,
the API layer that talks to AI + crawl providers, and the Firebase backend.

---

## 📸 Product preview

<p align="center">
  <img src="screenshots/landing-hero.png" alt="deepscrape landing" width="720">
  <br>
  <sub>Web data at lightning speed — the scraping API for AI agents.</sub>
</p>

<p align="center">
  <img src="screenshots/landing-features.png" alt="deepscrape research agent" width="720">
  <br>
  <sub>A live research agent that browses the web and answers with structured data.</sub>
</p>

---

## What it does for you

- **Scrapes the hard stuff** — real browser rendering, proxy rotation and anti-bot
  handling, so pages that block plain HTTP clients still come through.
- **Extracts clean data** — structured extraction turns messy HTML into the fields,
  rows and JSON you actually want.
- **Works with any AI — a multi-provider platform.** Route scraping results to
  **Anthropic (Claude), OpenAI (GPT), Groq, Google, Jina, Fireworks, OpenRouter,
  Crawl4AI and more** — or any OpenAI-compatible endpoint. You are not locked to one.
- **Answers, not just pages** — ask in plain language and a live research agent
  searches, navigates, logs in and reads for you (webbrain: an MCP-native web engine
  with **17 tools**), returning structured answers to your dashboard.
- **Your infrastructure, your way** — deploy your own crawls with CrawlPack
  machines, keep an eye on everything from the dashboard, and manage billing,
  plans and API keys in one place.

---

## ✨ Highlights

- 🕸️ Crawl orchestration — configs, browser profiles, extraction strategies, operations, schedulers
- 🛡️ Anti-bot & proxies
- 🤖 Multi AI-provider extraction & powerfull chat scraping
- 🔎 Live research agent (webbrain, MCP-native, 17 tools)
- ⚙️ CrawlPack machine deployment helpers
- 👤 Full accounts — login, signup, verification, password reset
- 💳 Stripe billing — plans, credit passes, usage-based controls
- 📊 Admin workspace — analytics, migrations, backups, run history
- 🇬🇧 English i8n

---

## ⚡ Run it locally

You need: **Bun** (or Node 20+), **Firebase CLI**, and npm (for `functions/`).

```bash
# 1. Install dependencies
bun install
cd functions && npm install && cd ..

# 2. Configure environment (dotenvx)
cp .env.example .env            # add your keys to .env
#   functions: cp functions/.env.example functions/.env.local

# 3. Generate the Angular environment, then start dev server
bun run prbuild
bun run dev
```

Open [http://localhost:4200](http://localhost:4200).

Want the full stack (auth, Firestore, hosting) locally?

```bash
bun run serve    # builds + runs Firebase emulators
```

Build & deploy to Firebase:

```bash
bun run build    # production build
bun run deploy   # build + deploy hosting & functions
```

---

## 🧱 At a glance

| Layer | What powers it |
| --- | --- |
| Frontend | Angular 20 (zoneless, SSR, PWA) · Angular Material · Tailwind CSS |
| Server | Angular SSR — Express (default) or Elysia |
| Data & auth | Firebase Auth · Firestore · Firebase Functions |
| Billing | Stripe |
| Rate limiting | Upstash Redis + Ratelimit |
| AI / crawl providers | Anthropic · OpenAI · Groq · Google · Jina · Fireworks · OpenRouter · Crawl4AI … |

---

## 🧰 Scripts you'll actually use

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server |
| `bun run build` | Production build |
| `bun run serve` | Build + Firebase emulators |
| `bun run deploy` | Build + deploy to Firebase |
| `bun run test` / `test:ci` | Unit tests (headless in CI) |

---

## 🔒 A note on secrets

Real keys live in dotenv files (`.env`, `.env.local`) that are **not** committed.
`src/environments/environment.ts` is generated — never hand-edit it.

---

## 📄 License

[MIT](LICENSE) © AntoniadisCorp
