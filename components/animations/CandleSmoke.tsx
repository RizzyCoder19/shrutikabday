"use client";

import React, { useEffect, useRef } from "react";

interface CandleSmokeProps {
  active: boolean;
  candleX?: number; // relative fraction or px
  candleY?: number;
}

export function CandleSmoke({ active }: CandleSmokeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const smokeParticles: Array<{
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      alpha: number;
      spin: number;
    }> = [];

    // Candle origin is near center
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight / 2 - 25;

    let spawned = 0;
    const maxParticles = 65;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (spawned < maxParticles) {
        for (let i = 0; i < 2; i++) {
          smokeParticles.push({
            x: originX + (Math.random() * 8 - 4),
            y: originY,
            size: Math.random() * 6 + 4,
            speedY: -(Math.random() * 1.6 + 1.2),
            speedX: Math.random() * 0.8 - 0.4,
            alpha: 0.65,
            spin: Math.random() * 0.05 - 0.025,
          });
          spawned++;
        }
      }

      for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.y * 0.02) * 0.5;
        p.size += 0.35;
        p.alpha -= 0.0055;

        if (p.alpha <= 0) {
          smokeParticles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(235, 230, 240, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (smokeParticles.length > 0 || spawned < maxParticles) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 45,
      }}
      aria-hidden="true"
    />
  );
}
