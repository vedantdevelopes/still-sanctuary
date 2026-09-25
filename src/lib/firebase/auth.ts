import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function loginWithGoogle(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Please add your credentials to .env.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('[STILL] Google Auth error:', err);
    if (err.code === 'auth/unauthorized-domain') {
      const hostname = window.location.hostname;
      throw new Error(
        `'${hostname}' is not an authorized domain. Please open http://localhost:5173/ or add '${hostname}' in Firebase Console → Authentication → Settings → Authorized domains.`
      );
    }
    if (err.code === 'auth/popup-blocked') {
      throw new Error('The Google sign-in popup was blocked by your browser. Please allow popups for this site.');
    }
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in was closed before finishing.');
    }
    if (err.code === 'auth/cancelled-popup-request') {
      return null;
    }
    throw new Error(err.message || 'Google sign-in failed.');
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Please add your credentials to .env.');
  }
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

export async function registerWithEmail(email: string, pass: string): Promise<User | null> {
  if (!isFirebaseConfigured || !auth) {
    throw new Error('Firebase is not configured. Please add your credentials to .env.');
  }
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
