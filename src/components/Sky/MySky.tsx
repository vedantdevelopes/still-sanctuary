import React, { useEffect, useRef, useState } from 'react';
import { useVault } from '../../context/VaultContext';
import type { Moment } from '../../types';
import styles from './Sky.module.css';

interface SkyStar {
  moment: Moment;
  x: number;
  y: number;
  radius: number;
  alpha: number;
  dateStr: string;
  timeStr: string;
}

export const MySky: React.FC = () => {
  const { moments, setSelectedMoment, setCurrentLocation, theme } = useVault();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredStar, setHoveredStar] = useState<SkyStar | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const starsRef = useRef<SkyStar[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = container.clientWidth);
    let height = (canvas.height = container.clientHeight);

    const handleResize = () => {
      if (!canvas || !container) return;
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
      layoutStars();
    };
    window.addEventListener('resize', handleResize);

    const layoutStars = () => {
      if (moments.length === 0) {
        starsRef.current = [];
        return;
      }

      // Sort moments chronologically
      const sorted = [...moments].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const firstTime = new Date(sorted[0].createdAt).getTime();
      const lastTime = new Date(sorted[sorted.length - 1].createdAt).getTime();
      const timeSpan = Math.max(lastTime - firstTime, 1000 * 60 * 60 * 24); // at least 1 day span

      const paddingX = 80;
      const paddingY = 80;
      const usableWidth = width - paddingX * 2;
      const usableHeight = height - paddingY * 2;

      starsRef.current = sorted.map((m) => {
        const mTime = new Date(m.createdAt).getTime();
        // Time moves horizontally
        let normX = sorted.length === 1 ? 0.5 : (mTime - firstTime) / timeSpan;
        normX = Math.max(0, Math.min(1, normX));
        const x = paddingX + normX * usableWidth;

        // Vertical positioning: emotion / reflection depth or stable seeded pseudo-random
        const pseudoSeed = (m.id.charCodeAt(0) + m.id.charCodeAt(1) * 3) % 100;
        let normY = 0.5 + (pseudoSeed / 100 - 0.5) * 0.65;
        if (m.intensity) {
          normY = 0.2 + (m.intensity / 5) * 0.6;
        }
        const y = paddingY + normY * usableHeight;

        // Word count influences point size
        const radius = Math.min(6.5, Math.max(2.2, Math.sqrt(m.wordCount || 10) * 0.45));

        const dateObj = new Date(m.createdAt);
        const dateStr = dateObj
          .toLocaleDateString([], {
            day: 'numeric',
            month: 'long',
          })
          .toUpperCase();
        const timeStr = dateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        return {
          moment: m,
          x,
          y,
          radius,
          alpha: 0.85,
          dateStr,
          timeStr,
        };
      });
    };

    layoutStars();

    // Render loop for Sky canvas
    let animId: number;
    let pulse = 0;

    const render = () => {
      pulse += 0.02;
      ctx.clearRect(0, 0, width, height);

      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      const starRgb = isDark ? '244, 242, 235' : '30, 28, 25';
      const amberRgb = isDark ? '201, 169, 110' : '170, 133, 64';

      const stars = starsRef.current;

      // Draw subtle constellation path linking moments in time sequence
      if (stars.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${amberRgb}, 0.12)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);

        for (let i = 0; i < stars.length; i++) {
          if (i === 0) {
            ctx.moveTo(stars[i].x, stars[i].y);
          } else {
            ctx.lineTo(stars[i].x, stars[i].y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Render star nodes
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const isHovered = hoveredStar?.moment.id === star.moment.id;
        const currentRadius = isHovered
          ? star.radius * 1.8
          : star.radius + Math.sin(pulse + i) * 0.3;

        // Outer glow
        ctx.beginPath();
        ctx.arc(star.x, star.y, currentRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = isHovered
          ? `rgba(${amberRgb}, 0.35)`
          : `rgba(${amberRgb}, 0.08)`;
        ctx.fill();

        // Core star
        ctx.beginPath();
        ctx.arc(star.x, star.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered
          ? `rgba(${amberRgb}, 1)`
          : `rgba(${starRgb}, ${star.alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [moments, hoveredStar, theme]);

  // Mouse hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    // Find closest star within 18px hit radius
    let found: SkyStar | null = null;
    for (const star of starsRef.current) {
      const dx = star.x - mouseX;
      const dy = star.y - mouseY;
      if (Math.sqrt(dx * dx + dy * dy) < Math.max(16, star.radius * 3)) {
        found = star;
        break;
      }
    }
    setHoveredStar(found);
  };

  const handleClick = () => {
    if (hoveredStar) {
      setSelectedMoment(hoveredStar.moment);
      setCurrentLocation('moments');
    }
  };

  return (
    <div className={styles.skyContainer}>
      <div style={{ height: '70px' }} />

      <header className={styles.skyHeader}>
        <h1 className={styles.skyTitle}>MY SKY</h1>
        <p className={styles.skySubhead}>
          {moments.length === 0
            ? 'The sky is clear. Write to place your first star.'
            : 'Each star is a moment in time. Hover to remember; click to read.'}
        </p>
      </header>

      <div
        ref={containerRef}
        className={styles.canvasWrapper}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{ cursor: hoveredStar ? 'pointer' : 'default' }}
      >
        <canvas ref={canvasRef} className={styles.skyCanvas} />

        {/* Hover Micro-card */}
        {hoveredStar && (
          <div
            className={styles.hoverCard}
            style={{
              left: `${mousePos.x}px`,
              top: `${mousePos.y - 12}px`,
            }}
          >
            <div className={styles.cardHeader}>
              <span>{hoveredStar.dateStr}</span>
              <span className={styles.dot}>·</span>
              <span>{hoveredStar.timeStr}</span>
            </div>

            {hoveredStar.moment.emotions && hoveredStar.moment.emotions.length > 0 && (
              <div className={styles.cardEmotions}>
                {hoveredStar.moment.emotions.join(' · ')}
              </div>
            )}

            <div className={styles.cardWords}>
              {hoveredStar.moment.wordCount} words
            </div>
            <div className={styles.cardHint}>Click to open moment →</div>
          </div>
        )}
      </div>
    </div>
  );
};
