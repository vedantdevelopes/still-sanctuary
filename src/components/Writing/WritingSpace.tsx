import React, { useState, useEffect, useRef } from 'react';
import { useVault } from '../../context/VaultContext';
import type { Moment } from '../../types';
import { PeacefulExit } from './PeacefulExit';
import styles from './Writing.module.css';

export const WritingSpace: React.FC = () => {
  const { addMoment, setCurrentLocation } = useVault();
  const [content, setContent] = useState('');
  const [savedMoment, setSavedMoment] = useState<Moment | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Date and Time headers
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const dayNumber = now.getDate();
  const monthName = now.toLocaleString('default', { month: 'long' }).toUpperCase();
  const yearNumber = now.getFullYear();
  const dayOfWeek = now.toLocaleString('default', { weekday: 'long' }).toUpperCase();
  const timeFormatted = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Focus textarea on entry and auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSave = async () => {
    if (!content.trim() || isSaving) return;

    setIsSaving(true);
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const chars = content.length;

    try {
      const created = await addMoment({
        content: content.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        wordCount: words,
        characterCount: chars,
        emotions: [],
        tags: [],
        duration: durationSeconds,
      });

      setSavedMoment(created);
    } catch {
      setIsSaving(false);
    }
  };

  // If moment was saved, show peaceful exit
  if (savedMoment) {
    return (
      <PeacefulExit
        moment={savedMoment}
        onReturn={() => {
          setCurrentLocation('world');
        }}
      />
    );
  }

  return (
    <div className={styles.writingContainer}>
      {/* Discreet Header: Date & Time in serene typography */}
      <header className={styles.writingHeader}>
        <div className={styles.dateBlock}>
          <div className={styles.datePrimary}>
            {dayNumber} {monthName} {yearNumber}
          </div>
          <div className={styles.dateSecondary}>
            <span>{dayOfWeek}</span>
            <span className={styles.dotDivider}>·</span>
            <span>{timeFormatted}</span>
          </div>
        </div>

        <button
          onClick={() => setCurrentLocation('world')}
          className={styles.closeBtn}
          aria-label="Discard and return to world"
        >
          RETURN
        </button>
      </header>

      {/* The Central Writing Space */}
      <main className={styles.writingMain}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          placeholder="What's on your mind?"
          className={styles.writingTextarea}
          aria-label="Your thoughts"
          rows={3}
        />
      </main>

      {/* Bottom Quiet Action Bar */}
      <footer className={styles.writingFooter}>
        <div className={styles.quietStatus}>
          {content.trim().length > 0 && <span>Your words remain on this device.</span>}
        </div>

        {content.trim().length > 0 && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveBtn}
          >
            {isSaving ? 'HOLDING…' : 'KEEP THIS MOMENT'}
          </button>
        )}
      </footer>
    </div>
  );
};
