import { getDB, closeAndDropDB } from './db';
import type { EncryptedMomentRecord, EncryptedFutureLetterRecord } from './db';
import {
  deriveKeyFromPassword,
  encryptObject,
  decryptObject,
  generateSalt,
  bufferToBase64,
  base64ToUint8Array,
  PBKDF2_ITERATIONS,
} from '../crypto/vaultCrypto';
import type { Moment, FutureLetter, VaultMetadata, EncryptedPayload } from '../../types';

const META_KEY = 'vault_metadata';

export interface UnlockResult {
  success: boolean;
  key?: CryptoKey;
  metadata?: VaultMetadata;
  error?: string;
}

/**
 * Checks if a vault exists on this device.
 */
export async function isVaultInitialized(): Promise<boolean> {
  const db = await getDB();
  const meta = await db.get('meta', META_KEY);
  return Boolean(meta);
}

/**
 * Retrieves the stored vault metadata (salt, kdf params, theme, etc.) without revealing any secrets.
 */
export async function getVaultMetadata(): Promise<VaultMetadata | undefined> {
  const db = await getDB();
  return db.get('meta', META_KEY);
}

/**
 * Updates unencrypted vault preferences such as theme, autoLockMinutes, or reduced motion.
 */
export async function updateVaultPreferences(
  updates: Partial<Pick<VaultMetadata, 'theme' | 'autoLockMinutes' | 'motionReduced'>>
): Promise<VaultMetadata> {
  const db = await getDB();
  const current = await db.get('meta', META_KEY);
  if (!current) {
    throw new Error('Vault is not initialized');
  }
  const updated: VaultMetadata = { ...current, ...updates };
  await db.put('meta', updated, META_KEY);
  return updated;
}

/**
 * Initializes a new encrypted vault with the user's password.
 * Returns the derived in-memory CryptoKey.
 */
export async function initializeVault(password: string): Promise<{ key: CryptoKey; metadata: VaultMetadata }> {
  const salt = generateSalt();
  const key = await deriveKeyFromPassword(password, salt, PBKDF2_ITERATIONS);

  // Small verification payload to test password validity in subsequent sessions
  const checkPayload = await encryptObject({ verified: true, timestamp: Date.now() }, key);

  const metadata: VaultMetadata = {
    version: 1,
    salt: bufferToBase64(salt),
    kdfParams: {
      algorithm: 'PBKDF2',
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    checkPayload,
    createdAt: new Date().toISOString(),
    autoLockMinutes: 15,
    theme: 'dark',
    motionReduced: false,
  };

  const db = await getDB();
  await db.put('meta', metadata, META_KEY);

  return { key, metadata };
}

/**
 * Attempts to unlock the vault.
 * If authentication tag fails, throws error quietly and returns { success: false, error: "That isn't the key." }
 */
export async function unlockVault(password: string): Promise<UnlockResult> {
  const db = await getDB();
  const metadata = await db.get('meta', META_KEY);

  if (!metadata) {
    return { success: false, error: 'No world found on this device.' };
  }

  try {
    const saltBytes = base64ToUint8Array(metadata.salt);
    const key = await deriveKeyFromPassword(password, saltBytes, metadata.kdfParams.iterations);

    // Verify key against authenticated checkPayload
    const check = await decryptObject<{ verified: boolean }>(metadata.checkPayload, key);
    if (!check.verified) {
      return { success: false, error: "That isn't the key." };
    }

    return { success: true, key, metadata };
  } catch {
    // Decryption failed due to authentication tag mismatch or invalid key
    return { success: false, error: "That isn't the key." };
  }
}

/**
 * Encrypts and saves a Moment to IndexedDB.
 */
export async function saveMoment(moment: Moment, key: CryptoKey): Promise<EncryptedMomentRecord> {
  const payload = await encryptObject(moment, key);
  const record: EncryptedMomentRecord = {
    id: moment.id,
    iv: payload.iv,
    ciphertext: payload.ciphertext,
    createdAt: moment.createdAt,
    updatedAt: moment.updatedAt,
    archived: moment.archived,
  };

  const db = await getDB();
  await db.put('moments', record);
  return record;
}

/**
 * Reads all encrypted moments from IndexedDB and decrypts them using the in-memory key.
 */
export async function loadAllMoments(key: CryptoKey): Promise<Moment[]> {
  const db = await getDB();
  const records = await db.getAll('moments');
  const moments: Moment[] = [];

  for (const record of records) {
    try {
      const payload: EncryptedPayload = {
        iv: record.iv,
        ciphertext: record.ciphertext,
      };
      const decrypted = await decryptObject<Moment>(payload, key);
      moments.push(decrypted);
    } catch {
      // Skip corrupt record if any, without crashing
    }
  }

  // Sort descending by creation date
  return moments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Deletes a moment by ID from IndexedDB.
 */
export async function deleteMoment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('moments', id);
}

/**
 * Encrypts and saves a FutureLetter to IndexedDB.
 */
export async function saveFutureLetter(letter: FutureLetter, key: CryptoKey): Promise<EncryptedFutureLetterRecord> {
  const payload = await encryptObject(letter, key);
  const record: EncryptedFutureLetterRecord = {
    id: letter.id,
    iv: payload.iv,
    ciphertext: payload.ciphertext,
    createdAt: letter.createdAt,
    revealAt: letter.revealAt,
    revealed: letter.revealed,
  };

  const db = await getDB();
  await db.put('future_letters', record);
  return record;
}

/**
 * Reads and decrypts all future letters.
 */
export async function loadAllFutureLetters(key: CryptoKey): Promise<FutureLetter[]> {
  const db = await getDB();
  const records = await db.getAll('future_letters');
  const letters: FutureLetter[] = [];

  for (const record of records) {
    try {
      const payload: EncryptedPayload = {
        iv: record.iv,
        ciphertext: record.ciphertext,
      };
      const decrypted = await decryptObject<FutureLetter>(payload, key);
      letters.push(decrypted);
    } catch {
      // Skip
    }
  }

  return letters.sort((a, b) => new Date(a.revealAt).getTime() - new Date(b.revealAt).getTime());
}

/**
 * Changes the vault password by decrypting all moments with the old key,
 * generating a fresh salt, and re-encrypting all moments and letters with the new key.
 */
export async function changePassword(
  oldKey: CryptoKey,
  newPassword: string
): Promise<{ newKey: CryptoKey; newMetadata: VaultMetadata }> {
  const moments = await loadAllMoments(oldKey);
  const letters = await loadAllFutureLetters(oldKey);
  const currentMeta = await getVaultMetadata();

  const newSalt = generateSalt();
  const newKey = await deriveKeyFromPassword(newPassword, newSalt, PBKDF2_ITERATIONS);
  const newCheckPayload = await encryptObject({ verified: true, timestamp: Date.now() }, newKey);

  const newMetadata: VaultMetadata = {
    version: currentMeta ? currentMeta.version : 1,
    salt: bufferToBase64(newSalt),
    kdfParams: {
      algorithm: 'PBKDF2',
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    checkPayload: newCheckPayload,
    createdAt: currentMeta ? currentMeta.createdAt : new Date().toISOString(),
    autoLockMinutes: currentMeta ? currentMeta.autoLockMinutes : 15,
    theme: currentMeta ? currentMeta.theme : 'dark',
    motionReduced: currentMeta ? currentMeta.motionReduced : false,
  };

  const db = await getDB();
  const tx = db.transaction(['meta', 'moments', 'future_letters'], 'readwrite');

  await tx.objectStore('meta').put(newMetadata, META_KEY);

  // Re-encrypt moments
  for (const moment of moments) {
    const payload = await encryptObject(moment, newKey);
    const rec: EncryptedMomentRecord = {
      id: moment.id,
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      createdAt: moment.createdAt,
      updatedAt: moment.updatedAt,
      archived: moment.archived,
    };
    await tx.objectStore('moments').put(rec);
  }

  // Re-encrypt future letters
  for (const letter of letters) {
    const payload = await encryptObject(letter, newKey);
    const rec: EncryptedFutureLetterRecord = {
      id: letter.id,
      iv: payload.iv,
      ciphertext: payload.ciphertext,
      createdAt: letter.createdAt,
      revealAt: letter.revealAt,
      revealed: letter.revealed,
    };
    await tx.objectStore('future_letters').put(rec);
  }

  await tx.done;

  return { newKey, newMetadata };
}

export interface EncryptedWorldExport {
  format: 'STILL_ENCRYPTED_WORLD';
  version: number;
  exportedAt: string;
  metadata: VaultMetadata;
  moments: EncryptedMomentRecord[];
  futureLetters: EncryptedFutureLetterRecord[];
}

/**
 * Exports the world as an encrypted JSON blob.
 * NO PLAINTEXT CONTENT IS INCLUDED.
 */
export async function exportEncryptedWorld(): Promise<string> {
  const db = await getDB();
  const metadata = await db.get('meta', META_KEY);
  if (!metadata) throw new Error('No vault to export');

  const moments = await db.getAll('moments');
  const futureLetters = await db.getAll('future_letters');

  const exportData: EncryptedWorldExport = {
    format: 'STILL_ENCRYPTED_WORLD',
    version: 1,
    exportedAt: new Date().toISOString(),
    metadata,
    moments,
    futureLetters,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Imports an encrypted world backup.
 */
export async function importEncryptedWorld(jsonContent: string): Promise<VaultMetadata> {
  const parsed = JSON.parse(jsonContent) as EncryptedWorldExport;
  if (parsed.format !== 'STILL_ENCRYPTED_WORLD' || !parsed.metadata) {
    throw new Error('Invalid STILL encrypted backup file');
  }

  const db = await getDB();
  const tx = db.transaction(['meta', 'moments', 'future_letters'], 'readwrite');

  await tx.objectStore('meta').put(parsed.metadata, META_KEY);

  await tx.objectStore('moments').clear();
  for (const m of parsed.moments || []) {
    await tx.objectStore('moments').put(m);
  }

  await tx.objectStore('future_letters').clear();
  for (const l of parsed.futureLetters || []) {
    await tx.objectStore('future_letters').put(l);
  }

  await tx.done;
  return parsed.metadata;
}

/**
 * Completely erases all data from this device.
 */
export async function deleteEntireWorld(): Promise<void> {
  await closeAndDropDB();
}
