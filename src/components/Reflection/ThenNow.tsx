import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import type { Moment } from '../../types';
import styles from './ThenNow.module.css';

export const ThenNow: React.FC = () => {
  const { moments } = useVault();

  // Pick oldest moment as default 'THEN' and newest as 'NOW'
  const [thenIndex, setThenIndex] = useState<number>(
    moments.length > 1 ? moments.length - 1 : 0
  );
  const [nowIndex, setNowIndex] = useState<number>(0);

  const thenMoment: Moment | undefined = moments[thenIndex];
  const nowMoment: Moment | undefined = moments[nowIndex];

  if (moments.length < 2) {
    return (
      <div className={styles.container}>
        <div style={{ height: '70px' }} />
        <header className={styles.header}>
          <h1 className={styles.title}>THEN / NOW</h1>
          <p className={styles.subtitle}>
            Preserve at least two moments to place them side by side in silent reflection.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div style={{ height: '70px' }} />

      <header className={styles.header}>
        <h1 className={styles.title}>THEN / NOW</h1>
        <p className={styles.subtitle}>
          Two points in time. Your own words. No judgment, no analysis.
        </p>
      </header>

      <main className={styles.splitComparison}>
        {/* THEN Column */}
        <section className={styles.column}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTag}>THEN</span>
            <select
              value={thenIndex}
              onChange={(e) => setThenIndex(Number(e.target.value))}
              className={styles.momentSelect}
              aria-label="Select earlier moment"
            >
              {moments.map((m, idx) => (
                <option key={m.id} value={idx}>
                  {new Date(m.createdAt).toLocaleDateString([], {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  — “{m.content.slice(0, 28)}…”
                </option>
              ))}
            </select>
          </div>

          {thenMoment && (
            <div className={styles.momentCard}>
              <div className={styles.cardTimestamp}>
                {new Date(thenMoment.createdAt).toLocaleDateString([], {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {new Date(thenMoment.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>

              <div className={styles.prose}>{thenMoment.content}</div>

              {thenMoment.emotions && thenMoment.emotions.length > 0 && (
                <div className={styles.emotions}>
                  {thenMoment.emotions.join(' · ')}
                </div>
              )}
            </div>
          )}
        </section>

        <div className={styles.dividerLine} />

        {/* NOW Column */}
        <section className={styles.column}>
          <div className={styles.columnHeader}>
            <span className={styles.columnTag}>NOW</span>
            <select
              value={nowIndex}
              onChange={(e) => setNowIndex(Number(e.target.value))}
              className={styles.momentSelect}
              aria-label="Select recent moment"
            >
              {moments.map((m, idx) => (
                <option key={m.id} value={idx}>
                  {new Date(m.createdAt).toLocaleDateString([], {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  — “{m.content.slice(0, 28)}…”
                </option>
              ))}
            </select>
          </div>

          {nowMoment && (
            <div className={styles.momentCard}>
              <div className={styles.cardTimestamp}>
                {new Date(nowMoment.createdAt).toLocaleDateString([], {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {new Date(nowMoment.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>

              <div className={styles.prose}>{nowMoment.content}</div>

              {nowMoment.emotions && nowMoment.emotions.length > 0 && (
                <div className={styles.emotions}>
                  {nowMoment.emotions.join(' · ')}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
