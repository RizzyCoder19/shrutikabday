"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  SHRUTI_CHAT_PROFILE,
  type ChatConversation,
} from "@/content/chats";
import { useExperienceStore } from "@/state/experience-store";
import { audioSynth } from "@/lib/audio/audio-synthesizer";
import {
  ArrowRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Pause,
  Play,
  ShieldAlert,
  Smartphone,
  UserRound,
} from "lucide-react";

interface SelfBuildingChatPhoneProps {
  conversation: ChatConversation;
  nextLabel: string;
  onCompleteAdvance: () => void;
}

/**
 * Reusable Self-Constructing Dark-Mode Instagram DM Interface.
 * Matches original Shruti Instagram screenshots + Fragment01 geometry & pacing,
 * revealing rows sequentially so early messages stay visible at the top and never
 * fight manual upward scrolling.
 */
export function SelfBuildingChatPhone({
  conversation,
  nextLabel,
  onCompleteAdvance,
}: SelfBuildingChatPhoneProps) {
  const soundEnabled = useExperienceStore((s) => s.soundEnabled);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const [viewMode, setViewMode] = useState<"phone" | "raw">("phone");
  const [rawIdx, setRawIdx] = useState(0);
  const [activeStatusTime, setActiveStatusTime] = useState(conversation.statusBarTime);
  const [activeBatteryPct, setActiveBatteryPct] = useState(conversation.batteryPct);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [isComposerActive, setIsComposerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [readingReady, setReadingReady] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const deviceRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const wakeVeilRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dividerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seenReceiptRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const userScrolledUpRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    setViewMode("phone");
    setRawIdx(0);
    setActiveStatusTime(conversation.statusBarTime);
    setActiveBatteryPct(conversation.batteryPct);
    setIsPaused(false);
    setReadingReady(false);
    setIsExiting(false);
    userScrolledUpRef.current = false;
    lastScrollTopRef.current = 0;
  }, [conversation.id, conversation.statusBarTime, conversation.batteryPct]);

  const scrollToBottomIfFollowing = (instant = false) => {
    const scrollBox = scrollRef.current;
    if (!scrollBox || userScrolledUpRef.current) return;
    const maxScrollTop = Math.max(0, scrollBox.scrollHeight - scrollBox.clientHeight);
    if (maxScrollTop <= 0) return;

    if (Math.abs(scrollBox.scrollTop - maxScrollTop) < 2) {
      lastScrollTopRef.current = scrollBox.scrollTop;
      return;
    }

    isAutoScrollingRef.current = true;
    if (instant) {
      gsap.killTweensOf(scrollBox);
      scrollBox.scrollTop = maxScrollTop;
      lastScrollTopRef.current = maxScrollTop;
      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
      return;
    }

    gsap.to(scrollBox, {
      scrollTop: maxScrollTop,
      duration: 0.28,
      ease: "power2.out",
      overwrite: "auto",
      onUpdate: () => {
        if (scrollRef.current) {
          lastScrollTopRef.current = scrollRef.current.scrollTop;
        }
      },
      onComplete: () => {
        isAutoScrollingRef.current = false;
        if (scrollRef.current) {
          lastScrollTopRef.current = scrollRef.current.scrollTop;
        }
      },
      onInterrupt: () => {
        isAutoScrollingRef.current = false;
      },
    });
  };

  // Layout-aware scroll listener: pauses auto-follow when user scrolls up, resumes when back at bottom
  const handleScrollBox = () => {
    const scrollBox = scrollRef.current;
    if (!scrollBox) return;
    const currentTop = scrollBox.scrollTop;
    const distFromBottom =
      scrollBox.scrollHeight - currentTop - scrollBox.clientHeight;

    if (!isAutoScrollingRef.current) {
      if (currentTop < lastScrollTopRef.current - 3 && distFromBottom > 36) {
        gsap.killTweensOf(scrollBox);
        userScrolledUpRef.current = true;
      } else if (distFromBottom <= 36) {
        userScrolledUpRef.current = false;
      }
    } else if (distFromBottom <= 36) {
      userScrolledUpRef.current = false;
    }

    lastScrollTopRef.current = currentTop;
  };

  // Keep layout-aware bottom following synced with React state changes & content growth
  useEffect(() => {
    if (isPaused) return;
    const contentEl = scrollContentRef.current;
    if (!contentEl) return;

    let rafId = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => scrollToBottomIfFollowing());
    });
    ro.observe(contentEl);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [conversation.id, isPaused]);

  useEffect(() => {
    if (!showTypingIndicator) return;
    const rafId = requestAnimationFrame(() => scrollToBottomIfFollowing());
    return () => cancelAnimationFrame(rafId);
  }, [showTypingIndicator]);

  // Self-building phone entrance & sequential message timeline (keyed strictly to conversation, never viewMode)
  useEffect(() => {
    const device = deviceRef.current;
    const screen = screenRef.current;
    const wakeVeil = wakeVeilRef.current;
    const header = headerRef.current;
    const profileEl = profileRef.current;
    const scrollBox = scrollRef.current;
    if (!device || !screen || !scrollBox) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(device, { opacity: 1, clearProps: "transform" });
      gsap.set(screen, { opacity: 1, clearProps: "filter,transform" });
      if (wakeVeil) {
        wakeVeil.style.display = "none";
      }
      if (header) gsap.set(header, { opacity: 1 });
      if (profileEl) gsap.set(profileEl, { opacity: 1, clearProps: "transform" });
      dateRefs.current.forEach((d) => {
        if (d) {
          d.style.display = "block";
          gsap.set(d, { opacity: 1, clearProps: "transform" });
        }
      });
      dividerRefs.current.forEach((d) => {
        if (d) {
          d.style.display = "flex";
          gsap.set(d, { opacity: 0.72 });
        }
      });
      rowRefs.current.forEach((r) => {
        if (r) {
          r.style.display = "flex";
          gsap.set(r, { opacity: 1, clearProps: "transform" });
        }
      });
      const lastWithStatus = [...conversation.messages]
        .reverse()
        .find((m) => m.statusBarTimeOverride || m.batteryPctOverride);
      if (lastWithStatus?.statusBarTimeOverride) {
        setActiveStatusTime(lastWithStatus.statusBarTimeOverride);
      }
      if (lastWithStatus?.batteryPctOverride !== undefined) {
        setActiveBatteryPct(lastWithStatus.batteryPctOverride);
      }
      if (seenReceiptRef.current) {
        seenReceiptRef.current.style.display = "flex";
        gsap.set(seenReceiptRef.current, { opacity: 1, clearProps: "transform" });
      }
      requestAnimationFrame(() => scrollToBottomIfFollowing(true));
      setReadingReady(true);
      return;
    }

    setReadingReady(false);
    setShowTypingIndicator(false);
    setIsComposerActive(false);
    setComposerText("");
    setActiveStatusTime(conversation.statusBarTime);
    setActiveBatteryPct(conversation.batteryPct);
    userScrolledUpRef.current = false;
    isAutoScrollingRef.current = false;
    lastScrollTopRef.current = 0;

    // Keep unrevealed rows & dates display:none so scrollHeight ONLY grows as messages actually arrive!
    dateRefs.current.forEach((d) => {
      if (d) {
        d.style.display = "none";
        gsap.set(d, { opacity: 0, y: 6 });
      }
    });
    dividerRefs.current.forEach((d) => {
      if (d) {
        d.style.display = "none";
        gsap.set(d, { opacity: 0 });
      }
    });
    rowRefs.current.forEach((r) => {
      if (r) {
        r.style.display = "none";
        gsap.set(r, { opacity: 0, y: 8 });
      }
    });
    if (seenReceiptRef.current) {
      seenReceiptRef.current.style.display = "none";
      gsap.set(seenReceiptRef.current, { opacity: 0 });
    }
    scrollBox.scrollTop = 0;

    const tl = gsap.timeline();
    timelineRef.current = tl;

    // Exact Stage 0: Phone silhouette -> OLED Veil wake (zero filter blur on crisp text!) -> Header -> Profile -> 1.1s breathe
    tl.fromTo(
      device,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 1.4, ease: "power2.out", clearProps: "transform" }
    );

    if (wakeVeil) {
      wakeVeil.style.display = "block";
      tl.set(screen, { opacity: 1, clearProps: "filter,transform" }, "-=0.9");
      tl.fromTo(
        wakeVeil,
        { opacity: 0.92 },
        {
          opacity: 0,
          duration: 1.2,
          ease: "power2.out",
          onComplete: () => {
            if (wakeVeil) wakeVeil.style.display = "none";
          },
        },
        "<"
      );
    } else {
      tl.fromTo(
        screen,
        { opacity: 0.2 },
        { opacity: 1, duration: 1.2, ease: "power2.out" },
        "-=0.9"
      );
    }

    tl.call(() => {
      if (soundEnabledRef.current) audioSynth.playDeviceWake();
    });

    if (header) {
      tl.fromTo(
        header,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out" },
        "-=0.5"
      );
    }

    if (profileEl) {
      tl.fromTo(
        profileEl,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", clearProps: "transform" },
        "-=0.35"
      );
    }

    tl.to({}, { duration: 1.1 });

    // Beat D — Sequential message construction matching Fragment01Phone timing
    conversation.messages.forEach((msg, idx) => {
      const pause = msg.delayAfterPrevSec;
      const dateEl = dateRefs.current[idx];
      const divEl = dividerRefs.current[idx];
      const row = rowRefs.current[idx];

      if (msg.overnightGapBefore && idx > 0) {
        tl.to({}, { duration: 1.5 });
      }

      if (msg.statusBarTimeOverride || msg.batteryPctOverride !== undefined) {
        tl.call(() => {
          if (msg.statusBarTimeOverride) setActiveStatusTime(msg.statusBarTimeOverride);
          if (msg.batteryPctOverride !== undefined) setActiveBatteryPct(msg.batteryPctOverride);
        });
      }

      if (divEl) {
        tl.call(() => {
          divEl.style.display = "flex";
          requestAnimationFrame(() => scrollToBottomIfFollowing());
        });
        tl.fromTo(divEl, { opacity: 0 }, { opacity: 0.72, duration: 0.65, ease: "power2.out" });
        tl.to({}, { duration: 0.4 });
      }

      if (dateEl) {
        tl.call(() => {
          dateEl.style.display = "block";
          requestAnimationFrame(() => scrollToBottomIfFollowing());
        });
        tl.fromTo(
          dateEl,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
        tl.to({}, { duration: msg.overnightGapBefore ? 0.65 : 0.35 });
      }

      if (msg.sender === "shruti") {
        const typingDur = 0.75;
        const waitBefore = Math.max(0.3, pause - typingDur);
        tl.to({}, { duration: waitBefore });
        tl.call(() => {
          setShowTypingIndicator(true);
          requestAnimationFrame(() => scrollToBottomIfFollowing());
        });
        tl.to({}, { duration: typingDur });
        tl.call(() => setShowTypingIndicator(false));
      } else {
        const glyphs =
          msg.text.length > 50
            ? "•••••••••••••••"
            : msg.text.length > 24
              ? "•••••••••••"
              : "•••••••";
        const waitBefore = Math.max(0.25, pause - 0.55);
        tl.to({}, { duration: waitBefore });
        tl.call(() => setIsComposerActive(true));
        for (let g = 1; g <= glyphs.length; g++) {
          const step = 0.065 + (g % 3 === 0 ? 0.025 : 0.012);
          tl.to({}, { duration: step });
          tl.call(() => {
            setComposerText(glyphs.slice(0, g));
            if (soundEnabledRef.current) audioSynth.playTypingClick();
          });
        }
        tl.to({}, { duration: 0.22 });
        tl.call(() => {
          setComposerText("");
          setIsComposerActive(false);
        });
      }

      tl.call(() => {
        if (soundEnabledRef.current) {
          audioSynth.playMessageArrival(msg.sender === "me");
        }
        if (row) {
          row.style.display = "flex";
          requestAnimationFrame(() => scrollToBottomIfFollowing());
        }
      });

      if (row) {
        tl.fromTo(
          row,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            ease: "power2.out",
            clearProps: "transform",
          }
        );
      }
    });

    if (conversation.showSeenReceipt && seenReceiptRef.current) {
      tl.to({}, { duration: 0.45 });
      tl.call(() => {
        if (seenReceiptRef.current) {
          seenReceiptRef.current.style.display = "flex";
          requestAnimationFrame(() => scrollToBottomIfFollowing());
        }
      });
      tl.fromTo(
        seenReceiptRef.current,
        { opacity: 0, y: 4 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          clearProps: "transform",
        }
      );
    }

    // Exact Fragment01Phone final reading breathe (3.0s)
    tl.to({}, { duration: conversation.readingPauseSec });
    tl.call(() => setReadingReady(true));

    return () => {
      timelineRef.current = null;
      tl.kill();
    };
  }, [conversation]);

  const handleTogglePause = () => {
    const tl = timelineRef.current;
    if (!tl || readingReady) return;
    if (isPaused) {
      tl.resume();
      setIsPaused(false);
    } else {
      tl.pause();
      setIsPaused(true);
    }
  };

  // Beat F — Graceful exit and transition
  const handleExitAndNext = () => {
    if (isExiting) return;
    setIsExiting(true);
    if (soundEnabledRef.current) audioSynth.playGentleChime(659.25);

    const target = deviceRef.current;
    if (target && viewMode === "phone") {
      gsap.to(target, {
        opacity: 0,
        scale: 0.97,
        filter: "blur(6px)",
        duration: 0.6,
        ease: "power2.inOut",
        onComplete: onCompleteAdvance,
      });
    } else {
      setTimeout(onCompleteAdvance, 280);
    }
  };

  const activeRaw = conversation.sourceScreenshots[rawIdx];

  return (
    <div className="f1-canvas">
      {/* Keep phone DOM live inside f1-phone-holder when viewing raw screenshot so conversation & scroll never reset */}
      <div
        className={`f1-phone-holder ${viewMode === "phone" ? "is-active" : "is-background"}`}
        aria-hidden={viewMode !== "phone"}
      >
        <div ref={deviceRef} className="f1-phone-device" style={{ opacity: 0 }}>
          <div className="f1-phone-notch" />

          <div ref={screenRef} className="f1-phone-screen" style={{ opacity: 0 }}>
            <div ref={wakeVeilRef} className="f1-oled-wake-veil" aria-hidden="true" />
            {/* Status Bar */}
            <div className="f1-status-bar">
              <span className="f1-status-time">{activeStatusTime}</span>
              <div className="f1-status-icons">
                <svg
                  className="f1-icon-signal"
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="currentColor"
                >
                  <rect x="2" y="16" width="3" height="6" rx="0.8" />
                  <rect x="7" y="12" width="3" height="10" rx="0.8" />
                  <rect x="12" y="8" width="3" height="14" rx="0.8" />
                  <rect x="17" y="4" width="3" height="18" rx="0.8" />
                </svg>
                <span className="f1-status-5g">5G</span>
                <div className="f1-status-battery">
                  <span className="f1-battery-level">{activeBatteryPct}</span>
                  <div className="f1-battery-body">
                    <div
                      className="f1-battery-fill"
                      style={{ width: `${activeBatteryPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Authentic Instagram DM Header (Audio Call & Video Call icons) */}
            <div ref={headerRef} className="f1-dm-header" style={{ opacity: 0 }}>
              <div className="f1-header-left">
                <button type="button" className="f1-btn-back" aria-label="Back">
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>

                <div className="f1-avatar-ring">
                  <img
                    src={SHRUTI_CHAT_PROFILE.avatar}
                    alt="Shruti"
                    className="f1-avatar-img"
                  />
                </div>

                <div className="f1-user-meta">
                  <div className="f1-user-name">{SHRUTI_CHAT_PROFILE.displayName}</div>
                  <div className="f1-user-handle">{SHRUTI_CHAT_PROFILE.handle}</div>
                </div>
              </div>

              <div className="f1-header-right" aria-hidden="true">
                <button type="button" className="f1-header-action" aria-label="Audio Call">
                  <svg
                    viewBox="0 0 24 24"
                    width="21"
                    height="21"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </button>

                <button type="button" className="f1-header-action" aria-label="Video Call">
                  <svg
                    viewBox="0 0 24 24"
                    width="23"
                    height="23"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="5" width="14" height="14" rx="3.5" />
                    <polygon points="23 7 16 12 23 17 23 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conversation Thread */}
            <div
              ref={scrollRef}
              onScroll={handleScrollBox}
              onWheel={(e) => {
                if (e.deltaY < 0 && scrollRef.current) {
                  const box = scrollRef.current;
                  const dist = box.scrollHeight - box.scrollTop - box.clientHeight;
                  if (dist > 12 || box.scrollTop > 0) {
                    gsap.killTweensOf(box);
                    isAutoScrollingRef.current = false;
                    userScrolledUpRef.current = true;
                  }
                }
              }}
              onTouchStart={(e) => {
                touchStartYRef.current = e.touches[0]?.clientY ?? null;
              }}
              onTouchMove={(e) => {
                const startY = touchStartYRef.current;
                const currY = e.touches[0]?.clientY;
                if (startY !== null && currY !== undefined && currY - startY > 8 && scrollRef.current) {
                  gsap.killTweensOf(scrollRef.current);
                  isAutoScrollingRef.current = false;
                  userScrolledUpRef.current = true;
                }
              }}
              className="f1-message-scroll"
            >
              <div
                ref={scrollContentRef}
                style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%" }}
              >
              {/* Initial Instagram Chat Opening Card (exact match to 1000019990.jpg) */}
              {conversation.showProfileIntro && (
                <div ref={profileRef} className="f1-profile-intro" style={{ opacity: 0 }}>
                  <img
                    src={SHRUTI_CHAT_PROFILE.avatar}
                    alt=""
                    className="f1-profile-avatar"
                  />
                  <span className="f1-profile-name">{SHRUTI_CHAT_PROFILE.displayName}</span>
                  <span className="f1-profile-sub">
                    {SHRUTI_CHAT_PROFILE.handle} • {SHRUTI_CHAT_PROFILE.joined}
                  </span>
                  <div className="f1-profile-actions" aria-hidden="true">
                    <div className="f1-profile-action">
                      <UserRound size={21} strokeWidth={1.8} />
                      <span>Profile</span>
                    </div>
                    <div className="f1-profile-action">
                      <ShieldAlert size={21} strokeWidth={1.8} />
                      <span>
                        Safety
                        <br />
                        tips
                      </span>
                    </div>
                    <div className="f1-profile-action">
                      <Ban size={21} strokeWidth={1.8} />
                      <span>Block</span>
                    </div>
                  </div>
                </div>
              )}

              {conversation.messages.map((msg, idx) => {
                const isShruti = msg.sender === "shruti";
                const prevMsg = conversation.messages[idx - 1];
                const nextMsg = conversation.messages[idx + 1];
                const isEmoji = msg.messageType === "emoji";

                const joinTop =
                  !isEmoji &&
                  Boolean(prevMsg) &&
                  prevMsg.sender === msg.sender &&
                  prevMsg.messageType !== "emoji" &&
                  !msg.dateBefore &&
                  !msg.replyContext &&
                  !msg.quotedReply;
                const joinBottom =
                  !isEmoji &&
                  Boolean(nextMsg) &&
                  nextMsg.sender === msg.sender &&
                  nextMsg.messageType !== "emoji" &&
                  !nextMsg.dateBefore &&
                  !nextMsg.replyContext &&
                  !nextMsg.quotedReply;

                const showAvatar =
                  isShruti &&
                  (!nextMsg || nextMsg.sender !== "shruti" || Boolean(nextMsg.dateBefore));

                return (
                  <React.Fragment key={msg.id}>
                    {msg.storyBeatDivider && (
                      <div
                        ref={(el) => {
                          dividerRefs.current[idx] = el;
                        }}
                        className="f1-date-pill f1-date-secondary"
                        style={{ display: "none", opacity: 0, letterSpacing: "0.26em" }}
                      >
                        {msg.storyBeatDivider}
                      </div>
                    )}

                    {msg.dateBefore && (
                      <div
                        ref={(el) => {
                          dateRefs.current[idx] = el;
                        }}
                        className={`f1-date-pill ${
                          msg.overnightGapBefore ? "f1-date-secondary" : ""
                        }`}
                        style={{ display: "none", opacity: 0 }}
                      >
                        {msg.dateBefore}
                      </div>
                    )}

                    <div
                      ref={(el) => {
                        rowRefs.current[idx] = el;
                      }}
                      className="f1-msg-row"
                      style={{ display: "none", opacity: 0 }}
                    >
                      {msg.replyContext && (
                        <div
                          className={`f1-story-context ${
                            isShruti ? "f1-story-context--left" : "f1-story-context--right"
                          }`}
                        >
                          <span className="f1-story-label">{msg.replyContext}</span>
                          <div className="f1-story-unavail-row">
                            {isShruti && <span className="f1-quote-bar" aria-hidden="true" />}
                            <span className="f1-story-unavail-text">Story unavailable</span>
                            {!isShruti && <span className="f1-quote-bar" aria-hidden="true" />}
                          </div>
                        </div>
                      )}

                      {msg.quotedReply && (
                        <div
                          className={`f1-quoted-wrap ${
                            isShruti ? "f1-quoted-wrap--left" : "f1-quoted-wrap--right"
                          }`}
                        >
                          <span className="f1-quoted-label">{msg.quotedReply.label}</span>
                          <div className="f1-quoted-bar-row">
                            {isShruti && <span className="f1-quote-bar" aria-hidden="true" />}
                            <div
                              className={`f1-quoted-pill ${
                                msg.quotedReply.quoteFrom === "me"
                                  ? "f1-quoted-pill--purple"
                                  : "f1-quoted-pill--dark"
                              }`}
                            >
                              {msg.quotedReply.preview}
                            </div>
                            {!isShruti && <span className="f1-quote-bar" aria-hidden="true" />}
                          </div>
                        </div>
                      )}

                      <div
                        className={`f1-msg-line ${
                          isShruti ? "f1-msg-line-incoming" : "f1-msg-line-outgoing"
                        }`}
                      >
                        {isShruti && (
                          <div className="f1-msg-avatar-slot">
                            {showAvatar ? (
                              <img
                                src={SHRUTI_CHAT_PROFILE.avatar}
                                alt=""
                                className="f1-msg-small-avatar"
                              />
                            ) : null}
                          </div>
                        )}

                        <div
                          className={`f1-bubble-wrap ${
                            msg.reaction ? "f1-bubble-wrap--with-reaction" : ""
                          }`}
                        >
                          <div
                            className={`f1-bubble ${
                              isShruti ? "f1-bubble-incoming" : "f1-bubble-outgoing"
                            } ${joinTop ? "f1-group-join-top" : ""} ${
                              joinBottom ? "f1-group-join-bottom" : ""
                            } ${isEmoji ? "f1-bubble-emoji" : ""}`}
                          >
                            {msg.text}
                          </div>
                          {msg.reaction && <div className="f1-reaction-chip">{msg.reaction}</div>}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {showTypingIndicator && (
                <div className="f1-ig-typing-row">
                  <div className="f1-msg-avatar-slot">
                    <img
                      src={SHRUTI_CHAT_PROFILE.avatar}
                      alt=""
                      className="f1-msg-small-avatar"
                    />
                  </div>
                  <div className="f1-ig-typing-bubble">
                    <span className="f1-ig-dot" />
                    <span className="f1-ig-dot" />
                    <span className="f1-ig-dot" />
                  </div>
                </div>
              )}

              {conversation.showSeenReceipt && (
                <div
                  ref={seenReceiptRef}
                  className="f1-seen-receipt"
                  style={{ display: "none", opacity: 0 }}
                >
                  <span className="f1-seen-label">Seen</span>
                  <img
                    src={SHRUTI_CHAT_PROFILE.avatar}
                    alt=""
                    className="f1-seen-avatar"
                  />
                </div>
              )}
              <div ref={bottomAnchorRef} style={{ height: 1, flexShrink: 0 }} aria-hidden="true" />
              </div>
            </div>

            {/* Authentic Instagram Composer Bar (Blue camera icon inside left of dark grey pill) */}
            <div className="f1-dm-composer">
              <div className="f1-composer-pill">
                <button type="button" className="f1-btn-camera" aria-label="Camera">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                    <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm0-2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm7-2h-3.17l-1.24-1.35A2 2 0 0 0 13.12 3H10.88a2 2 0 0 0-1.47.65L8.17 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
                  </svg>
                </button>

                <div className="f1-composer-input-area">
                  {isComposerActive ? (
                    <div className="f1-composer-typing-text">
                      <span className="f1-typing-symbols">{composerText}</span>
                      <span className="f1-composer-cursor" />
                    </div>
                  ) : (
                    <span className="f1-composer-placeholder">Message...</span>
                  )}
                </div>

                <div className="f1-composer-glyphs" aria-hidden="true">
                  <button type="button" className="f1-glyph-btn" aria-label="Voice">
                    <svg
                      viewBox="0 0 24 24"
                      width="19"
                      height="19"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                    </svg>
                  </button>
                  <button type="button" className="f1-glyph-btn" aria-label="Gallery">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                  <button type="button" className="f1-glyph-btn" aria-label="Sticker">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </button>
                  <button type="button" className="f1-glyph-btn" aria-label="Add">
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="f1-home-indicator-bar" />
          </div>
        </div>
      </div>

      {/* Original Verification Screenshot Viewer Overlay (preserves completed phone state underneath) */}
      {viewMode === "raw" && (
        <div className="f1-raw-preview-wrap" role="dialog" aria-label="Original Instagram screenshot">
          <img
            src={activeRaw.src}
            alt={activeRaw.label}
            className="f1-raw-preview-img"
          />
          {conversation.sourceScreenshots.length > 1 && (
            <div className="f1-raw-nav">
              <button
                type="button"
                className="hud-btn"
                onClick={() =>
                  setRawIdx(
                    (i) =>
                      (i - 1 + conversation.sourceScreenshots.length) %
                      conversation.sourceScreenshots.length
                  )
                }
                aria-label="Previous original screenshot"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="f1-raw-label">{activeRaw.label}</span>
              <button
                type="button"
                className="hud-btn"
                onClick={() =>
                  setRawIdx((i) => (i + 1) % conversation.sourceScreenshots.length)
                }
                aria-label="Next original screenshot"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Playback controls during playback; Screenshot + Advance controls revealed ONLY after moment finishes */}
      <div className="f1-actions-bar">
        {!readingReady && viewMode === "phone" && (
          <button
            type="button"
            className="hud-btn"
            onClick={handleTogglePause}
            aria-label={isPaused ? "Resume messages" : "Pause messages"}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>
        )}

        {readingReady && (
          <div className="f1-post-actions">
            <button
              type="button"
              className="hud-btn"
              onClick={() => {
                setViewMode((m) => (m === "phone" ? "raw" : "phone"));
                if (soundEnabledRef.current) audioSynth.playGentleChime(587.33);
              }}
            >
              {viewMode === "phone" ? (
                <>
                  <ImageIcon size={13} />
                  <span>Original Screenshot</span>
                </>
              ) : (
                <>
                  <Smartphone size={13} />
                  <span>Back to Phone</span>
                </>
              )}
            </button>

            {viewMode === "phone" && (
              <button
                type="button"
                className="scene-continue-btn"
                onClick={handleExitAndNext}
              >
                <span>{nextLabel}</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
