import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { getDB, type EncryptedMomentRecord, type EncryptedFutureLetterRecord } from '../storage/db';
import type { VaultMetadata } from '../../types';

const META_KEY = 'vault_metadata';

/**
 * Checks if the user has an existing encrypted vault saved in Firestore.
 */
export async function fetchCloudMetadata(userId: string): Promise<VaultMetadata | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const metaRef = doc(db, 'users', userId, 'sanctuary', 'metadata');
    const snap = await getDoc(metaRef);
    if (snap.exists()) {
      return snap.data() as VaultMetadata;
    }
    return null;
  } catch (err) {
    console.warn('[STILL Firebase] Could not fetch cloud metadata:', err);
    return null;
  }
}

/**
 * Saves or updates the vault metadata in Firestore.
 */
export async function saveCloudMetadata(userId: string, metadata: VaultMetadata): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const metaRef = doc(db, 'users', userId, 'sanctuary', 'metadata');
    await setDoc(metaRef, metadata, { merge: true });
  } catch (err) {
    console.warn('[STILL Firebase] Could not save cloud metadata:', err);
  }
}

/**
 * Saves a single encrypted moment record to Firestore.
 */
export async function saveCloudMoment(userId: string, record: EncryptedMomentRecord): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const momentRef = doc(db, 'users', userId, 'moments', record.id);
    await setDoc(momentRef, record, { merge: true });
  } catch (err) {
    console.warn('[STILL Firebase] Could not sync moment to cloud:', err);
  }
}

/**
 * Deletes a moment record from Firestore.
 */
export async function deleteCloudMoment(userId: string, momentId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const momentRef = doc(db, 'users', userId, 'moments', momentId);
    await deleteDoc(momentRef);
  } catch (err) {
    console.warn('[STILL Firebase] Could not delete moment from cloud:', err);
  }
}

/**
 * Saves an encrypted future letter record to Firestore.
 */
export async function saveCloudFutureLetter(
  userId: string,
  record: EncryptedFutureLetterRecord
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const letterRef = doc(db, 'users', userId, 'future_letters', record.id);
    await setDoc(letterRef, record, { merge: true });
  } catch (err) {
    console.warn('[STILL Firebase] Could not sync letter to cloud:', err);
  }
}

/**
 * Fetches all encrypted moments from Firestore.
 */
export async function fetchAllCloudMoments(userId: string): Promise<EncryptedMomentRecord[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const momentsCol = collection(db, 'users', userId, 'moments');
    const snap = await getDocs(momentsCol);
    return snap.docs.map((d) => d.data() as EncryptedMomentRecord);
  } catch (err) {
    console.warn('[STILL Firebase] Could not fetch cloud moments:', err);
    return [];
  }
}

/**
 * Fetches all encrypted future letters from Firestore.
 */
export async function fetchAllCloudFutureLetters(userId: string): Promise<EncryptedFutureLetterRecord[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const lettersCol = collection(db, 'users', userId, 'future_letters');
    const snap = await getDocs(lettersCol);
    return snap.docs.map((d) => d.data() as EncryptedFutureLetterRecord);
  } catch (err) {
    console.warn('[STILL Firebase] Could not fetch cloud future letters:', err);
    return [];
  }
}

/**
 * Performs a full bi-directional sync between local IndexedDB and Firestore.
 * Merges local and remote encrypted records based on updatedAt/createdAt.
 */
export async function syncSanctuaryWithCloud(userId: string): Promise<{
  syncedMomentsCount: number;
  syncedLettersCount: number;
}> {
  if (!isFirebaseConfigured || !db) {
    return { syncedMomentsCount: 0, syncedLettersCount: 0 };
  }

  const localDB = await getDB();
  const localMeta = await localDB.get('meta', META_KEY);
  const cloudMeta = await fetchCloudMetadata(userId);

  // 1. Sync metadata: if local exists, save to cloud; if only cloud exists, save locally
  if (localMeta) {
    await saveCloudMetadata(userId, localMeta);
  } else if (cloudMeta) {
    await localDB.put('meta', cloudMeta, META_KEY);
  }

  // 2. Fetch local records
  const localMoments = await localDB.getAll('moments');
  const localLetters = await localDB.getAll('future_letters');

  // 3. Fetch cloud records
  const cloudMoments = await fetchAllCloudMoments(userId);
  const cloudLetters = await fetchAllCloudFutureLetters(userId);

  // 4. Merge moments: upload any local missing from cloud, and download any cloud missing from local
  const cloudMomentsMap = new Map(cloudMoments.map((m) => [m.id, m]));
  const localMomentsMap = new Map(localMoments.map((m) => [m.id, m]));

  const momentsBatch = writeBatch(db);
  let cloudWrites = 0;

  // Push local moments to cloud if newer or missing
  for (const localM of localMoments) {
    const cloudM = cloudMomentsMap.get(localM.id);
    if (!cloudM || new Date(localM.updatedAt).getTime() > new Date(cloudM.updatedAt).getTime()) {
      const docRef = doc(db, 'users', userId, 'moments', localM.id);
      momentsBatch.set(docRef, localM, { merge: true });
      cloudWrites++;
    }
  }

  // Save cloud moments to local DB if newer or missing locally
  const txMoments = localDB.transaction('moments', 'readwrite');
  for (const cloudM of cloudMoments) {
    const localM = localMomentsMap.get(cloudM.id);
    if (!localM || new Date(cloudM.updatedAt).getTime() > new Date(localM.updatedAt).getTime()) {
      await txMoments.store.put(cloudM);
    }
  }
  await txMoments.done;

  if (cloudWrites > 0) {
    await momentsBatch.commit();
  }

  // 5. Merge future letters
  const cloudLettersMap = new Map(cloudLetters.map((l) => [l.id, l]));
  const localLettersMap = new Map(localLetters.map((l) => [l.id, l]));

  const lettersBatch = writeBatch(db);
  let letterWrites = 0;

  for (const localL of localLetters) {
    const cloudL = cloudLettersMap.get(localL.id);
    if (!cloudL) {
      const docRef = doc(db, 'users', userId, 'future_letters', localL.id);
      lettersBatch.set(docRef, localL, { merge: true });
      letterWrites++;
    }
  }

  const txLetters = localDB.transaction('future_letters', 'readwrite');
  for (const cloudL of cloudLetters) {
    const localL = localLettersMap.get(cloudL.id);
    if (!localL) {
      await txLetters.store.put(cloudL);
    }
  }
  await txLetters.done;

  if (letterWrites > 0) {
    await lettersBatch.commit();
  }

  const totalMoments = (await localDB.getAll('moments')).length;
  const totalLetters = (await localDB.getAll('future_letters')).length;

  return { syncedMomentsCount: totalMoments, syncedLettersCount: totalLetters };
}

/**
 * Erases all cloud data for the given user (used during Wipe Sanctuary).
 */
export async function deleteCloudSanctuary(userId: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const metaRef = doc(db, 'users', userId, 'sanctuary', 'metadata');
    await deleteDoc(metaRef);

    const moments = await fetchAllCloudMoments(userId);
    for (const m of moments) {
      await deleteDoc(doc(db, 'users', userId, 'moments', m.id));
    }

    const letters = await fetchAllCloudFutureLetters(userId);
    for (const l of letters) {
      await deleteDoc(doc(db, 'users', userId, 'future_letters', l.id));
    }
  } catch (err) {
    console.warn('[STILL Firebase] Failed to wipe cloud sanctuary:', err);
  }
}
