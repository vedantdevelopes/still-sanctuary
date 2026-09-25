import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import type { FutureLetter } from '../../types';
import styles from './Future.module.css';

export const FutureLetters: React.FC = () => {
  const { futureLetters, addFutureLetter } = useVault();
  const [isWriting, setIsWriting] = useState(false);
  const [content, setContent] = useState('');
  const [timingChoice, setTimingChoice] = useState<
    'tomorrow' | 'next_week' | 'next_month' | 'next_year' | 'custom'
  >('next_month');
  const [customDate, setCustomDate] = useState<string>('');
  const [isSealing, setIsSealing] = useState(false);
  const [selectedLetterToOpen, setSelectedLetterToOpen] = useState<FutureLetter | null>(null);

  const nowIso = new Date().toISOString();

  const handleSeal = async () => {
    if (!content.trim() || isSealing) return;

    setIsSealing(true);
    const date = new Date();

    if (timingChoice === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    } else if (timingChoice === 'next_week') {
      date.setDate(date.getDate() + 7);
    } else if (timingChoice === 'next_month') {
      date.setMonth(date.getMonth() + 1);
    } else if (timingChoice === 'next_year') {
      date.setFullYear(date.getFullYear() + 1);
    } else if (timingChoice === 'custom' && customDate) {
      const parsed = new Date(customDate);
      if (!isNaN(parsed.getTime())) {
        date.setTime(parsed.getTime());
      }
    }

    try {
      await addFutureLetter({
        content: content.trim(),
        revealAt: date.toISOString(),
      });
      setContent('');
      setIsWriting(false);
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <div className={styles.futureContainer}>
      <div style={{ height: '70px' }} />

      <header className={styles.header}>
        <h1 className={styles.title}>LETTERS TO FUTURE ME</h1>
        <p className={styles.subtitle}>
          Words sealed in time, waiting for you down the road.
        </p>

        {!isWriting && (
          <button
            onClick={() => setIsWriting(true)}
            className={styles.writeLetterBtn}
          >
            ✦ WRITE TO FUTURE ME
          </button>
        )}
      </header>

      {/* Writing / Sealing Form */}
      {isWriting && (
        <section className={styles.composeCard}>
          <div className={styles.composeHeader}>
            <span>DELIVER TO ME WHEN:</span>
            <div className={styles.timingPills}>
              {(
                [
                  ['tomorrow', 'Tomorrow'],
                  ['next_week', 'Next Week'],
                  ['next_month', 'Next Month'],
                  ['next_year', 'Next Year'],
                  ['custom', 'Custom Date'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTimingChoice(val)}
                  className={`${styles.timingPill} ${
                    timingChoice === val ? styles.selectedPill : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {timingChoice === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className={styles.customDateInput}
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write to the one who will open this…"
            className={styles.letterTextarea}
            rows={7}
            autoFocus
          />

          <div className={styles.composeFooter}>
            <button
              onClick={() => setIsWriting(false)}
              className={styles.subtleCancelBtn}
            >
              DISCARD
            </button>
            <button
              onClick={handleSeal}
              disabled={!content.trim() || isSealing}
              className={styles.sealBtn}
            >
              {isSealing ? 'SEALING…' : 'SEAL THIS LETTER'}
            </button>
          </div>
        </section>
      )}

      {/* Existing Sealed & Unsealed Letters */}
      <main className={styles.lettersGrid}>
        {futureLetters.length === 0 && !isWriting ? (
          <div className={styles.emptyFuture}>
            <p>No letters are currently traveling through time.</p>
          </div>
        ) : (
          futureLetters.map((letter) => {
            const isReady = letter.revealAt <= nowIso;
            const revealDate = new Date(letter.revealAt).toLocaleDateString([], {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            const createdDate = new Date(letter.createdAt).toLocaleDateString([], {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={letter.id}
                onClick={() => isReady && setSelectedLetterToOpen(letter)}
                className={`${styles.letterEnvelope} ${
                  isReady ? styles.readyEnvelope : styles.sealedEnvelope
                }`}
                style={{ cursor: isReady ? 'pointer' : 'default' }}
              >
                <div className={styles.envelopeStatus}>
                  {isReady ? (
                    <span className={styles.readyTag}>✦ A LETTER IS WAITING</span>
                  ) : (
                    <span className={styles.sealedTag}>SEALED UNTIL</span>
                  )}
                </div>

                <div className={styles.revealDateDisplay}>{revealDate}</div>

                <div className={styles.envelopeWrittenDate}>
                  Written on {createdDate}
                </div>

                {!isReady && (
                  <div className={styles.sealedMessage}>
                    This letter remains encrypted and locked until the appointed day.
                  </div>
                )}
                {isReady && (
                  <div className={styles.openPrompt}>
                    Click to gently unseal your words →
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Letter Reading Modal */}
      {selectedLetterToOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedLetterToOpen(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.letterModalHeader}>
              <div>
                <span className={styles.letterArrivedTag}>UNSEALED FROM THE PAST</span>
                <div className={styles.letterModalDate}>
                  Penned on{' '}
                  {new Date(selectedLetterToOpen.createdAt).toLocaleDateString([], {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <button
                onClick={() => setSelectedLetterToOpen(null)}
                className={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.letterProse}>
              {selectedLetterToOpen.content}
            </div>

            <div className={styles.letterModalFooter}>
              <span>You were there. Now you are here.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
