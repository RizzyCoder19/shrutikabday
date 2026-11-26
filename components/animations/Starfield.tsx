"use client";

import React, { useEffect, useRef } from "react";

interface StarfieldProps {
  density?: number;
  speed?: number;
}

export function Starfield({ density = 80, speed = 0.25 }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    const stars: Array<{
      x: number;
      y: number;
      size: number;
      alpha: number;
      twinkleSpeed: number;
      hue: string;
    }> = [];

    const hues = [
      "rgba(255, 242, 228,", // soft ivory
      "rgba(233, 199, 125,", // champagne gold
      "rgba(217, 166, 183,", // dusty rose
      "rgba(119, 112, 168,", // lavender
    ];

    for (let i = 0; i < density; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.008,
        hue: hues[Math.floor(Math.random() * hues.length)],
      });
    }

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.y -= speed * (star.size * 0.4);
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }

        const currentAlpha =
          star.alpha * (0.6 + 0.4 * Math.sin(frame * star.twinkleSpeed + i));

        ctx.fillStyle = `${star.hue} ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, [density, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  );
}
