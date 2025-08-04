# deepscrape

**deepscrape** is a modern web solution for deep scraping using AI extraction JinaAI, Crawl4AI, spider, more integrations coming soon.

## Features

- **AI Integration**: Utilizes JinaAI Reader and Crawler4AI for advanced data extraction.
- **Web Scraping**: Provides robust web scraping capabilities with customizable options.
- **API Key Management**: Manage API keys securely with integration to Firebase and Secret Manager.
- **Firebase Integration**: Supports deployment and hosting through Firebase functions.
- **User Dashboard**: A dashboard for managing user operations and settings.

- **Responsive Design**: Built with Angular and TailwindCSS for a modern and responsive UI.

- **Development Support**: Offers commands for both Angular development and server-side rendering (SSR).

## Installation

```bash
npm install
# or
bun install
```

## Development Angular

```bash
ng serve
```

## Production SSR Angular

```bash
npm run build
npm run node:ssr:deepscrape
# or
bun run build
bun run bun:ssr:deepscrape
```

## PreDeploy Firebase function and hosting

```bash
bun run serve
```

## Deploy Firebase function and hosting

```bash
npm run deploy
# or
bun run deploy
```
