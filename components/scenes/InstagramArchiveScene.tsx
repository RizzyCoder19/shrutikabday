"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  LITTLE_MOMENT_CONVERSATIONS,
  PART_ONE_CONVERSATION,
  type ChatConversation,
} from "@/content/chats";
import { useExperienceStore } from "@/state/experience-store";
import { SelfBuildingChatPhone } from "./SelfBuildingChatPhone";
import "./instagram-archive.css";

type StageBeat =
  | "PART1_INTRO"
  | "PART1_TITLE"
  | "PART1_CHAT"
  | "PART2_INTRO"
  | "MOMENT_BLANK"
  | "MOMENT_TITLE"
  | "MOMENT_PRE_CHAT_PAUSE"
  | "MOMENT_CHAT"
  | "DISSOLVE_EXIT";

export function InstagramArchiveScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);

  const [beat, setBeat] = useState<StageBeat>("PART1_INTRO");
  const [momentIdx, setMomentIdx] = useState(0);

  const titleWrapRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const subRef = useRef<HTMLSpanElement>(null);
  const dissolveCanvasRef = useRef<HTMLCanvasElement>(null);

  // Beats A & B: Clean blank canvas -> Editorial storytelling introduction -> Phone entrance
  useEffect(() => {
    if (
      beat !== "PART1_INTRO" &&
      beat !== "PART1_TITLE" &&
      beat !== "PART2_INTRO" &&
      beat !== "MOMENT_BLANK" &&
      beat !== "MOMENT_TITLE" &&
      beat !== "MOMENT_PRE_CHAT_PAUSE"
    ) {
      return;
    }

    const advanceBeat = () => {
      if (beat === "PART1_INTRO") setBeat("PART1_TITLE");
      else if (beat === "PART1_TITLE") setBeat("PART1_CHAT");
      else if (beat === "PART2_INTRO") setBeat("MOMENT_TITLE");
      else if (beat === "MOMENT_BLANK") setBeat("MOMENT_TITLE");
      else if (beat === "MOMENT_TITLE") setBeat("MOMENT_PRE_CHAT_PAUSE");
      else if (beat === "MOMENT_PRE_CHAT_PAUSE") setBeat("MOMENT_CHAT");
    };

    // Beat A: pure clean blank canvas settle before Beat B storytelling title
    if (beat === "MOMENT_BLANK") {
      const blankTimer = setTimeout(advanceBeat, 520);
      return () => clearTimeout(blankTimer);
    }

    // Exact 0.8-second pause between completed editorial intro and Part Two chat construction
    if (beat === "MOMENT_PRE_CHAT_PAUSE") {
      const preChatTimer = setTimeout(advanceBeat, 800);
      return () => clearTimeout(preChatTimer);
    }

    const wrapEl = titleWrapRef.current;
    if (!wrapEl) return;

    const lines = lineRefs.current.filter(Boolean) as HTMLParagraphElement[];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(wrapEl, { opacity: 1, y: 0, clearProps: "filter,transform" });
      lines.forEach((l) => gsap.set(l, { opacity: 1, y: 0, clearProps: "filter,transform" }));
      if (subRef.current) gsap.set(subRef.current, { opacity: 1, clearProps: "filter,transform" });
      const timer = setTimeout(advanceBeat, beat === "PART1_INTRO" ? 3400 : 2400);
      return () => clearTimeout(timer);
    }

    // Hold each intro beat comfortably at full crisp readability; Scene 5 opening intro held +1.0s longer
    const holdSec =
      beat === "PART1_INTRO"
        ? 3.3
        : beat === "MOMENT_TITLE" && momentIdx === LITTLE_MOMENT_CONVERSATIONS.length - 1
          ? 2.8
          : lines.length > 1
            ? 2.7
            : beat === "PART1_TITLE" || beat === "MOMENT_TITLE"
              ? 2.5
              : 2.3;

    const tl = gsap.timeline({ onComplete: advanceBeat });
    tl.set(wrapEl, { opacity: 1, y: 0, clearProps: "filter,transform" });
    tl.to({}, { duration: 0.28 });

    lines.forEach((lineEl, idx) => {
      tl.fromTo(
        lineEl,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.72,
          ease: "power2.out",
          clearProps: "filter,transform",
        },
        idx === 0 ? undefined : "+=0.22"
      );
    });

    if (subRef.current) {
      tl.fromTo(
        subRef.current,
        { opacity: 0, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          clearProps: "filter,transform",
        },
        "-=0.25"
      );
    }

    tl.to({}, { duration: holdSec }).to(wrapEl, {
      opacity: 0,
      y: -10,
      duration: 0.55,
      ease: "power2.inOut",
    });

    return () => {
      tl.kill();
    };
  }, [beat, momentIdx]);

  // Particle dissolve transition into Flower Garden after Final Moment
  useEffect(() => {
    if (beat !== "DISSOLVE_EXIT") return;
    const canvas = dissolveCanvasRef.current;
    if (!canvas) {
      transitionTo("FLOWER_GARDEN");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      transitionTo("FLOWER_GARDEN");
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = ["#D9A6B7", "#E9C77D", "#F3D9C9", "#7770A8"];
    const particles = Array.from({ length: 90 }, () => ({
      x: W * 0.5 + (Math.random() - 0.5) * Math.min(W * 0.4, 260),
      y: H * 0.5 + (Math.random() - 0.5) * Math.min(H * 0.6, 380),
      vx: (Math.random() - 0.5) * 1.4,
      vy: -(Math.random() * 2.2 + 0.9),
      size: Math.random() * 4 + 2,
      alpha: 0.95,
      color: palette[Math.floor(Math.random() * palette.length)],
    }));

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      particles.forEach((p) => {
        p.x += p.vx + Math.sin(elapsed * 3 + p.y * 0.02) * 0.5;
        p.y += p.vy;
        p.alpha = Math.max(0, 1 - elapsed / 1.65);

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (elapsed < 1.6) {
        rafId = requestAnimationFrame(tick);
      } else {
        transitionTo("FLOWER_GARDEN");
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [beat, transitionTo]);

  // Beat A & B overlays
  if (
    beat === "PART1_INTRO" ||
    beat === "PART1_TITLE" ||
    beat === "PART2_INTRO" ||
    beat === "MOMENT_BLANK" ||
    beat === "MOMENT_TITLE" ||
    beat === "MOMENT_PRE_CHAT_PAUSE"
  ) {
    let lines: string[] = [];
    let subtitle = "";

    if (beat === "PART1_INTRO") {
      lines = ["Where it all began."];
    } else if (beat === "PART1_TITLE") {
      lines = PART_ONE_CONVERSATION.editorialLines;
      subtitle = PART_ONE_CONVERSATION.editorialSubtitle;
    } else if (beat === "PART2_INTRO") {
      lines = ["And then, the little moments."];
    } else if (beat === "MOMENT_TITLE") {
      const conv = LITTLE_MOMENT_CONVERSATIONS[momentIdx];
      lines = conv.editorialLines;
      subtitle = conv.editorialSubtitle;
    }

    lineRefs.current = [];

    return (
      <section className="f1-stage" aria-label="Conversation chapter introduction">
        <div className="f1-phone-ambient-halo" />
        <div className="f1-grain" />
        <div className="f1-canvas">
          {beat !== "MOMENT_BLANK" && beat !== "MOMENT_PRE_CHAT_PAUSE" && (
            <div
              key={beat === "MOMENT_TITLE" ? `${beat}-${momentIdx}` : beat}
              ref={titleWrapRef}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.85rem",
                opacity: 0,
                padding: "0 1.5rem",
                maxWidth: "44rem",
              }}
            >
              {lines.map((line, i) => (
                <p
                  key={`${beat}-${i}`}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className="ig-editorial-title"
                  style={{
                    opacity: 0,
                    fontSize:
                      lines.length > 1 && i > 0
                        ? "clamp(1.25rem, 3vw, 2.05rem)"
                        : undefined,
                    color:
                      lines.length > 1 && i > 0
                        ? "rgba(243, 217, 201, 0.9)"
                        : undefined,
                  }}
                >
                  {line}
                </p>
              ))}
              {subtitle && (
                <span ref={subRef} className="ig-editorial-sub" style={{ opacity: 0 }}>
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (beat === "DISSOLVE_EXIT") {
    return (
      <section className="f1-stage" aria-label="Transitioning to the garden">
        <canvas
          ref={dissolveCanvasRef}
          style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
        />
      </section>
    );
  }

  if (beat === "PART1_CHAT") {
    return (
      <section className="f1-stage" aria-label="Part One: The first birthday reply">
        <div className="f1-phone-ambient-halo" />
        <div className="f1-grain" />
        <SelfBuildingChatPhone
          key={PART_ONE_CONVERSATION.id}
          conversation={PART_ONE_CONVERSATION}
          nextLabel="Little Moments"
          onCompleteAdvance={() => {
            setMomentIdx(0);
            setBeat("PART2_INTRO");
          }}
        />
      </section>
    );
  }

  // PART TWO: 3 cohesive narrative moments rendered cleanly inside the exact same phone interface
  const activeConversation: ChatConversation = LITTLE_MOMENT_CONVERSATIONS[momentIdx];
  const isLastMoment = momentIdx === LITTLE_MOMENT_CONVERSATIONS.length - 1;

  return (
    <section
      className="f1-stage"
      aria-label={`Part Two: ${activeConversation.editorialSubtitle}`}
    >
      <div className="f1-phone-ambient-halo" />
      <div className="f1-grain" />
      <SelfBuildingChatPhone
        key={activeConversation.id}
        conversation={activeConversation}
        nextLabel={isLastMoment ? "Continue" : "Next Moment"}
        onCompleteAdvance={() => {
          if (!isLastMoment) {
            setMomentIdx((prev) => prev + 1);
            setBeat("MOMENT_BLANK");
          } else {
            setBeat("DISSOLVE_EXIT");
          }
        }}
      />
    </section>
  );
}
