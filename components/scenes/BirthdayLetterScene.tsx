"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useExperienceStore } from "@/state/experience-store";
import { BIRTHDAY_LETTER } from "@/content/birthday-letter";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import { ArrowRight } from "lucide-react";

const PAPER_GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 240 240' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='0.22'/%3E%3C/svg%3E")`;
const PAPER_FIBRE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.04 0.35' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23w)' opacity='0.07'/%3E%3C/svg%3E")`;

type LetterPhase = "sealed" | "opening" | "reading";

interface WordToken {
  word: string;
  globalIdx: number;
  endsSentence: boolean;
  isPausePunct: boolean;
}

export function BirthdayLetterScene() {
  const transitionTo = useExperienceStore((s) => s.transitionTo);
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);

  const [phase, setPhase] = useState<LetterPhase>("sealed");
  const [writtenWords, setWrittenWords] = useState(0);
  const [isWriting, setIsWriting] = useState(false);
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [continueVisible, setContinueVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const envelopeWrapRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const innerPeekRef = useRef<HTMLDivElement>(null);
  const signDashRef = useRef<SVGPathElement>(null);
  const signNameRef = useRef<SVGPathElement>(null);
  const signUnderRef = useRef<SVGPathElement>(null);
  const penNibRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Prepare flowing handwriting phrases with subtle human cadence cues around commas/periods/dashes
  const { sectionTokens, totalWords } = useMemo(() => {
    let cursor = 0;
    const tokens = BIRTHDAY_LETTER.sections.map((sec) => {
      const words = sec.text.split(/\s+/).filter(Boolean);
      const list: WordToken[] = words.map((w) => ({
        word: w,
        globalIdx: cursor++,
        endsSentence: /[.!?]$/.test(w),
        isPausePunct: /[,—:]$/.test(w),
      }));
      return list;
    });
    return { sectionTokens: tokens, totalWords: cursor };
  }, []);

  // Step 1: Natural physical envelope unsealing -> rising cotton sheet
  useEffect(() => {
    if (phase !== "opening") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("reading");
      return;
    }

    const wrap = envelopeWrapRef.current;
    const flap = flapRef.current;
    const peek = innerPeekRef.current;
    if (!wrap || !flap || !peek) {
      setPhase("reading");
      return;
    }

    const tl = gsap.timeline({ onComplete: () => setPhase("reading") });
    tl.to(flap, { rotateX: 175, duration: 0.48, ease: "power2.inOut" })
      .to(peek, { y: -38, opacity: 1, duration: 0.36, ease: "power2.out" }, "-=0.14")
      .to(wrap, { opacity: 0, scale: 1.03, y: 12, duration: 0.3, ease: "power2.in" });

    return () => {
      tl.kill();
    };
  }, [phase]);

  // Move fountain-pen nib gently along the active wet-ink word on paper
  useEffect(() => {
    if (phase !== "reading" || !isWriting || writtenWords <= 0) return;
    const targetWord = wordRefs.current[writtenWords - 1];
    const nib = penNibRef.current;
    const sheet = nib?.parentElement;
    if (!targetWord || !nib || !sheet) return;

    const wr = targetWord.getBoundingClientRect();
    const sr = sheet.getBoundingClientRect();
    const relX = Math.max(14, Math.min(sr.width - 20, wr.right - sr.left + 2));
    const relY = Math.max(14, Math.min(sr.height - 20, wr.top - sr.top + wr.height * 0.28));

    gsap.to(nib, {
      x: relX,
      y: relY,
      opacity: 0.92,
      duration: 0.16,
      ease: "sine.out",
      overwrite: "auto",
    });
  }, [phase, isWriting, writtenWords]);

  // Step 2: Slow, organic wet-ink self-writing choreography -> deliberate handwritten SVG signature
  useEffect(() => {
    if (phase !== "reading") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dash = signDashRef.current;
    const sig = signNameRef.current;
    const under = signUnderRef.current;

    const initStroke = (el: SVGGeometryElement | null) => {
      if (!el) return;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: reduced ? 0 : len });
    };

    initStroke(dash);
    initStroke(sig);
    initStroke(under);

    if (reduced) {
      setWrittenWords(totalWords);
      setIsWriting(false);
      setSignatureDrawn(true);
      setContinueVisible(true);
      return;
    }

    setWrittenWords(0);
    setIsWriting(true);
    setSignatureDrawn(false);
    setContinueVisible(false);

    const tl = gsap.timeline();

    // Unhurried, realistic human handwriting pace with subtle sentence & paragraph breathing pauses
    let clock = 0.55;
    sectionTokens.forEach((tokens, secIdx) => {
      const basePerWord =
        secIdx === 0 ? 0.16 : secIdx === sectionTokens.length - 1 ? 0.14 : 0.102;

      tokens.forEach((tok, wIdx) => {
        tl.call(() => setWrittenWords(tok.globalIdx + 1), [], clock);
        // Gentle variation based on word length and punctuation rhythm
        const lenFactor = Math.min(1.38, Math.max(0.8, tok.word.length / 5.5));
        const punctPause = tok.endsSentence ? 0.34 : tok.isPausePunct ? 0.18 : 0;
        const cadenceJitter = (wIdx % 3) * 0.012;
        clock += basePerWord * lenFactor + punctPause + cadenceJitter;
      });

      clock += secIdx === 0 ? 0.42 : secIdx === sectionTokens.length - 1 ? 0.32 : 0.52;
    });

    tl.call(() => {
      setIsWriting(false);
      setSignatureDrawn(true);
    }, [], clock);

    if (dash) tl.to(dash, { strokeDashoffset: 0, duration: 0.32, ease: "power2.out" }, clock + 0.08);
    if (sig) tl.to(sig, { strokeDashoffset: 0, duration: 1.55, ease: "power1.inOut" }, clock + 0.35);
    if (under) tl.to(under, { strokeDashoffset: 0, duration: 0.55, ease: "power2.out" }, clock + 1.65);
    tl.call(() => setContinueVisible(true), [], clock + 2.1);

    return () => {
      tl.kill();
    };
  }, [phase, sectionTokens, totalWords]);

  const handleOpenEnvelope = () => {
    if (phase !== "sealed") return;
    if (soundEnabledRef.current) {
      audioSynth.playGentleChime(587.33);
    }
    setPhase("opening");
  };

  const handleContinue = () => {
    if (exiting || !continueVisible) return;
    setExiting(true);
    if (soundEnabledRef.current) {
      audioSynth.playGentleChime(523.25);
    }
    setTimeout(() => {
      transitionTo("WRAP_UP");
    }, 650);
  };

  return (
    <section
      className="letter-stage"
      style={{ opacity: exiting ? 0 : 1 }}
      aria-label="Chapter 10: Birthday Letter"
    >
      <div className="letter-table-warmth" aria-hidden="true" />

      {phase !== "reading" ? (
        <div className="letter-center-wrap" style={{ perspective: "1200px" }}>
          <div
            ref={envelopeWrapRef}
            onClick={handleOpenEnvelope}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenEnvelope();
              }
            }}
            className={`folded-note-packet ${phase === "opening" ? "is-opening" : ""}`}
            aria-label="Tap to open birthday letter"
          >
            <div className="letter-paper-grain" aria-hidden="true" />
            <div className="letter-paper-fibres" aria-hidden="true" />
            <div ref={innerPeekRef} className="letter-inner-peek" aria-hidden="true">
              <div className="letter-peek-lines" />
            </div>
            <div ref={flapRef} className="letter-envelope-flap" aria-hidden="true" />
            <div className="letter-envelope-crease" aria-hidden="true" />

            <span className="letter-packet-date">{BIRTHDAY_LETTER.date}</span>
            <p className="letter-packet-to">For Shruti</p>
            <div className="letter-seal-dot" aria-hidden="true">
              <span>G</span>
            </div>
            <span className="letter-packet-hint">
              {phase === "opening" ? "Opening..." : "Tap to open"}
            </span>
          </div>
        </div>
      ) : (
        <div className="letter-reading-wrap">
          <article className="letter-sheet" aria-label="Birthday Letter Content">
            <div className="letter-paper-grain" aria-hidden="true" />
            <div className="letter-paper-fibres" aria-hidden="true" />
            <div className="letter-sheet-lighting" aria-hidden="true" />
            <div className="letter-sheet-crease-h" aria-hidden="true" />
            <div className="letter-sheet-crease-v" aria-hidden="true" />

            {/* Subtle traveling fountain-pen nib */}
            <div
              ref={penNibRef}
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                pointerEvents: "none",
                zIndex: 12,
                opacity: isWriting ? 0.92 : 0,
                transition: "opacity 0.35s ease",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2.5 21.5 L8.8 11.2 L19.2 2.8 L16.2 13.8 L5.2 21.5 Z"
                  fill="#785032"
                  stroke="#3b2619"
                  strokeWidth="0.9"
                />
                <circle cx="2.8" cy="21" r="1.4" fill="#3a1923" />
              </svg>
            </div>

            <header className="letter-sheet-header">
              <span className="letter-sheet-date">{BIRTHDAY_LETTER.date}</span>
            </header>

            <div className="letter-sheet-body">
              {BIRTHDAY_LETTER.sections.map((sec, secIdx) => {
                const tokens = sectionTokens[secIdx] ?? [];
                const textClass =
                  sec.type === "greeting"
                    ? "letter-text-greeting"
                    : sec.type === "signoff"
                      ? "letter-text-signature"
                      : "letter-text-hand";

                return (
                  <p key={secIdx} className={textClass}>
                    {tokens.map((tok, wIdx) => {
                      const isWritten = tok.globalIdx < writtenWords;
                      return (
                        <React.Fragment key={tok.globalIdx}>
                          <span
                            ref={(el) => {
                              wordRefs.current[tok.globalIdx] = el;
                            }}
                            className={`letter-ink-stroke ${isWritten ? "is-written" : ""}`}
                          >
                            {tok.word}
                          </span>
                          {wIdx < tokens.length - 1 ? " " : ""}
                        </React.Fragment>
                      );
                    })}
                  </p>
                );
              })}

              {/* Handwritten SVG signature */}
              <div
                className={`letter-svg-signoff ${signatureDrawn ? "is-visible" : ""}`}
                aria-label="— Umar"
              >
                <svg
                  className="letter-svg-umar"
                  viewBox="0 0 218 56"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    ref={signDashRef}
                    d="M 6 33 L 26 33"
                    stroke="#3e1b24"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <path
                    ref={signNameRef}
                    d="M 40 12 C 37 32, 42 44, 54 44 C 65 44, 70 29, 73 10 C 70 26, 69 36, 74 40 C 78 31, 83 25, 88 25 C 92 25, 93 31, 92 40 C 96 29, 101 25, 106 25 C 110 25, 111 32, 110 40 C 113 29, 118 25, 123 25 C 127 25, 128 34, 129 40 C 131 41, 134 38, 138 32 C 141 26, 148 25, 150 29 C 147 25, 137 27, 135 36 C 134 41, 141 43, 147 36 C 150 32, 152 29, 152 27 C 151 34, 152 40, 156 40 C 159 38, 162 30, 165 26 C 167 29, 172 27, 175 26 C 172 32, 171 38, 176 40 C 181 41, 187 37, 192 34"
                    stroke="#3e1b24"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    ref={signUnderRef}
                    d="M 42 49 C 86 46, 138 44, 188 47"
                    stroke="#6b2e3d"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </article>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!continueVisible}
            className={`scene-continue-btn letter-continue-btn ${continueVisible ? "is-ready" : ""
              }`}
          >
            <span>Continue</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      <style jsx>{`
        .letter-stage {
          position: fixed;
          inset: 0;
          background: radial-gradient(
            ellipse at 50% 42%,
            #1e1419 0%,
            #100a0e 60%,
            #060406 100%
          );
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: safe center;
          padding: max(3.6rem, calc(var(--safe-top) + 2.9rem)) 0.85rem
            max(1rem, var(--safe-bottom));
          overflow-y: auto;
          overflow-x: hidden;
          transition: opacity 0.65s ease;
          z-index: 20;
        }

        .letter-table-warmth {
          position: fixed;
          inset: 0;
          background: radial-gradient(
            circle at 48% 45%,
            rgba(255, 218, 168, 0.08) 0%,
            transparent 62%
          );
          pointer-events: none;
          z-index: 2;
        }

        .letter-center-wrap {
          margin: auto 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          position: relative;
          z-index: 5;
        }

        .folded-note-packet {
          position: relative;
          width: min(344px, 86vw);
          padding: 2.4rem 1.65rem 1.8rem;
          background: linear-gradient(158deg, #f9f0df 0%, #efe0c5 58%, #e2ceac 100%);
          color: #2f2026;
          border-radius: 3px 6px 4px 5px / 5px 3px 6px 4px;
          cursor: pointer;
          transform: rotate(-1.4deg);
          box-shadow:
            0 28px 58px rgba(0, 0, 0, 0.8),
            0 6px 16px rgba(0, 0, 0, 0.45),
            inset 0 0 0 1px rgba(124, 94, 58, 0.22);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: transform 0.35s ease, box-shadow 0.35s ease;
          transform-style: preserve-3d;
        }

        .folded-note-packet:hover:not(.is-opening) {
          transform: rotate(-0.5deg) translateY(-3px);
        }

        .letter-paper-grain {
          position: absolute;
          inset: 0;
          background-image: ${PAPER_GRAIN_SVG};
          opacity: 0.46;
          pointer-events: none;
          border-radius: inherit;
        }

        .letter-paper-fibres {
          position: absolute;
          inset: 0;
          background-image: ${PAPER_FIBRE_SVG};
          opacity: 0.35;
          pointer-events: none;
          border-radius: inherit;
        }

        .letter-sheet-lighting {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse at 24% 18%,
            rgba(255, 252, 244, 0.38) 0%,
            transparent 58%,
            rgba(116, 82, 50, 0.08) 100%
          );
          pointer-events: none;
          border-radius: inherit;
        }

        .letter-inner-peek {
          position: absolute;
          left: 8%;
          right: 8%;
          top: 10px;
          height: 78px;
          background: #faf3e4;
          border-radius: 2px;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.14);
          border: 1px solid rgba(130, 98, 62, 0.18);
          opacity: 0;
          pointer-events: none;
          z-index: 1;
        }

        .letter-peek-lines {
          margin: 14px 16px;
          height: 2px;
          background: rgba(112, 58, 68, 0.18);
          box-shadow:
            0 10px 0 rgba(112, 58, 68, 0.14),
            0 20px 0 rgba(112, 58, 68, 0.1);
        }

        .letter-envelope-flap {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          transform-origin: top center;
          background: linear-gradient(
            180deg,
            rgba(254, 248, 236, 0.94) 0%,
            rgba(227, 206, 174, 0.92) 92%,
            rgba(160, 126, 88, 0.36) 100%
          );
          clip-path: polygon(0 0, 100% 0, 50% 100%);
          border-bottom: 1px solid rgba(120, 88, 56, 0.25);
          pointer-events: none;
          z-index: 4;
        }

        .letter-envelope-crease {
          position: absolute;
          left: 7%;
          right: 7%;
          top: 53%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(124, 92, 62, 0.24) 24%,
            rgba(124, 92, 62, 0.28) 76%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 2;
        }

        .letter-packet-date {
          position: relative;
          z-index: 3;
          font-family: var(--font-letter-hand);
          font-size: 1.02rem;
          letter-spacing: 0.04em;
          color: #6b4e43;
          margin-top: 1.45rem;
        }

        .letter-packet-to {
          position: relative;
          z-index: 3;
          font-family: var(--font-letter-script);
          font-weight: 600;
          font-size: clamp(2.15rem, 6.8vw, 2.7rem);
          color: #4a1f2d;
          margin-top: 0.25rem;
          line-height: 1.15;
        }

        .letter-seal-dot {
          position: relative;
          z-index: 5;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          margin-top: 0.7rem;
          background: radial-gradient(circle at 35% 30%, #9b3048 0%, #6d192d 72%, #4a0e1d 100%);
          color: #f8e3ca;
          font-family: var(--font-serif);
          font-weight: 600;
          font-size: 0.96rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.34), inset 0 1px 2px rgba(255, 225, 200, 0.25);
        }

        .letter-packet-hint {
          position: relative;
          z-index: 3;
          margin-top: 0.85rem;
          font-size: 0.68rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(84, 56, 48, 0.74);
        }

        .letter-reading-wrap {
          margin: auto 0;
          width: 100%;
          max-width: 38.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 5;
        }

        /* Real Cream-Ivory Cotton Paper Sheet — no glassmorphism, no geometric borders */
        .letter-sheet {
          position: relative;
          width: 100%;
          background: linear-gradient(172deg, #faf2e2 0%, #f3e6cf 56%, #ead9bc 100%);
          color: #291c20;
          padding: clamp(1.2rem, 2.6vw, 2.05rem) clamp(1.15rem, 3.4vw, 2.35rem);
          border-radius: 3px 6px 4px 5px / 6px 3px 7px 4px;
          box-shadow:
            0 28px 66px rgba(0, 0, 0, 0.82),
            0 6px 18px rgba(0, 0, 0, 0.44),
            inset 0 0 28px rgba(138, 102, 64, 0.12);
          transform-origin: center center;
          animation: letterPaperUnfold 0.95s cubic-bezier(0.22, 0.92, 0.36, 1) forwards;
        }

        @keyframes letterPaperUnfold {
          0% {
            opacity: 0;
            transform: perspective(1000px) translateY(20px) rotateX(10deg) scaleY(0.82) rotate(-1.3deg);
          }
          100% {
            opacity: 1;
            transform: perspective(1000px) translateY(0) rotateX(0deg) scaleY(1) rotate(-0.35deg);
          }
        }

        .letter-sheet-crease-h {
          position: absolute;
          left: 2.5%;
          right: 2.5%;
          top: 50%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(118, 86, 56, 0.13) 20%,
            rgba(118, 86, 56, 0.16) 80%,
            transparent 100%
          );
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
          pointer-events: none;
        }

        .letter-sheet-crease-v {
          position: absolute;
          top: 3%;
          bottom: 3%;
          left: 50%;
          width: 1px;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(122, 90, 62, 0.09) 25%,
            rgba(122, 90, 62, 0.09) 75%,
            transparent 100%
          );
          pointer-events: none;
        }

        .letter-sheet-header {
          position: relative;
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 0.28rem;
          z-index: 4;
        }

        .letter-sheet-date {
          font-family: var(--font-letter-hand);
          font-size: clamp(0.95rem, 1.5vw, 1.08rem);
          letter-spacing: 0.04em;
          color: #775548;
        }

        .letter-sheet-body {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: clamp(0.42rem, 1dvh, 0.72rem);
          z-index: 4;
        }

        /* Progressive wet-ink darkening across handwritten strokes */
        .letter-ink-stroke {
          opacity: 0;
          color: #5f4144;
          transition:
            opacity 0.46s ease,
            color 0.65s ease;
        }

        .letter-ink-stroke.is-written {
          opacity: 1;
          color: #291c20;
        }

        .letter-text-greeting {
          font-family: var(--font-letter-script);
          font-weight: 700;
          font-size: clamp(1.95rem, 4.2vw, 2.55rem);
          line-height: 1.08;
          color: #5a1d2e;
        }

        .letter-text-greeting .letter-ink-stroke.is-written {
          color: #5a1d2e;
        }

        .letter-text-hand {
          font-family: var(--font-letter-hand);
          font-weight: 500;
          font-size: clamp(1.24rem, 2.25vw, 1.48rem);
          line-height: 1.32;
          letter-spacing: 0.01em;
          color: #291c20;
        }

        .letter-text-signature {
          margin-top: 0.1rem;
          font-family: var(--font-letter-script);
          font-weight: 600;
          font-size: clamp(1.62rem, 3.1vw, 2.02rem);
          line-height: 1.15;
          color: #521a2a;
        }

        .letter-text-signature .letter-ink-stroke.is-written {
          color: #521a2a;
        }

        .letter-svg-signoff {
          display: flex;
          justify-content: flex-end;
          margin-top: -0.2rem;
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .letter-svg-signoff.is-visible {
          opacity: 1;
        }

        .letter-svg-umar {
          width: clamp(114px, 24vw, 152px);
          height: auto;
          overflow: visible;
        }

        .letter-continue-btn {
          margin-top: 0.85rem;
          opacity: 0;
          transform: translateY(8px);
          pointer-events: none;
          transition: opacity 0.55s ease, transform 0.55s ease;
        }

        .letter-continue-btn.is-ready {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        @media (max-width: 600px) {
          .letter-stage {
            padding: max(3.4rem, calc(var(--safe-top) + 2.7rem)) 0.65rem
              max(0.85rem, var(--safe-bottom));
          }

          .letter-sheet {
            padding: 0.95rem 1rem;
          }

          .letter-sheet-body {
            gap: 0.36rem;
          }

          .letter-text-greeting {
            font-size: 1.88rem;
          }

          .letter-text-hand {
            font-size: 1.18rem;
            line-height: 1.28;
          }

          .letter-text-signature {
            font-size: 1.52rem;
          }

          .letter-svg-umar {
            width: 102px;
          }

          .letter-continue-btn {
            margin-top: 0.6rem;
          }
        }
      `}</style>
    </section>
  );
}
