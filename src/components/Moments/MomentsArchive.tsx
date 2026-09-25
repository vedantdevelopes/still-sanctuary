import React, { useState } from 'react';
import { useVault } from '../../context/VaultContext';
import type { Moment } from '../../types';
import styles from './Moments.module.css';

export const MomentsArchive: React.FC = () => {
  const { moments, removeMoment, editMoment, setCurrentLocation } = useVault();
  const [activeMoment, setActiveMoment] = useState<Moment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [momentToDelete, setMomentToDelete] = useState<string | null>(null);

  // Group moments chronologically by Month & Year
  const groupedMoments: { [key: string]: Moment[] } = {};
  moments.forEach((m) => {
    const date = new Date(m.createdAt);
    const monthYear = date
      .toLocaleDateString([], {
        month: 'long',
        year: 'numeric',
      })
      .toUpperCase();

    if (!groupedMoments[monthYear]) {
      groupedMoments[monthYear] = [];
    }
    groupedMoments[monthYear].push(m);
  });

  const handleOpenMoment = (m: Moment) => {
    setActiveMoment(m);
    setEditContent(m.content);
    setIsEditing(false);
    setMomentToDelete(null);
  };

  const handleSaveEdit = async () => {
    if (!activeMoment || !editContent.trim()) return;
    const words = editContent.trim().split(/\s+/).filter(Boolean).length;
    await editMoment(activeMoment.id, {
      content: editContent.trim(),
      wordCount: words,
      characterCount: editContent.length,
    });
    setActiveMoment((prev) => (prev ? { ...prev, content: editContent.trim() } : null));
    setIsEditing(false);
  };

  const handleConfirmDelete = async (id: string) => {
    await removeMoment(id);
    setActiveMoment(null);
    setMomentToDelete(null);
  };

  if (moments.length === 0) {
    return (
      <div className={styles.momentsContainer}>
        <div style={{ height: '60px' }} />
        <div className={styles.emptyArchive}>
          <h2 className={styles.archiveHeader}>MOMENTS</h2>
          <p className={styles.emptyMessage}>
            No moments have been preserved yet.
          </p>
          <button
            onClick={() => setCurrentLocation('write')}
            className={styles.emptyWriteBtn}
          >
            ✦ WRITE YOUR FIRST MOMENT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.momentsContainer}>
      <div style={{ height: '70px' }} />

      <header className={styles.archiveIntro}>
        <h1 className={styles.archiveHeader}>MOMENTS</h1>
        <p className={styles.archiveSubhead}>
          {moments.length} {moments.length === 1 ? 'trace' : 'traces'} of time and feeling
        </p>
      </header>

      {/* Vertical Typographic Composition grouped by month */}
      <main className={styles.timelineList}>
        {Object.entries(groupedMoments).map(([monthGroup, groupMoments]) => (
          <section key={monthGroup} className={styles.monthSection}>
            <div className={styles.monthHeader}>{monthGroup}</div>

            <div className={styles.momentsInMonth}>
              {groupMoments.map((moment) => {
                const date = new Date(moment.createdAt);
                const day = date.getDate();
                const time = date.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <article
                    key={moment.id}
                    onClick={() => handleOpenMoment(moment)}
                    className={styles.momentRow}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleOpenMoment(moment);
                      }
                    }}
                  >
                    <div className={styles.dateCol}>
                      <span className={styles.dayNum}>{day}</span>
                      <span className={styles.timeStr}>{time}</span>
                    </div>

                    <div className={styles.contentCol}>
                      <p className={styles.excerptText}>
                        “{moment.content.slice(0, 240)}
                        {moment.content.length > 240 ? '…' : ''}”
                      </p>

                      <div className={styles.metaRow}>
                        {moment.emotions && moment.emotions.length > 0 && (
                          <div className={styles.emotionsList}>
                            {moment.emotions.map((em) => (
                              <span key={em} className={styles.emotionPill}>
                                {em}
                              </span>
                            ))}
                          </div>
                        )}
                        {moment.reflection && (
                          <span className={styles.reflectionTag}>
                            feeling {moment.reflection}
                          </span>
                        )}
                        <span className={styles.wordCountTag}>
                          {moment.wordCount} {moment.wordCount === 1 ? 'word' : 'words'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.rowDivider} />
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Single Moment Reader / Editor Modal */}
      {activeMoment && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveMoment(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.modalPaper}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTimestamp}>
                {new Date(activeMoment.createdAt).toLocaleDateString([], {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {new Date(activeMoment.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </div>

              <div className={styles.modalActions}>
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={styles.subtleActionBtn}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => setMomentToDelete(activeMoment.id)}
                      className={styles.subtleDeleteBtn}
                    >
                      DELETE
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className={styles.saveActionBtn}
                    >
                      SAVE
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className={styles.subtleActionBtn}
                    >
                      CANCEL
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveMoment(null)}
                  className={styles.closeModalBtn}
                  aria-label="Close reader"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Confirm deletion dialog inline */}
            {momentToDelete === activeMoment.id && (
              <div className={styles.deleteConfirmBanner}>
                <span>Permanently erase this moment?</span>
                <div className={styles.deleteBtns}>
                  <button
                    onClick={() => handleConfirmDelete(activeMoment.id)}
                    className={styles.dangerConfirmBtn}
                  >
                    YES, ERASE
                  </button>
                  <button
                    onClick={() => setMomentToDelete(null)}
                    className={styles.subtleActionBtn}
                  >
                    KEEP
                  </button>
                </div>
              </div>
            )}

            {/* Content Display or Editor */}
            <div className={styles.modalBody}>
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={styles.editTextarea}
                  rows={8}
                  autoFocus
                />
              ) : (
                <div className={styles.fullProseText}>
                  {activeMoment.content}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {activeMoment.emotions && activeMoment.emotions.length > 0 && (
                <div className={styles.modalEmotions}>
                  {activeMoment.emotions.map((em) => (
                    <span key={em} className={styles.modalEmotionPill}>
                      {em}
                    </span>
                  ))}
                </div>
              )}
              {activeMoment.reflection && (
                <span className={styles.modalReflection}>
                  felt {activeMoment.reflection} afterward
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
