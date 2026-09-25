import type { EncryptedPayload } from '../../types';

// Constants adhering to OWASP recommended minimums for PBKDF2
export const PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12;

// Safe utility helpers for ArrayBuffer <-> Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a cryptographically strong random salt.
 */
export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_BYTE_LENGTH);
  window.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generates a cryptographically strong 12-byte IV for AES-GCM.
 */
export function generateIV(): Uint8Array {
  const iv = new Uint8Array(IV_BYTE_LENGTH);
  window.crypto.getRandomValues(iv);
  return iv;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from a user password using PBKDF2 with >= 600,000 iterations.
 * The derived key resides strictly in volatile memory.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import raw password as key material for PBKDF2
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-GCM 256-bit key
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // key is non-extractable from memory
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypts an arbitrary serializable JavaScript object using AES-256-GCM.
 * A fresh, unique 12-byte IV is generated for every call.
 */
export async function encryptObject<T>(data: T, key: CryptoKey): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const serialized = JSON.stringify(data);
  const plaintextBuffer = encoder.encode(serialized);
  const iv = generateIV();

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plaintextBuffer
  );

  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuffer),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload and deserializes the JSON object.
 * Throws an error if the key is incorrect or if the ciphertext has been tampered with.
 */
export async function decryptObject<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  const iv = base64ToUint8Array(payload.iv);
  const ciphertext = base64ToUint8Array(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    ciphertext as BufferSource
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}
