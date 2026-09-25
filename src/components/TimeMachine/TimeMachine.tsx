import React, { useState, useMemo } from 'react';
import { useVault } from '../../context/VaultContext';
import styles from './TimeMachine.module.css';

export const TimeMachine: React.FC = () => {
  const { moments, setSelectedMoment, setCurrentLocation } = useVault();

  // Extract unique chronological months from moments
  const monthsData = useMemo(() => {
    const map = new Map<string, { label: string; date: Date; count: number }>();

    // If no moments, provide recent 6 months as empty timeline
    if (moments.length === 0) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString([], { month: 'short', year: 'numeric' }).toUpperCase();
        map.set(key, { label, date: d, count: 0 });
      }
    } else {
      // Sort oldest to newest
      const sorted = [...moments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      sorted.forEach((m) => {
        const d = new Date(m.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString([], { month: 'short', year: 'numeric' }).toUpperCase();
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, { label, date: d, count: 1 });
        }
      });
    }

    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      label: val.label,
      date: val.date,
      count: val.count,
    }));
  }, [moments]);

  const [activeIndex, setActiveIndex] = useState<number>(Math.max(0, monthsData.length - 1));

  const activeMonth = monthsData[activeIndex];

  // Moments filtered by active selected month
  const filteredMoments = useMemo(() => {
    if (!activeMonth) return [];
    return moments.filter((m) => {
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === activeMonth.key;
    });
  }, [moments, activeMonth]);

  return (
    <div className={styles.timeMachineContainer}>
      <div style={{ height: '70px' }} />

      <header className={styles.header}>
        <h1 className={styles.title}>TIME MACHINE</h1>
        <p className={styles.subtitle}>
          Scrub through seasons of your memory.
        </p>
      </header>

      {/* Scrubbable Timeline Ribbon */}
      <div className={styles.timelineScrubber}>
        <div className={styles.ribbonTrack}>
          {monthsData.map((item, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={item.key}
                onClick={() => setActiveIndex(idx)}
                className={`${styles.monthNode} ${isSelected ? styles.selectedMonth : ''}`}
                aria-label={`Scrub to ${item.label}`}
              >
                <span className={styles.monthLabel}>{item.label}</span>
                <span className={styles.traceIndicator}>
                  {item.count > 0 ? `${item.count} ·` : '—'}
                </span>
                {isSelected && <div className={styles.sliderPointer} />}
              </button>
            );
          })}
        </div>

        {/* Range slider for smooth fluid thumb scrubbing */}
        <input
          type="range"
          min={0}
          max={Math.max(0, monthsData.length - 1)}
          value={activeIndex}
          onChange={(e) => setActiveIndex(Number(e.target.value))}
          className={styles.rangeInput}
          aria-label="Timeline scrubber range"
        />
      </div>

      {/* Active Epoch Display */}
      <div className={styles.epochSummary}>
        <h2 className={styles.epochTitle}>{activeMonth?.label}</h2>
        <span className={styles.epochCount}>
          {filteredMoments.length} {filteredMoments.length === 1 ? 'moment' : 'moments'} preserved
        </span>
      </div>

      {/* Filtered Moments list */}
      <main className={styles.momentsStream}>
        {filteredMoments.length === 0 ? (
          <div className={styles.emptyEpoch}>
            <p>No traces were left during this time.</p>
          </div>
        ) : (
          filteredMoments.map((moment) => {
            const d = new Date(moment.createdAt);
            const dateStr = d.toLocaleDateString([], {
              day: 'numeric',
              month: 'long',
            });
            const timeStr = d.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <article
                key={moment.id}
                onClick={() => {
                  setSelectedMoment(moment);
                  setCurrentLocation('moments');
                }}
                className={styles.streamItem}
              >
                <div className={styles.itemHeader}>
                  <span>{dateStr}</span>
                  <span className={styles.dot}>·</span>
                  <span>{timeStr}</span>
                </div>
                <p className={styles.itemProse}>“{moment.content}”</p>
                {moment.emotions && moment.emotions.length > 0 && (
                  <div className={styles.itemEmotions}>
                    {moment.emotions.join(' · ')}
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
};
