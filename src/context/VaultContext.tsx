import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import type { Moment, FutureLetter, VaultMetadata, ViewLocation } from '../types';
import {
  isVaultInitialized,
  getVaultMetadata,
  initializeVault,
  unlockVault,
  saveMoment,
  loadAllMoments,
  deleteMoment,
  saveFutureLetter,
  loadAllFutureLetters,
  updateVaultPreferences,
  changePassword,
  deleteEntireWorld,
} from '../lib/storage/vaultStorage';
import { isFirebaseConfigured } from '../lib/firebase/config';
import {
  loginWithGoogle as fbLoginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  registerWithEmail as fbRegisterWithEmail,
  logoutUser as fbLogoutUser,
  subscribeToAuthState,
} from '../lib/firebase/auth';
import {
  fetchCloudMetadata,
  saveCloudMetadata,
  saveCloudMoment,
  deleteCloudMoment,
  saveCloudFutureLetter,
  syncSanctuaryWithCloud,
  deleteCloudSanctuary,
} from '../lib/firebase/sync';
import { getDB } from '../lib/storage/db';

interface VaultContextType {
  isInitialized: boolean | null;
  isUnlocked: boolean;
  isEntering: boolean;
  metadata: VaultMetadata | null;
  moments: Moment[];
  futureLetters: FutureLetter[];
  currentLocation: ViewLocation;
  setCurrentLocation: (loc: ViewLocation) => void;
  selectedMoment: Moment | null;
  setSelectedMoment: (m: Moment | null) => void;
  theme: 'dark' | 'light' | 'system';
  setTheme: (t: 'dark' | 'light' | 'system') => Promise<void>;
  reducedMotion: boolean;
  setReducedMotion: (r: boolean) => Promise<void>;
  autoLockMinutes: number;
  setAutoLockMinutes: (mins: number) => Promise<void>;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  initialize: (password: string, email?: string) => Promise<void>;
  unlock: (password: string) => Promise<{ success: boolean; error?: string }>;
  lockVault: () => void;
  restoreFromCloudWithEmail: (email: string, keyOrPassword: string) => Promise<{ success: boolean; error?: string }>;
  restoreFromCloudWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  addMoment: (momentData: {
    content: string;
    timezone: string;
    wordCount: number;
    characterCount: number;
    emotions: string[];
    intensity?: number;
    tags: string[];
    reflection?: 'lighter' | 'same' | 'different' | 'unknown';
    duration?: number;
  }) => Promise<Moment>;
  editMoment: (id: string, updates: Partial<Moment>) => Promise<void>;
  removeMoment: (id: string) => Promise<void>;
  addFutureLetter: (data: { content: string; revealAt: string; emotions?: string[] }) => Promise<FutureLetter>;
  updatePassword: (oldPw: string, newPw: string) => Promise<void>;
  resetAndWipe: () => Promise<void>;

  // Firebase integration state & actions
  firebaseUser: User | null;
  isFirebaseConfigured: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
  refreshVaultStatus: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);

  // Active in-memory decrypted state (never written to localStorage or cloud unencrypted)
  const activeKeyRef = useRef<CryptoKey | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [futureLetters, setFutureLetters] = useState<FutureLetter[]>([]);

  // Navigation & UI state
  const [currentLocation, setCurrentLocation] = useState<ViewLocation>('world');
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>('dark');
  const [reducedMotion, setReducedMotionState] = useState<boolean>(false);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(15);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Firebase state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Auto-lock inactivity tracker
  const lastActivityRef = useRef<number>(Date.now());
  const autoLockTimerRef = useRef<number | null>(null);

  // Clear memory and lock vault
  const lockVault = useCallback(() => {
    activeKeyRef.current = null;
    setMoments([]);
    setFutureLetters([]);
    setSelectedMoment(null);
    setIsUnlocked(false);
    setIsEntering(false);
    setCurrentLocation('world');
    setSearchOpen(false);
    setSettingsOpen(false);
  }, []);

  // Check initial database status on app mount
  const refreshVaultStatus = useCallback(async () => {
    try {
      const init = await isVaultInitialized();
      setIsInitialized(init);
      if (init) {
        const meta = await getVaultMetadata();
        if (meta) {
          setMetadata(meta);
          setThemeState(meta.theme || 'dark');
          setAutoLockMinutesState(meta.autoLockMinutes ?? 15);
          setReducedMotionState(Boolean(meta.motionReduced));
        }
      }
    } catch {
      setIsInitialized(false);
    }
  }, []);

  useEffect(() => {
    refreshVaultStatus();
  }, [refreshVaultStatus]);

  // Subscribe to Firebase Auth State
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      setFirebaseUser(user);
      if (user) {
        // If user is authenticated, check if they have a cloud vault
        try {
          const localInit = await isVaultInitialized();
          if (!localInit) {
            // Local device has no vault, see if cloud has one for this user
            const cloudMeta = await fetchCloudMetadata(user.uid);
            if (cloudMeta) {
              const localDB = await getDB();
              await localDB.put('meta', cloudMeta, 'vault_metadata');
              await syncSanctuaryWithCloud(user.uid);
              await refreshVaultStatus();
            }
          } else {
            // Both exist, sync in background
            syncSanctuaryWithCloud(user.uid).then(() => {
              setLastSyncedAt(new Date());
            }).catch(() => {});
          }
        } catch (err) {
          console.warn('[STILL] Cloud check on auth change failed:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [refreshVaultStatus]);

  // Theme application to document
  useEffect(() => {
    const applyTheme = (t: 'dark' | 'light' | 'system') => {
      let resolved = t;
      if (t === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolved);
    };

    applyTheme(theme);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  // Inactivity auto-lock listener
  useEffect(() => {
    if (!isUnlocked || autoLockMinutes <= 0) {
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
      return;
    }

    const onUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }));

    autoLockTimerRef.current = window.setInterval(() => {
      const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
      if (elapsedMinutes >= autoLockMinutes) {
        lockVault();
      }
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, onUserActivity));
      if (autoLockTimerRef.current) {
        clearInterval(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    };
  }, [isUnlocked, autoLockMinutes, lockVault]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (isUnlocked && currentLocation !== 'write') {
          e.preventDefault();
          setSearchOpen((prev) => !prev);
        }
      }
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        if (settingsOpen) setSettingsOpen(false);
        if (selectedMoment && currentLocation !== 'moments') setSelectedMoment(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlocked, currentLocation, searchOpen, settingsOpen, selectedMoment]);

  // Initialize vault with new key (and optional cloud email registration)
  const initialize = async (password: string, email?: string) => {
    let currentUser = firebaseUser;
    if (email && isFirebaseConfigured) {
      try {
        currentUser = await fbRegisterWithEmail(email, password);
        if (currentUser) setFirebaseUser(currentUser);
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          currentUser = await fbLoginWithEmail(email, password);
          if (currentUser) setFirebaseUser(currentUser);
        } else {
          throw authErr;
        }
      }
    }

    const { key, metadata: newMeta } = await initializeVault(password);
    activeKeyRef.current = key;
    setMetadata(newMeta);
    setIsInitialized(true);
    setIsEntering(true);
    setIsUnlocked(true);
    setMoments([]);
    setFutureLetters([]);

    // If signed in, sync newly created vault metadata to Cloud Firestore
    const userToSync = currentUser || firebaseUser;
    if (userToSync) {
      saveCloudMetadata(userToSync.uid, newMeta).catch((e) =>
        console.warn('[STILL] Could not push metadata to cloud:', e)
      );
    }

    // Entrance sequence duration
    setTimeout(() => {
      setIsEntering(false);
    }, 2400);
  };

  // Restore world from cloud via Email & Master Password
  const restoreFromCloudWithEmail = async (
    email: string,
    keyOrPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured) {
      return { success: false, error: 'Firebase is not configured. Please add your credentials.' };
    }
    try {
      // 1. Authenticate with Firebase Auth
      const user = await fbLoginWithEmail(email, keyOrPassword);
      if (!user) {
        return { success: false, error: 'Authentication failed. Please check your credentials.' };
      }
      setFirebaseUser(user);

      // 2. Fetch cloud metadata
      const cloudMeta = await fetchCloudMetadata(user.uid);
      if (!cloudMeta) {
        return {
          success: false,
          error: 'Signed in, but no saved sanctuary was found for this account. You can create a new world to begin.',
        };
      }

      // 3. Save cloud metadata to local IndexedDB
      const localDB = await getDB();
      await localDB.put('meta', cloudMeta, 'vault_metadata');

      // 4. Download and sync all encrypted moments and letters from Firestore
      await syncSanctuaryWithCloud(user.uid);
      setLastSyncedAt(new Date());

      // 5. Unlock with key
      const unlockRes = await unlockVault(keyOrPassword);
      if (!unlockRes.success || !unlockRes.key) {
        setMetadata(cloudMeta);
        setIsInitialized(true);
        return {
          success: false,
          error: "Cloud world synced, but that isn't the master key to decrypt your memories.",
        };
      }

      // 6. Decrypt and load in memory
      activeKeyRef.current = unlockRes.key;
      setMetadata(cloudMeta);
      setThemeState(cloudMeta.theme || 'dark');
      setAutoLockMinutesState(cloudMeta.autoLockMinutes ?? 15);
      setReducedMotionState(Boolean(cloudMeta.motionReduced));

      const loadedMoments = await loadAllMoments(unlockRes.key);
      const loadedLetters = await loadAllFutureLetters(unlockRes.key);
      setMoments(loadedMoments);
      setFutureLetters(loadedLetters);

      setIsInitialized(true);
      setIsUnlocked(true);
      setIsEntering(true);

      setTimeout(() => {
        setIsEntering(false);
      }, 2400);

      return { success: true };
    } catch (err: any) {
      let msg = err.message || 'Failed to restore world from cloud.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        msg = 'Incorrect email or key.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Access temporarily disabled due to many attempts. Try again later.';
      }
      return { success: false, error: msg };
    }
  };

  // Restore world from cloud via Google sign-in
  const restoreFromCloudWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured) {
      return { success: false, error: 'Firebase is not configured.' };
    }
    try {
      const user = await fbLoginWithGoogle();
      if (!user) {
        return { success: false, error: 'Google sign-in was cancelled.' };
      }
      setFirebaseUser(user);

      const cloudMeta = await fetchCloudMetadata(user.uid);
      if (!cloudMeta) {
        return {
          success: false,
          error: 'Signed in as ' + (user.email || 'user') + ', but no cloud world exists yet. Create your key to start.',
        };
      }

      const localDB = await getDB();
      await localDB.put('meta', cloudMeta, 'vault_metadata');

      await syncSanctuaryWithCloud(user.uid);
      setLastSyncedAt(new Date());

      // Transition to lock screen with cloud metadata ready
      setMetadata(cloudMeta);
      setIsInitialized(true);
      setThemeState(cloudMeta.theme || 'dark');
      setAutoLockMinutesState(cloudMeta.autoLockMinutes ?? 15);
      setReducedMotionState(Boolean(cloudMeta.motionReduced));

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Google sign-in failed.';
      return { success: false, error: msg };
    }
  };

  // Manual or automatic Cloud Sync
  const syncWithCloud = useCallback(async () => {
    if (!firebaseUser || !isFirebaseConfigured) return;
    setIsSyncing(true);
    try {
      await syncSanctuaryWithCloud(firebaseUser.uid);
      setLastSyncedAt(new Date());

      // If unlocked, reload decrypted moments to reflect any changes synced down
      if (activeKeyRef.current) {
        const loadedMoments = await loadAllMoments(activeKeyRef.current);
        const loadedLetters = await loadAllFutureLetters(activeKeyRef.current);
        setMoments(loadedMoments);
        setFutureLetters(loadedLetters);
      }
    } catch (err) {
      console.warn('[STILL] Cloud sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [firebaseUser]);

  // Unlock existing vault
  const unlock = async (password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await unlockVault(password);
    if (!result.success || !result.key || !result.metadata) {
      return { success: false, error: result.error || "That isn't the key." };
    }

    activeKeyRef.current = result.key;
    setMetadata(result.metadata);
    setThemeState(result.metadata.theme || 'dark');
    setAutoLockMinutesState(result.metadata.autoLockMinutes ?? 15);
    setReducedMotionState(Boolean(result.metadata.motionReduced));

    // Decrypt all data in memory
    const loadedMoments = await loadAllMoments(result.key);
    const loadedLetters = await loadAllFutureLetters(result.key);

    setMoments(loadedMoments);
    setFutureLetters(loadedLetters);

    setIsEntering(true);
    setIsUnlocked(true);

    setTimeout(() => {
      setIsEntering(false);
    }, 2400);

    // Trigger cloud sync in background if signed in
    if (firebaseUser) {
      syncWithCloud();
    }

    return { success: true };
  };

  // Moment actions
  const addMoment = async (data: {
    content: string;
    timezone: string;
    wordCount: number;
    characterCount: number;
    emotions: string[];
    intensity?: number;
    tags: string[];
    reflection?: 'lighter' | 'same' | 'different' | 'unknown';
    duration?: number;
  }): Promise<Moment> => {
    if (!activeKeyRef.current) throw new Error('Vault is locked');

    const newMoment: Moment = {
      id: crypto.randomUUID(),
      content: data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timezone: data.timezone,
      wordCount: data.wordCount,
      characterCount: data.characterCount,
      emotions: data.emotions,
      intensity: data.intensity,
      tags: data.tags,
      reflection: data.reflection,
      duration: data.duration,
      archived: false,
    };

    const record = await saveMoment(newMoment, activeKeyRef.current);
    setMoments((prev) => [newMoment, ...prev]);

    // Zero-knowledge cloud sync
    if (firebaseUser) {
      saveCloudMoment(firebaseUser.uid, record).then(() => setLastSyncedAt(new Date())).catch(() => {});
    }

    return newMoment;
  };

  const editMoment = async (id: string, updates: Partial<Moment>): Promise<void> => {
    if (!activeKeyRef.current) throw new Error('Vault is locked');
    const existing = moments.find((m) => m.id === id);
    if (!existing) return;

    const updated: Moment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const record = await saveMoment(updated, activeKeyRef.current);
    setMoments((prev) => prev.map((m) => (m.id === id ? updated : m)));
    if (selectedMoment?.id === id) {
      setSelectedMoment(updated);
    }

    // Zero-knowledge cloud sync
    if (firebaseUser) {
      saveCloudMoment(firebaseUser.uid, record).then(() => setLastSyncedAt(new Date())).catch(() => {});
    }
  };

  const removeMoment = async (id: string): Promise<void> => {
    if (!activeKeyRef.current) throw new Error('Vault is locked');
    await deleteMoment(id);
    setMoments((prev) => prev.filter((m) => m.id !== id));
    if (selectedMoment?.id === id) {
      setSelectedMoment(null);
    }

    // Zero-knowledge cloud sync
    if (firebaseUser) {
      deleteCloudMoment(firebaseUser.uid, id).then(() => setLastSyncedAt(new Date())).catch(() => {});
    }
  };

  const addFutureLetter = async (data: {
    content: string;
    revealAt: string;
    emotions?: string[];
  }): Promise<FutureLetter> => {
    if (!activeKeyRef.current) throw new Error('Vault is locked');

    const letter: FutureLetter = {
      id: crypto.randomUUID(),
      content: data.content,
      createdAt: new Date().toISOString(),
      revealAt: data.revealAt,
      revealed: false,
      emotions: data.emotions,
    };

    const record = await saveFutureLetter(letter, activeKeyRef.current);
    setFutureLetters((prev) => [...prev, letter]);

    // Zero-knowledge cloud sync
    if (firebaseUser) {
      saveCloudFutureLetter(firebaseUser.uid, record).then(() => setLastSyncedAt(new Date())).catch(() => {});
    }

    return letter;
  };

  // Preferences
  const setTheme = async (t: 'dark' | 'light' | 'system') => {
    setThemeState(t);
    if (isInitialized) {
      const updated = await updateVaultPreferences({ theme: t });
      setMetadata(updated);
      if (firebaseUser) {
        saveCloudMetadata(firebaseUser.uid, updated).catch(() => {});
      }
    }
  };

  const setReducedMotion = async (r: boolean) => {
    setReducedMotionState(r);
    if (isInitialized) {
      const updated = await updateVaultPreferences({ motionReduced: r });
      setMetadata(updated);
      if (firebaseUser) {
        saveCloudMetadata(firebaseUser.uid, updated).catch(() => {});
      }
    }
  };

  const setAutoLockMinutes = async (mins: number) => {
    setAutoLockMinutesState(mins);
    if (isInitialized) {
      const updated = await updateVaultPreferences({ autoLockMinutes: mins });
      setMetadata(updated);
      if (firebaseUser) {
        saveCloudMetadata(firebaseUser.uid, updated).catch(() => {});
      }
    }
  };

  // Change master password
  const updatePassword = async (oldPw: string, newPw: string) => {
    if (!activeKeyRef.current) throw new Error('Vault is locked');
    const test = await unlockVault(oldPw);
    if (!test.success) throw new Error("Current key is incorrect.");

    const { newKey, newMetadata } = await changePassword(activeKeyRef.current, newPw);
    activeKeyRef.current = newKey;
    setMetadata(newMetadata);

    if (firebaseUser) {
      await syncSanctuaryWithCloud(firebaseUser.uid);
    }
  };

  // Delete everything
  const resetAndWipe = async () => {
    if (firebaseUser) {
      await deleteCloudSanctuary(firebaseUser.uid);
    }
    await deleteEntireWorld();
    lockVault();
    setIsInitialized(false);
    setMetadata(null);
  };

  // Firebase Auth wrappers
  const loginWithGoogle = async () => {
    const user = await fbLoginWithGoogle();
    if (user) {
      setFirebaseUser(user);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const user = await fbLoginWithEmail(email, pass);
    if (user) {
      setFirebaseUser(user);
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const user = await fbRegisterWithEmail(email, pass);
    if (user) {
      setFirebaseUser(user);
    }
  };

  const logout = async () => {
    await fbLogoutUser();
    setFirebaseUser(null);
  };

  return (
    <VaultContext.Provider
      value={{
        isInitialized,
        isUnlocked,
        isEntering,
        metadata,
        moments,
        futureLetters,
        currentLocation,
        setCurrentLocation,
        selectedMoment,
        setSelectedMoment,
        theme,
        setTheme,
        reducedMotion,
        setReducedMotion,
        autoLockMinutes,
        setAutoLockMinutes,
        searchOpen,
        setSearchOpen,
        settingsOpen,
        setSettingsOpen,
        initialize,
        unlock,
        lockVault,
        restoreFromCloudWithEmail,
        restoreFromCloudWithGoogle,
        addMoment,
        editMoment,
        removeMoment,
        addFutureLetter,
        updatePassword,
        resetAndWipe,
        firebaseUser,
        isFirebaseConfigured,
        isSyncing,
        lastSyncedAt,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        syncWithCloud,
        refreshVaultStatus,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = (): VaultContextType => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
