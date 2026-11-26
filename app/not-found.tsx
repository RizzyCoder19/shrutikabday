import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
        color: "var(--color-soft-ivory)",
        background: "var(--color-deep-plum)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "2.4rem",
          marginBottom: "1rem",
          color: "var(--color-champagne-gold)",
        }}
      >
        A Quiet Path in the Stars
      </h2>
      <p style={{ marginBottom: "2rem", color: "rgba(255, 242, 228, 0.75)" }}>
        This page could not be found.
      </p>
      <Link
        href="/"
        className="btn-cinematic"
        style={{ textDecoration: "none" }}
      >
        Return to the Journey
      </Link>
    </div>
  );
}
