import React, { useState, useEffect } from 'react';
import { useVault } from '../../context/VaultContext';
import styles from './World.module.css';

export const WorldHome: React.FC = () => {
  const { moments, futureLetters, setCurrentLocation } = useVault();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check waiting future letters
  const nowIso = new Date().toISOString();
  const waitingLetter = futureLetters.find((l) => !l.revealed && l.revealAt <= nowIso);

  // Contemplative thoughts depending on time of day
  const hour = new Date().getHours();
  const contemplation =
    hour >= 22 || hour < 5
      ? '“The world outside is sleeping. Here, nothing is demanded of you.”'
      : hour < 12
      ? '“Morning stillness. Enter without haste.”'
      : hour < 18
      ? '“A quiet pause within the noise of the day.”'
      : '“Evening falls. Lay down what you have carried.”';

  const isWorldEmpty = moments.length === 0;

  return (
    <div className={styles.worldHome}>
      {/* Top spacing offset for floating navigation */}
      <div style={{ height: '60px' }} />

      {/* Central Sanctuary Focus */}
      <main className={styles.centerSanctuary}>
        <div className={styles.contextTag}>
          <span>SANCTUARY · OFFLINE & ENCRYPTED</span>
        </div>

        <div className={styles.timeDisplay} aria-label={`Current time ${timeStr}`}>
          {timeStr}
        </div>

        <div className={styles.dateDisplay}>{dateStr}</div>

        <blockquote className={styles.whisperQuote}>{contemplation}</blockquote>

        {/* The Solitary Primary Action: ✦ WRITE */}
        <div className={styles.writeActionContainer}>
          <button
            onClick={() => setCurrentLocation('write')}
            className={styles.writeBtn}
            aria-label="Start writing a moment"
          >
            <span className={styles.writeBtnActiveGlance}>✦</span>
            <span>WRITE</span>
          </button>
        </div>

        {/* Empty World Guidance */}
        {isWorldEmpty && (
          <div className={styles.emptyWorldState}>
            <span className={styles.emptyTitle}>YOUR WORLD IS EMPTY</span>
            <span className={styles.emptySubtitle}>
              That's okay. When you are ready, leave your first trace.
            </span>
          </div>
        )}
      </main>

      {/* Bottom Atmosphere Bar */}
      <footer className={styles.bottomBar}>
        <div className={styles.statusWhisper}>
          <span className={styles.statusDot} />
          <span>Sanctuary active · 0 trackers permitted · {moments.length} {moments.length === 1 ? 'trace' : 'traces'} of you</span>
        </div>

        {waitingLetter && (
          <button
            onClick={() => setCurrentLocation('future')}
            className={styles.waitingLetterNotification}
          >
            ✦ A LETTER IS WAITING
          </button>
        )}
      </footer>
    </div>
  );
};
