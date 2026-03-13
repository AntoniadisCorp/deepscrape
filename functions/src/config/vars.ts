import {Response} from "express"

const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      (req: any, res: any) =>
        `'nonce-${(res as Response).locals.nonce}'`,
      "'strict-dynamic'",
      "https://www.googletagmanager.com",
      "https://apis.google.com",
      "https://www.google.com",
      "https://www.gstatic.com",
    ],
    styleSrc: [
      "'self'",
      (req: any, res: any) =>
        `'nonce-${(res as Response).locals.nonce}'`,
      "https://cdnjs.cloudflare.com",
      "https://fonts.googleapis.com",
    ],
    connectSrc: [
      "'self'",
      "https://firebase.googleapis.com",
      "https://firestore.googleapis.com",
      "https://identitytoolkit.googleapis.com",
      "https://www.googleapis.com",
      "https://securetoken.googleapis.com",
      "https://us-central1-libnet-d76db.cloudfunctions.net",
      "https://region1.google-analytics.com",
      "https://cdnjs.cloudflare.com",
      "https://deepscrape.dev",
      "https://fonts.gstatic.com",
      "https://www.googletagmanager.com",
      "https://apis.google.com",
      "https://ui-avatars.com",
      "https://cdn.pixabay.com",
      "https://firebasestorage.googleapis.com",
      "https://firebaseinstallations.googleapis.com",
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "https://ui-avatars.com",
      "https://firebasestorage.googleapis.com",
      "https://www.googletagmanager.com",
      "https://www.gstatic.com",
      "https://www.googleapis.com",
    ],
    fontSrc: [
      "'self'",
      "https://cdnjs.cloudflare.com",
      "https://fonts.gstatic.com",
      "https://fonts.googleapis.com",
    ],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameSrc: [
      "'self'",
      "https://libnet-d76db.firebaseapp.com",
    ],
  },
}
export const helmetConfig = {
  contentSecurityPolicy,
}
