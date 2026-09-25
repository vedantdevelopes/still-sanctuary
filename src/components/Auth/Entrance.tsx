import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import styles from './Auth.module.css';

export const Entrance: React.FC = () => {
  const {
    initialize,
    restoreFromCloudWithEmail,
    restoreFromCloudWithGoogle,
    loginWithGoogle,
    firebaseUser,
    isFirebaseConfigured,
    logout,
  } = useVault();

  // Mode: 'restore' for returning users on another browser/device; 'create' for new worlds
  const [authMode, setAuthMode] = useState<'restore' | 'create'>(
    isFirebaseConfigured ? 'restore' : 'create'
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Restore existing world from cloud
  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (!email || !password) {
      setError('Please provide your account email and sanctuary key.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Contacting cloud & retrieving your encrypted sanctuary…');

    try {
      const result = await restoreFromCloudWithEmail(email.trim(), password);
      if (!result.success) {
        setError(result.error || "That isn't the key for this sanctuary.");
        setStatus(null);
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Could not restore world from cloud.';
      setError(errorMsg);
      setStatus(null);
      setIsSubmitting(false);
    }
  };

  // Create brand new world
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (password.length < 8) {
      setError('Choose a key with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The keys do not match.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Forging master key and encrypting private sanctuary…');

    try {
      await initialize(password, email.trim() || undefined);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Something went wrong while forging your key.';
      setError(errorMsg);
      setStatus(null);
      setIsSubmitting(false);
    }
  };

  // Google sign in restore
  const handleGoogleRestore = async () => {
    setError(null);
    setStatus(null);
    setGoogleLoading(true);
    try {
      const result = await restoreFromCloudWithGoogle();
      if (!result.success) {
        if (result.error && result.error.includes('no cloud world exists yet')) {
          setAuthMode('create');
          setStatus(result.error);
        } else {
          setError(result.error || 'Google restoration failed');
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Google sign in for initial account link
  const handleGoogleLink = async () => {
    setError(null);
    setStatus(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      setStatus('Google connected. Choose your master key below to complete setup.');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(errorMsg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>STILL</h1>
          <p className={styles.subtitle}>A private place.</p>

          {firebaseUser && (
            <div className={styles.cloudAccountPill}>
              <span className={styles.cloudDot} />
              <span>Synced as {firebaseUser.email || 'Cloud Account'}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className={styles.modeTabs}>
            <button
              type="button"
              className={`${styles.modeTab} ${authMode === 'restore' ? styles.activeModeTab : ''}`}
              onClick={() => {
                setAuthMode('restore');
                setError(null);
                setStatus(null);
              }}
            >
              Enter Existing World
            </button>
            <button
              type="button"
              className={`${styles.modeTab} ${authMode === 'create' ? styles.activeModeTab : ''}`}
              onClick={() => {
                setAuthMode('create');
                setError(null);
                setStatus(null);
              }}
            >
              Create New World
            </button>
          </div>

          {/* RESTORE EXISTING WORLD FORM */}
          {authMode === 'restore' && (
            <form onSubmit={handleRestoreSubmit} className={styles.form}>
              <div className={styles.formLabel}>RESTORE YOUR WORLD</div>

                  <div className={styles.inputGroup}>
                    <input
                      type="email"
                      placeholder="account email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      autoFocus
                      className={styles.input}
                      aria-label="Account email"
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <input
                      type="password"
                      placeholder="sanctuary key"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      className={styles.input}
                      aria-label="Sanctuary key"
                      required
                    />
                  </div>

                  {status && <p className={styles.recoveryNotice}>{status}</p>}
                  {error && <p className={styles.errorMessage}>{error}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.submitBtn}
                  >
                    {isSubmitting ? 'Restoring world…' : 'RESTORE & ENTER →'}
                  </button>

                  <div className={styles.orDivider}>
                    <span>or</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleRestore}
                    disabled={googleLoading || isSubmitting}
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
                    <span>{googleLoading ? 'Connecting Google…' : 'Restore via Google'}</span>
                  </button>
                </form>
              )}

          {/* CREATE NEW WORLD FORM */}
          {authMode === 'create' && (
            <form onSubmit={handleCreateSubmit} className={styles.form}>
              <div className={styles.formLabel}>FORGE YOUR MASTER KEY</div>

              <div className={styles.inputGroup}>
                <input
                  type="password"
                  placeholder="choose your key (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                  className={styles.input}
                  aria-label="New key"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <input
                  type="password"
                  placeholder="confirm your key"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  className={styles.input}
                  aria-label="Confirm key"
                  required
                />
              </div>

              {isFirebaseConfigured && (
                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    placeholder="email (optional, to sync across devices)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className={styles.input}
                    aria-label="Sync email"
                  />
                </div>
              )}

              {status && <p className={styles.recoveryNotice}>{status}</p>}
              {error && <p className={styles.errorMessage}>{error}</p>}

              <p className={styles.recoveryNotice}>
                If you lose this key, your world cannot be recovered. There is no reset.
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.submitBtn}
              >
                {isSubmitting ? 'Entering stillness…' : 'ENTER STILL →'}
              </button>

              {isFirebaseConfigured && !firebaseUser && (
                <>
                  <div className={styles.orDivider}>
                    <span>or</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLink}
                    disabled={googleLoading || isSubmitting}
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
                </>
              )}
            </form>
          )}

          {firebaseUser && (
            <button
              type="button"
              onClick={logout}
              className={styles.signOutLink}
            >
              Sign out of Cloud
            </button>
          )}
        </div>
      </div>
    </>
  );
};
