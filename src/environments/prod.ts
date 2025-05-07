// generate-env.ts
const fs = require('fs');
const dotenv = require('dotenv');

const env = dotenv.config().parsed; // Get parsed .env values directly
const environment = {
    production: false,
    assetsUri: "https://deepscrape.web.app/assets/",
    firebaseConfig: {
        apiKey: env["API_KEY"],
        authDomain: env["AUTH_DOMAIN"],
        databaseURL: env["DATABASE_URL"],
        projectId: env["PROJECT_ID"],
        storageBucket: env["STORAGE_BUCKET"],
        messagingSenderId: env["MESSAGING_SENDER_ID"],
        appId: env["APP_ID"],
    },
    RECAPTCHA_KEY: env["RECAPTCHA_KEY"],
    STRIPE_PUBLIC_KEY: 'pk_test_51OELbJFBBAUAyJFBp3qyNV35TE56uUP9g1IkZ0KOuWnrNLC2ijFoIIkG71xqISwnFwiibjCOumO8itPsLLIyA1py00ABQ2TJ4H',
    OPENAI_API_KEY: env["OPENAI_API_KEY"],
    ANTHROPIC_API_KEY: env["ANTHROPIC_API_KEY"],
    JINAAI_API_KEY: env["JINAAI_API_KEY"],
    GROQ_API_KEY: env["GROQ_API_KEY"],
    CRAWL4AI_API_KEY: env["CRAWL4AI_API_KEY"],
    API_CRAWL4AI: "https://deepcrawl4ai.fly.dev",
    API_DEPLOY4SCRAP: "https://arachnefly.fly.dev",
    API_ANTHROPIC: "https://api.anthropic.com",
    API_OPENAI: "https://api.openai.com",
    API_GROQ: "https://api.groq.com",
    API_JINAAI: "https://r.jina.ai",
}

const content = `export const environment = ${JSON.stringify(environment, null, 2)};`
console.log(content);
fs.writeFileSync('src/environments/environment.ts', content);