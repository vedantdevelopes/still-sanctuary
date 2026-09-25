import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import { FirebaseSetupModal } from './FirebaseSetupModal';
import styles from './Auth.module.css';

export const LockScreen: React.FC = () => {
  const {
    unlock,
    firebaseUser,
    isFirebaseConfigured,
    loginWithGoogle,
    loginWithEmail,
    logout,
  } = useVault();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Email sign in toggler on lock screen if not signed in
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await unlock(password);
      if (!result.success) {
        setError(result.error || "That isn't the key.");
        setIsSubmitting(false);
      }
    } catch {
      setError("That isn't the key.");
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudEmail || !cloudPassword) return;
    setError(null);
    try {
      await loginWithEmail(cloudEmail, cloudPassword);
      setShowEmailSignIn(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(errorMsg);
    }
  };

  return (
    <>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>STILL</h1>
          <p className={styles.subtitle}>welcome back.</p>

          {firebaseUser && (
            <div className={styles.cloudAccountPill}>
              <span className={styles.cloudDot} />
              <span>{firebaseUser.email || 'Cloud Synced'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                type="password"
                placeholder="key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                className={styles.input}
                aria-label="Enter key"
                required
              />
            </div>

            {error && <p className={styles.errorMessage}>{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitBtn}
            >
              {isSubmitting ? 'Opening…' : 'ENTER'}
            </button>
          </form>

          {isFirebaseConfigured ? (
            <div className={styles.cloudSection}>
              {!firebaseUser ? (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className={styles.googleBtn}
                  >
                    <svg className={styles.googleIcon} viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                      />
                    </svg>
                    <span>{googleLoading ? 'Connecting…' : 'Sign in with Google to Sync'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmailSignIn((p) => !p)}
                    className={styles.signOutLink}
                  >
                    {showEmailSignIn ? 'Cancel Email Sign In' : 'Sign in with Email'}
                  </button>

                  {showEmailSignIn && (
                    <form onSubmit={handleEmailSignIn} className={styles.form} style={{ marginTop: '8px' }}>
                      <input
                        type="email"
                        placeholder="email"
                        value={cloudEmail}
                        onChange={(e) => setCloudEmail(e.target.value)}
                        className={styles.input}
                        required
                      />
                      <input
                        type="password"
                        placeholder="password"
                        value={cloudPassword}
                        onChange={(e) => setCloudPassword(e.target.value)}
                        className={styles.input}
                        required
                      />
                      <button type="submit" className={styles.submitBtn}>
                        SIGN IN
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className={styles.signOutLink}
                >
                  Switch Cloud Account
                </button>
              )}
            </div>
          ) : (
            <div className={styles.cloudSection}>
              <span className={styles.cloudLabel}>Cross-Browser Sync</span>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className={styles.configTriggerBtn}
              >
                Connect Firebase →
              </button>
            </div>
          )}
        </div>
      </div>

      <FirebaseSetupModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </>
  );
};
