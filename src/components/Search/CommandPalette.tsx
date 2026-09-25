import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVault } from '../../context/VaultContext';
import type { Moment } from '../../types';
import styles from './Search.module.css';

export const CommandPalette: React.FC = () => {
  const { moments, searchOpen, setSearchOpen, setSelectedMoment, setCurrentLocation } = useVault();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const results: Moment[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    return moments.filter((m) => {
      const contentMatch = m.content.toLowerCase().includes(q);
      const emotionMatch = m.emotions?.some((e) => e.toLowerCase().includes(q));
      const tagMatch = m.tags?.some((t) => t.toLowerCase().includes(q));
      const dateStr = new Date(m.createdAt).toLocaleDateString([], {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).toLowerCase();
      const dateMatch = dateStr.includes(q);

      return contentMatch || emotionMatch || tagMatch || dateMatch;
    });
  }, [moments, query]);

  if (!searchOpen) return null;

  const handleSelect = (m: Moment) => {
    setSelectedMoment(m);
    setCurrentLocation('moments');
    setSearchOpen(false);
  };

  return (
    <div
      className={styles.overlay}
      onClick={() => setSearchOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <span className={styles.searchIcon}>✦</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="find something in your memory…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search moments"
          />
          <button
            onClick={() => setSearchOpen(false)}
            className={styles.escBtn}
          >
            ESC
          </button>
        </div>

        <div className={styles.resultsContainer}>
          {query.trim() && results.length === 0 && (
            <div className={styles.noResults}>
              <span>No traces matched “{query}”</span>
            </div>
          )}

          {results.map((moment) => {
            const d = new Date(moment.createdAt);
            const dateFormatted = d.toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={moment.id}
                onClick={() => handleSelect(moment)}
                className={styles.resultItem}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelect(moment);
                }}
              >
                <div className={styles.resultDate}>{dateFormatted}</div>
                <div className={styles.resultExcerpt}>
                  “{moment.content.slice(0, 140)}
                  {moment.content.length > 140 ? '…' : ''}”
                </div>
                {moment.emotions && moment.emotions.length > 0 && (
                  <div className={styles.resultEmotions}>
                    {moment.emotions.join(' · ')}
                  </div>
                )}
              </div>
            );
          })}

          {!query.trim() && (
            <div className={styles.emptyHint}>
              <span>Type to search across writing, dates, and emotions.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
