import React from 'react';
import { useVault } from '../../context/VaultContext';
import type { ViewLocation } from '../../types';
import styles from './Navigation.module.css';

export const Navigation: React.FC = () => {
  const {
    currentLocation,
    setCurrentLocation,
    lockVault,
    setSearchOpen,
    setSettingsOpen,
    moments,
    futureLetters,
  } = useVault();

  // Check if any letters are waiting to be opened
  const now = new Date().toISOString();
  const hasWaitingLetter = futureLetters.some((l) => !l.revealed && l.revealAt <= now);

  const navItems: { id: ViewLocation; label: string; count?: number }[] = [
    { id: 'world', label: 'WORLD' },
    { id: 'moments', label: 'MOMENTS', count: moments.length },
    { id: 'sky', label: 'SKY' },
    { id: 'timemachine', label: 'TIME' },
    { id: 'thennow', label: 'THEN / NOW' },
    { id: 'future', label: 'FUTURE', count: hasWaitingLetter ? 1 : undefined },
  ];

  return (
    <nav className={styles.navContainer} aria-label="Sanctuary locations">
      <div className={styles.navInner}>
        {/* Left: Sanctuary Wordmark / Home anchor */}
        <button
          onClick={() => setCurrentLocation('world')}
          className={styles.wordmarkBtn}
          aria-label="STILL home"
        >
          <span className={styles.wordmark}>STILL</span>
        </button>

        {/* Center: Locations within the world */}
        <div className={styles.locationsList}>
          {navItems.map((item) => {
            const isActive = currentLocation === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentLocation(item.id)}
                className={`${styles.locationBtn} ${isActive ? styles.activeLocation : ''}`}
              >
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className={styles.badge}>{item.count}</span>
                )}
                {isActive && <div className={styles.activeIndicator} />}
              </button>
            );
          })}
        </div>

        {/* Right: Write quick action + Search + Settings + Lock */}
        <div className={styles.actionsGroup}>
          {currentLocation !== 'write' && (
            <button
              onClick={() => setCurrentLocation('write')}
              className={styles.writeQuickBtn}
              aria-label="Write a moment"
            >
              <span className={styles.starGlyph}>✦</span>
              <span>WRITE</span>
            </button>
          )}

          <button
            onClick={() => setSearchOpen(true)}
            className={styles.toolBtn}
            title="Search (⌘K or Ctrl+K)"
            aria-label="Search moments"
          >
            <span className={styles.toolLabel}>FIND</span>
            <span className={styles.keyHint}>⌘K</span>
          </button>

          <button
            onClick={() => setSettingsOpen(true)}
            className={styles.toolBtn}
            title="Settings"
            aria-label="Settings"
          >
            <span className={styles.toolLabel}>SANCTUARY</span>
          </button>

          <button
            onClick={lockVault}
            className={styles.lockBtn}
            title="Lock STILL"
            aria-label="Lock STILL"
          >
            <span>LOCK</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
