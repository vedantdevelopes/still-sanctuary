import React from 'react';
import { VaultProvider, useVault } from './context/VaultContext';
import { Entrance } from './components/Auth/Entrance';
import { LockScreen } from './components/Auth/LockScreen';
import { AtmosphericCanvas } from './components/World/AtmosphericCanvas';
import { WorldHome } from './components/World/WorldHome';
import { Navigation } from './components/Layout/Navigation';
import { WritingSpace } from './components/Writing/WritingSpace';
import { MomentsArchive } from './components/Moments/MomentsArchive';
import { MySky } from './components/Sky/MySky';
import { TimeMachine } from './components/TimeMachine/TimeMachine';
import { ThenNow } from './components/Reflection/ThenNow';
import { FutureLetters } from './components/Future/FutureLetters';
import { CommandPalette } from './components/Search/CommandPalette';
import { SettingsModal } from './components/Settings/SettingsModal';
import styles from './App.module.css';

const SanctuaryRoot: React.FC = () => {
  const { isInitialized, isUnlocked, isEntering, currentLocation } = useVault();

  // 1. Initial database probe state
  if (isInitialized === null) {
    return (
      <div className={styles.loadingContainer}>
        <span className={styles.loadingTitle}>STILL</span>
      </div>
    );
  }

  // 2. First-time visitor: Create Master Key
  if (!isInitialized) {
    return (
      <>
        <AtmosphericCanvas />
        <Entrance />
      </>
    );
  }

  // 3. Returning visitor: Lock screen
  if (!isUnlocked) {
    return (
      <>
        <AtmosphericCanvas />
        <LockScreen />
      </>
    );
  }

  // 4. Peaceful Entrance sequence (2.2s door-opening transition)
  if (isEntering) {
    return (
      <div className={styles.entranceSequence}>
        <AtmosphericCanvas />
        <div className={styles.entranceContent}>
          <h1 className={styles.entranceWord}>STILL</h1>
          <p className={styles.entranceSubtitle}>your world awakens</p>
        </div>
      </div>
    );
  }

  // 5. Unlocked Sanctuary: Living world & active locations
  return (
    <div className={styles.sanctuary}>
      {/* Dynamic living particle canvas and horizon in background */}
      <AtmosphericCanvas />

      {/* Floating navigation bar (hidden while in pure distraction-free writing mode) */}
      {currentLocation !== 'write' && <Navigation />}

      {/* Primary views */}
      {currentLocation === 'world' && <WorldHome />}
      {currentLocation === 'write' && <WritingSpace />}
      {currentLocation === 'moments' && <MomentsArchive />}
      {currentLocation === 'sky' && <MySky />}
      {currentLocation === 'timemachine' && <TimeMachine />}
      {currentLocation === 'thennow' && <ThenNow />}
      {currentLocation === 'future' && <FutureLetters />}

      {/* Global Command Search & Settings Modals */}
      <CommandPalette />
      <SettingsModal />
    </div>
  );
};

export function App() {
  return (
    <VaultProvider>
      <SanctuaryRoot />
    </VaultProvider>
  );
}

export default App;
