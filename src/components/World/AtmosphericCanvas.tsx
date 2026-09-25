import React, { useEffect, useRef } from 'react';
import { useVault } from '../../context/VaultContext';
import styles from './World.module.css';

interface Particle {
  x: number;
  y: number;
  baseRadius: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  isMomentTrace: boolean;
  colorType: 'pearl' | 'amber' | 'subtle';
}

export const AtmosphericCanvas: React.FC = () => {
  const { moments, reducedMotion, theme } = useVault();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute dominant emotion from recent moments to subtly influence particle physics
  const recentMoments = moments.slice(0, 5);
  const allRecentEmotions = recentMoments.flatMap((m) => m.emotions || []);
  const hasRestless = allRecentEmotions.includes('restless') || allRecentEmotions.includes('excited');
  const hasCalmOrPeace = allRecentEmotions.includes('calm') || allRecentEmotions.includes('peaceful');
  const hasConfused = allRecentEmotions.includes('confused') || allRecentEmotions.includes('uncertain');

  // Physics multipliers
  const speedMultiplier = hasRestless ? 1.35 : hasCalmOrPeace ? 0.65 : 0.9;
  const jitter = hasConfused ? 0.04 : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // Generate baseline ambient particles + 1 particle for each saved moment
    const momentCount = moments.length;
    const baseCount = Math.min(45, Math.floor((width * height) / 25000));
    const totalParticles = Math.min(220, baseCount + momentCount * 2);

    const particles: Particle[] = [];

    for (let i = 0; i < totalParticles; i++) {
      const isMoment = i >= baseCount;
      const baseAlpha = isMoment ? 0.35 + Math.random() * 0.45 : 0.08 + Math.random() * 0.22;
      const baseRadius = isMoment ? 1.2 + Math.random() * 1.6 : 0.8 + Math.random() * 1.2;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseRadius,
        radius: baseRadius,
        vx: (Math.random() - 0.5) * 0.18 * speedMultiplier,
        vy: (Math.random() - 0.5) * 0.18 * speedMultiplier,
        alpha: baseAlpha,
        baseAlpha,
        pulseSpeed: 0.008 + Math.random() * 0.015,
        pulsePhase: Math.random() * Math.PI * 2,
        isMomentTrace: isMoment,
        colorType: isMoment && Math.random() > 0.4 ? 'amber' : 'pearl',
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Determine palette RGB values from active theme
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      const pearlRgb = isDark ? '244, 242, 235' : '45, 42, 38';
      const amberRgb = isDark ? '201, 169, 110' : '170, 133, 64';

      // Draw subtle constellation connections between nearby moment traces
      const connectDistance = width < 768 ? 70 : 100;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (!p1.isMomentTrace) continue;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (!p2.isMomentTrace) continue;

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDistance) {
            const lineAlpha = (1 - dist / connectDistance) * 0.06;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${amberRgb}, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Render individual particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Animate pulse
        p.pulsePhase += p.pulseSpeed;
        const pulseFactor = Math.sin(p.pulsePhase);
        p.alpha = Math.max(0.02, p.baseAlpha + pulseFactor * 0.15);
        p.radius = Math.max(0.4, p.baseRadius + pulseFactor * 0.2);

        // Update positions unless reduced motion is active
        if (!reducedMotion) {
          p.x += p.vx * delta * 60;
          p.y += p.vy * delta * 60;

          if (jitter > 0) {
            p.x += (Math.random() - 0.5) * jitter;
            p.y += (Math.random() - 0.5) * jitter;
          }

          // Soft wrapping at viewport boundaries
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
        }

        const rgb = p.colorType === 'amber' ? amberRgb : pearlRgb;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${p.alpha})`;
        ctx.fill();

        // Extra soft halo for moment traces
        if (p.isMomentTrace) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${p.alpha * 0.12})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [moments.length, reducedMotion, speedMultiplier, jitter, theme]);

  return (
    <div className={styles.canvasContainer} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.horizonBeam} />
    </div>
  );
};
