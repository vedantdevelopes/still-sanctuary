import React, { useState, useRef } from 'react';
import { useVault } from '../../context/VaultContext';
import {
  exportEncryptedWorld,
  importEncryptedWorld,
} from '../../lib/storage/vaultStorage';
import styles from './Settings.module.css';

export const SettingsModal: React.FC = () => {
  const {
    settingsOpen,
    setSettingsOpen,
    theme,
    setTheme,
    reducedMotion,
    setReducedMotion,
    autoLockMinutes,
    setAutoLockMinutes,
    lockVault,
    updatePassword,
    resetAndWipe,
    firebaseUser,
    isFirebaseConfigured,
    isSyncing,
    lastSyncedAt,
    loginWithGoogle,
    logout,
    syncWithCloud,
  } = useVault();

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // World wipe confirmation
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // File import ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!settingsOpen) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPw.length < 8) {
      setPwMessage({ type: 'error', text: 'New key must be at least 8 characters.' });
      return;
    }
    if (newPw !== confirmNewPw) {
      setPwMessage({ type: 'error', text: 'New keys do not match.' });
      return;
    }

    try {
      await updatePassword(currentPw, newPw);
      setPwMessage({ type: 'success', text: 'Key re-forged and world re-encrypted successfully.' });
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
      setTimeout(() => setShowPasswordChange(false), 2000);
    } catch {
      setPwMessage({ type: 'error', text: "Current key isn't correct." });
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportEncryptedWorld();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STILL_encrypted_world_${new Date().toISOString().split('T')[0]}.still`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate export.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importEncryptedWorld(text);
      setImportStatus('Encrypted backup imported. Please lock and re-enter with the backup key.');
      setTimeout(() => {
        lockVault();
      }, 2500);
    } catch {
      setImportStatus('Failed to restore backup: Invalid file format.');
    }
  };

  const handleDeleteWorld = async () => {
    await resetAndWipe();
    setSettingsOpen(false);
  };

  return (
    <div
      className={styles.overlay}
      onClick={() => setSettingsOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>SANCTUARY SETTINGS</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className={styles.closeBtn}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Security Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>SECURITY</div>

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Auto-Lock After Inactivity</div>
                <div className={styles.settingDesc}>
                  Clears decrypted memory and locks your sanctuary when idle.
                </div>
              </div>

              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                className={styles.selectInput}
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes (default)</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={0}>Never</option>
              </select>
            </div>

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Change Your Key</div>
                <div className={styles.settingDesc}>
                  Re-derives master key and re-encrypts all moments.
                </div>
              </div>

              <button
                onClick={() => setShowPasswordChange((prev) => !prev)}
                className={styles.actionBtn}
              >
                {showPasswordChange ? 'CANCEL' : 'CHANGE KEY'}
              </button>
            </div>

            {showPasswordChange && (
              <form onSubmit={handlePasswordChange} className={styles.pwForm}>
                <input
                  type="password"
                  placeholder="current key"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className={styles.pwInput}
                  required
                />
                <input
                  type="password"
                  placeholder="new key (min 8 characters)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className={styles.pwInput}
                  required
                />
                <input
                  type="password"
                  placeholder="confirm new key"
                  value={confirmNewPw}
                  onChange={(e) => setConfirmNewPw(e.target.value)}
                  className={styles.pwInput}
                  required
                />
                {pwMessage && (
                  <div
                    className={
                      pwMessage.type === 'error'
                        ? styles.pwError
                        : styles.pwSuccess
                    }
                  >
                    {pwMessage.text}
                  </div>
                )}
                <button type="submit" className={styles.saveKeyBtn}>
                  CONFIRM NEW KEY
                </button>
              </form>
            )}

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Lock Sanctuary Now</div>
                <div className={styles.settingDesc}>
                  Immediately scrubs keys and returns to the lock screen.
                </div>
              </div>

              <button onClick={lockVault} className={styles.lockNowBtn}>
                LOCK STILL
              </button>
            </div>
          </section>

          {/* Appearance Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>WORLD & APPEARANCE</div>

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Sanctuary Theme</div>
                <div className={styles.settingDesc}>
                  Nocturne (night charcoal) or Morning (quiet paper).
                </div>
              </div>

              <div className={styles.themePills}>
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`${styles.themePill} ${
                      theme === t ? styles.selectedTheme : ''
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Reduced Motion</div>
                <div className={styles.settingDesc}>
                  Disables drifting particles and ambient transitions.
                </div>
              </div>

              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className={styles.checkboxInput}
                aria-label="Toggle reduced motion"
              />
            </div>
          </section>

          {/* Data Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>DATA & BACKUP</div>

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Export Encrypted World</div>
                <div className={styles.settingDesc}>
                  Save an encrypted backup file (.still) to your computer.
                </div>
              </div>

              <button onClick={handleExport} className={styles.actionBtn}>
                EXPORT (.STILL)
              </button>
            </div>

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Import World</div>
                <div className={styles.settingDesc}>
                  Restore an encrypted backup. Requires the original key.
                </div>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".still,.json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.actionBtn}
                >
                  IMPORT
                </button>
              </div>
            </div>
            {importStatus && (
              <p className={styles.statusNotice}>{importStatus}</p>
            )}

            <div className={styles.settingRow}>
              <div>
                <div className={styles.settingName}>Delete World</div>
                <div className={styles.settingDesc}>
                  Permanently erase all stored moments and reset this device.
                </div>
              </div>

              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className={styles.deletePromptBtn}
                >
                  DELETE WORLD
                </button>
              ) : (
                <div className={styles.deleteConfirmGroup}>
                  <button
                    onClick={handleDeleteWorld}
                    className={styles.dangerBtn}
                  >
                    CONFIRM ERASE
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    className={styles.actionBtn}
                  >
                    CANCEL
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Cloud & Firebase Sync Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>CLOUD & FIREBASE SYNC</div>
            <div className={styles.cloudBox}>
              <div className={styles.cloudStatusHeader}>
                <span className={styles.settingName}>Sanctuary Cloud Sync</span>
                <div className={styles.cloudBadge}>
                  <span
                    className={
                      !isFirebaseConfigured
                        ? styles.cloudDotOffline
                        : firebaseUser
                        ? styles.cloudDotActive
                        : styles.cloudDotIdle
                    }
                  />
                  <span>
                    {!isFirebaseConfigured
                      ? 'Local Only (No Firebase Config)'
                      : firebaseUser
                      ? 'Cloud Synced'
                      : 'Signed Out'}
                  </span>
                </div>
              </div>

              <p className={styles.cloudDetails}>
                {!isFirebaseConfigured ? (
                  <>
                    Firebase credentials are not configured. Your world is currently saved in local
                    IndexedDB. To enable cloud sync and host on Vercel, add your Firebase environment variables.
                  </>
                ) : firebaseUser ? (
                  <>
                    Connected to <strong>{firebaseUser.email || 'Cloud Account'}</strong>. All entries
                    are encrypted with AES-256-GCM before being sent to Firestore.
                    {lastSyncedAt && (
                      <span> Last synced: {lastSyncedAt.toLocaleTimeString()}.</span>
                    )}
                  </>
                ) : (
                  <>
                    Sign in with Google to sync your encrypted sanctuary across all your devices.
                  </>
                )}
              </p>

              {isFirebaseConfigured && (
                <div className={styles.cloudActions}>
                  {!firebaseUser ? (
                    <button
                      onClick={loginWithGoogle}
                      className={styles.googleSettingsBtn}
                    >
                      <svg className={styles.googleIconSmall} viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"/>
                        <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                      </svg>
                      <span>CONNECT GOOGLE</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={syncWithCloud}
                        disabled={isSyncing}
                        className={styles.syncNowBtn}
                      >
                        {isSyncing ? 'SYNCING…' : 'SYNC TO CLOUD'}
                      </button>
                      <button
                        onClick={logout}
                        className={styles.actionBtn}
                      >
                        SIGN OUT
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Privacy Guarantee */}
          <section className={styles.privacyBox}>
            <div className={styles.privacyTitle}>YOUR WORLD</div>
            <p className={styles.privacyText}>
              Stored locally on this device.
              <br />
              Encrypted with AES-256-GCM before storage.
              <br />
              Derived using PBKDF2 (600,000 iterations).
              <br />
              Your password and decrypted moments are never transmitted to any
              server, cloud, or third party.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
