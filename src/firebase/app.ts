import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, GoogleAIBackend, type AI } from "firebase/ai";

const env = import.meta.env;

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export const appCheckConfigured = Boolean(env.VITE_RECAPTCHA_ENTERPRISE_KEY);

export const COMPILER_MODEL = env.VITE_COMPILER_MODEL || "gemini-3.8-flash";
export const CHECK_MODEL = env.VITE_CHECK_MODEL || "gemini-3.8-flash";

let app: FirebaseApp | null = null;
let ai: AI | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured. Copy .env.example to .env.local and fill in the web app config.");
  }
  if (!app) {
    app = initializeApp(config);
    if (appCheckConfigured) {
      if (env.DEV) {
        // Registered debug token in development, otherwise let the SDK print a new one to the console.
        (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
          env.VITE_APPCHECK_DEBUG_TOKEN || true;
      }
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_KEY as string),
        isTokenAutoRefreshEnabled: true,
      });
    }
  }
  return app;
}

export function getVouchAI(): AI {
  if (!ai) ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  return ai;
}
