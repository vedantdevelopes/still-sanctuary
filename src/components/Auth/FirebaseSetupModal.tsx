import React, { useState } from 'react';
import {
  saveFirebaseCustomConfig,
  getEffectiveFirebaseConfig,
  type FirebaseClientConfig,
} from '../../lib/firebase/config';
import styles from './FirebaseSetupModal.module.css';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({ isOpen, onClose }) => {
  const initial = getEffectiveFirebaseConfig();
  const [apiKey, setApiKey] = useState(initial.apiKey || '');
  const [authDomain, setAuthDomain] = useState(initial.authDomain || '');
  const [projectId, setProjectId] = useState(initial.projectId || '');
  const [storageBucket, setStorageBucket] = useState(initial.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(initial.messagingSenderId || '');
  const [appId, setAppId] = useState(initial.appId || '');

  const [rawSnippet, setRawSnippet] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSnippetPaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawSnippet(text);

    // Auto extract values from javascript snippet or JSON
    const extract = (key: string) => {
      const regex = new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']([^"']+)["']`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    };

    const foundApiKey = extract('apiKey');
    const foundAuthDomain = extract('authDomain');
    const foundProjectId = extract('projectId');
    const foundStorageBucket = extract('storageBucket');
    const foundMessagingSenderId = extract('messagingSenderId');
    const foundAppId = extract('appId');

    if (foundApiKey) setApiKey(foundApiKey);
    if (foundAuthDomain) setAuthDomain(foundAuthDomain);
    if (foundProjectId) setProjectId(foundProjectId);
    if (foundStorageBucket) setStorageBucket(foundStorageBucket);
    if (foundMessagingSenderId) setMessagingSenderId(foundMessagingSenderId);
    if (foundAppId) setAppId(foundAppId);

    if (foundApiKey && foundProjectId && foundAppId) {
      setStatus('Detected Firebase configuration keys.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !projectId || !appId) {
      setStatus('Please provide at least API Key, Project ID, and App ID.');
      return;
    }

    const config: FirebaseClientConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    setStatus('Saving and connecting to Firebase…');
    saveFirebaseCustomConfig(config);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>CONNECT FIREBASE CLOUD</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">
            ✕
          </button>
        </div>

        <p className={styles.subtitle}>
          Connecting Firebase allows you to unlock your sanctuary from any browser, device, or incognito window using your key.
          Your prose remains encrypted with <strong>AES-256-GCM</strong> client-side before touching the cloud.
        </p>

        {/* 5-Step Guide */}
        <div className={styles.stepsList}>
          <div className={styles.stepItem}>
            <span className={styles.stepNumber}>1</span>
            <div className={styles.stepText}>
              Open{' '}
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className={styles.link}
              >
                Firebase Console ↗
              </a>{' '}
              and click <strong>Add project</strong> (e.g. <em>still-sanctuary</em>).
            </div>
          </div>
          <div className={styles.stepItem}>
            <span className={styles.stepNumber}>2</span>
            <div className={styles.stepText}>
              In the sidebar under <strong>Build</strong>, enable:
              <br />
              • <strong>Authentication</strong> → Get started → enable <strong>Email/Password</strong> (and Google if desired).
              <br />
              • <strong>Firestore Database</strong> → Create database → Start in test or production mode.
            </div>
          </div>
          <div className={styles.stepItem}>
            <span className={styles.stepNumber}>3</span>
            <div className={styles.stepText}>
              Click <strong>Project Settings (gear icon)</strong> → scroll to <strong>Your apps</strong> → click <strong>Web (&lt;/&gt;)</strong>.
            </div>
          </div>
          <div className={styles.stepItem}>
            <span className={styles.stepNumber}>4</span>
            <div className={styles.stepText}>
              Copy the <code>firebaseConfig</code> code snippet and paste it below.
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className={styles.pasteSection}>
          <label className={styles.label}>Paste Firebase Config Snippet</label>
          <textarea
            placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "...",\n  appId: "..."\n};`}
            value={rawSnippet}
            onChange={handleSnippetPaste}
            className={styles.textarea}
          />

          <div className={styles.fieldsGrid}>
            <div className={styles.inputField}>
              <label>API Key (VITE_FIREBASE_API_KEY)</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputField}>
              <label>Project ID (VITE_FIREBASE_PROJECT_ID)</label>
              <input
                type="text"
                placeholder="still-world-123"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputField}>
              <label>App ID (VITE_FIREBASE_APP_ID)</label>
              <input
                type="text"
                placeholder="1:12345:web:abcdef"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                required
              />
            </div>
            <div className={styles.inputField}>
              <label>Auth Domain (Optional)</label>
              <input
                type="text"
                placeholder="project.firebaseapp.com"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
              />
            </div>
          </div>

          {status && <p className={styles.statusMessage}>{status}</p>}

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              Connect & Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
