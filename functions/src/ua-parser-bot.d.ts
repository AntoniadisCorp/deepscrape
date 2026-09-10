/**
 * `ua-parser-js` v2 ships bot detection in a `bot-detection` subpath that is
 * only declared through its package.json `exports` map. TypeScript's legacy
 * `node` moduleResolution (see tsconfig.json) ignores `exports`, so the subpath
 * types are declared here instead of enabling `moduleResolution: node16`
 * project-wide.
 *
 * Runtime resolution is handled by Node itself (CommonJS require honours
 * `exports`), so this file adds types only — no new dependency.
 */
declare module "ua-parser-js/bot-detection" {
  export function isBot(ua: string): boolean
  export function isAIAssistant(ua: string): boolean
  export function isAICrawler(ua: string): boolean
}
