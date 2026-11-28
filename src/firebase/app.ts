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
/** App Check runs with the reCAPTCHA Enterprise key in production, or a registered debug token in development. */
export const appCheckConfigured = Boolean(
  env.VITE_RECAPTCHA_ENTERPRISE_KEY || (env.DEV && env.VITE_APPCHECK_DEBUG_TOKEN),
);

export const COMPILER_MODEL = env.VITE_COMPILER_MODEL || "gemini-3.5-flash-lite";
export const CHECK_MODEL = env.VITE_CHECK_MODEL || "gemini-3.5-flash-lite";

let app: FirebaseApp | null = null;
let ai: AI | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured. Copy .env.example to .env.local and fill in the web app config.");
  }
  if (!app) {
    app = initializeApp(config);
    if (appCheckConfigured) {
      if (env.DEV && env.VITE_APPCHECK_DEBUG_TOKEN) {
        // Optional: a debug token registered in App Check, for hosts outside the reCAPTCHA key's domains.
        // Without it, localhost uses the real reCAPTCHA Enterprise provider (localhost is an allowed domain).
        (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
          env.VITE_APPCHECK_DEBUG_TOKEN;
      }
      initializeAppCheck(app, {
        // In debug mode the SDK exchanges the debug token and does not use this key.
        provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_KEY || "debug-mode"),
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
