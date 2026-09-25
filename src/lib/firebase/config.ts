import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY = 'still_firebase_custom_config';

export function getEffectiveFirebaseConfig(): FirebaseClientConfig {
  const envConfig: FirebaseClientConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (
    envConfig.apiKey &&
    envConfig.projectId &&
    envConfig.appId &&
    envConfig.apiKey !== 'your-api-key-here' &&
    !envConfig.apiKey.includes('PLACEHOLDER')
  ) {
    return envConfig;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FirebaseClientConfig;
      if (parsed.apiKey && parsed.projectId && parsed.appId) {
        return parsed;
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  return envConfig;
}

const currentConfig = getEffectiveFirebaseConfig();

// Check if Firebase configuration is provided
export const isFirebaseConfigured = Boolean(
  currentConfig.apiKey &&
  currentConfig.projectId &&
  currentConfig.appId &&
  currentConfig.apiKey !== 'your-api-key-here' &&
  !currentConfig.apiKey.includes('PLACEHOLDER')
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(currentConfig as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn('[STILL] Firebase initialization failed:', err);
  }
}

export function saveFirebaseCustomConfig(config: FirebaseClientConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearFirebaseCustomConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

export { app, auth, db };

