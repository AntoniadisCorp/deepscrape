export const environment = {
    production: false,
    assetsUri: "https://deepscrape.web.app/assets/",
    firebaseConfig: {
        apiKey: process.env["API_KEY"],
        authDomain: process.env["AUTH_DOMAIN"],
        databaseURL: process.env["DATABASE_URL"],
        projectId: process.env["PROJECT_ID"],
        storageBucket: process.env["STORAGE_BUCKET"],
        messagingSenderId: process.env["MESSAGING_SENDER_ID"],
        appId: process.env["APP_ID"],
    },
    recpatcha: process.env["RECPATCHA_KEY"],
    STRIPE_PUBLIC_KEY: 'pk_test_51OELbJFBBAUAyJFBp3qyNV35TE56uUP9g1IkZ0KOuWnrNLC2ijFoIIkG71xqISwnFwiibjCOumO8itPsLLIyA1py00ABQ2TJ4H',
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    JINAAI_API_KEY: '',
    GROQ_API_KEY: '',
    CRAWL4AI_API_KEY: '',
    API_CRAWL4AI: "https://deepcrawl4ai.fly.dev",
    API_ANTHROPIC: "https://api.anthropic.com",
    API_OPENAI: "https://api.openai.com",
    API_GROQ: "https://api.groq.com",
    API_JINAAI: "https://r.jina.ai",
}