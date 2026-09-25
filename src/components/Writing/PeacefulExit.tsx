import React, { useState, useEffect } from 'react';
import type { Moment, EmotionName } from '../../types';
import { useVault } from '../../context/VaultContext';
import styles from './Writing.module.css';

interface PeacefulExitProps {
  moment: Moment;
  onReturn: () => void;
}

const AVAILABLE_EMOTIONS: EmotionName[] = [
  'calm',
  'peaceful',
  'hopeful',
  'grateful',
  'happy',
  'excited',
  'restless',
  'confused',
  'uncertain',
  'lonely',
  'sad',
  'frustrated',
  'overwhelmed',
  'angry',
];

export const PeacefulExit: React.FC<PeacefulExitProps> = ({ moment, onReturn }) => {
  const { editMoment } = useVault();
  const [phase, setPhase] = useState<'saved_pulse' | 'you_were_here'>('saved_pulse');
  const [selectedReflection, setSelectedReflection] = useState<
    'lighter' | 'same' | 'different' | 'unknown' | undefined
  >(moment.reflection);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(moment.emotions || []);

  // Format moment date and time
  const momentDate = new Date(moment.createdAt);
  const dateFormatted = momentDate
    .toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();
  const timeFormatted = momentDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Transition from "SAVED." holding pause (1.5s) to "YOU WERE HERE."
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('you_were_here');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleEmotion = async (emotion: EmotionName) => {
    let next: string[];
    if (selectedEmotions.includes(emotion)) {
      next = selectedEmotions.filter((e) => e !== emotion);
    } else {
      next = [...selectedEmotions, emotion];
    }
    setSelectedEmotions(next);
    await editMoment(moment.id, { emotions: next });
  };

  const handleSelectReflection = async (ref: 'lighter' | 'same' | 'different' | 'unknown') => {
    setSelectedReflection(ref);
    await editMoment(moment.id, { reflection: ref });
  };

  if (phase === 'saved_pulse') {
    return (
      <div className={styles.peacefulOverlay}>
        <div className={styles.savedPulseContainer}>
          <span className={styles.savedWord}>SAVED.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.peacefulOverlay}>
      <div className={styles.peacefulContent}>
        {/* Memory Starlight Glow Marker */}
        <div className={styles.starlightTrace}>✦</div>

        <h2 className={styles.presenceTitle}>YOU WERE HERE.</h2>

        <div className={styles.presenceTimestamp}>
          <span>{dateFormatted}</span>
          <span className={styles.dotDivider}>·</span>
          <span>{timeFormatted}</span>
        </div>

        {/* Optional Reflection */}
        <div className={styles.optionalSection}>
          <p className={styles.optionalLabel}>HOW DOES IT FEEL NOW?</p>
          <div className={styles.reflectionOptions}>
            {(['lighter', 'same', 'different', 'unknown'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelectReflection(opt)}
                className={`${styles.reflectionBtn} ${
                  selectedReflection === opt ? styles.selectedReflection : ''
                }`}
              >
                {opt === 'unknown' ? "I don't know" : opt}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Emotions */}
        <div className={styles.optionalSection}>
          <p className={styles.optionalLabel}>WHAT COLORED THIS MOMENT?</p>
          <div className={styles.emotionsWrap}>
            {AVAILABLE_EMOTIONS.map((emotion) => {
              const isSelected = selectedEmotions.includes(emotion);
              return (
                <button
                  key={emotion}
                  onClick={() => handleToggleEmotion(emotion)}
                  className={`${styles.emotionTag} ${isSelected ? styles.selectedEmotion : ''}`}
                >
                  {emotion}
                </button>
              );
            })}
          </div>
        </div>

        {/* Return to My World button */}
        <div className={styles.returnContainer}>
          <button onClick={onReturn} className={styles.returnBtn}>
            RETURN TO MY WORLD →
          </button>
        </div>
      </div>
    </div>
  );
};
