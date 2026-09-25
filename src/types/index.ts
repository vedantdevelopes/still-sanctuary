export interface Moment {
  id: string;
  content: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  timezone: string;
  duration?: number; // seconds spent in writing mode
  wordCount: number;
  characterCount: number;
  emotions: string[]; // e.g. ["calm", "peaceful"]
  intensity?: number; // 1 to 5
  tags: string[];
  reflection?: 'lighter' | 'same' | 'different' | 'unknown';
  archived: boolean;
}

export interface FutureLetter {
  id: string;
  content: string;
  createdAt: string; // ISO 8601
  revealAt: string; // ISO 8601
  revealed: boolean;
  emotions?: string[];
}

export interface EncryptedPayload {
  iv: string; // Base64 encoded 12-byte IV
  ciphertext: string; // Base64 encoded AES-GCM ciphertext with auth tag
}

export interface VaultMetadata {
  version: number;
  salt: string; // Base64 encoded 16-byte random salt
  kdfParams: {
    algorithm: 'PBKDF2';
    iterations: number; // >= 600,000
    hash: 'SHA-256';
  };
  checkPayload: EncryptedPayload; // Small encrypted token used to verify key correctness
  createdAt: string;
  autoLockMinutes: number; // 5, 15, 30, 60, or 0 (never)
  theme: 'dark' | 'light' | 'system';
  motionReduced: boolean;
}

export type ViewLocation = 'world' | 'moments' | 'sky' | 'timemachine' | 'thennow' | 'future' | 'write';

export type EmotionName =
  | 'calm'
  | 'happy'
  | 'hopeful'
  | 'grateful'
  | 'confused'
  | 'restless'
  | 'lonely'
  | 'frustrated'
  | 'sad'
  | 'angry'
  | 'overwhelmed'
  | 'peaceful'
  | 'excited'
  | 'uncertain';
