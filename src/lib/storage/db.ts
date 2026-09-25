import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { VaultMetadata } from '../../types';

export interface EncryptedMomentRecord {
  id: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface EncryptedFutureLetterRecord {
  id: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
  revealAt: string;
  revealed: boolean;
}

interface StillDBSchema extends DBSchema {
  meta: {
    key: string;
    value: VaultMetadata;
  };
  moments: {
    key: string;
    value: EncryptedMomentRecord;
    indexes: {
      by_createdAt: string;
    };
  };
  future_letters: {
    key: string;
    value: EncryptedFutureLetterRecord;
    indexes: {
      by_revealAt: string;
    };
  };
}

const DB_NAME = 'still_private_world';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<StillDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<StillDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<StillDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Metadata store (salt, kdf, check payload)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }

        // Encrypted moments store
        if (!db.objectStoreNames.contains('moments')) {
          const momentStore = db.createObjectStore('moments', { keyPath: 'id' });
          momentStore.createIndex('by_createdAt', 'createdAt');
        }

        // Encrypted future letters store
        if (!db.objectStoreNames.contains('future_letters')) {
          const letterStore = db.createObjectStore('future_letters', { keyPath: 'id' });
          letterStore.createIndex('by_revealAt', 'revealAt');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Completely drops the database. Used during explicit "Delete World" flow.
 */
export async function closeAndDropDB(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
