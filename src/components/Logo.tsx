/**
 * JoyTo logo: two figures (round heads, teardrop bodies) leaning on each other to form a heart.
 * Drawn in SVG so it stays sharp at any size. Colours come from the brand sheet.
 */
const BODY = "M0 0 C-7 -9 -14 -19 -14 -30 A14 14 0 0 1 14 -30 C14 -19 7 -9 0 0 Z";

export function LogoMark({ size = 40, tone = "colour", title }: { size?: number; tone?: "colour" | "light"; title?: string }) {
  const left = tone === "light" ? "#F4EFE5" : "#203B52";
  const right = tone === "light" ? "#D99D7B" : "#D99D7B";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <g transform="translate(50 82)">
        <path d={BODY} transform="rotate(-34)" fill={left} />
        <path d={BODY} transform="rotate(34)" fill={right} />
      </g>
      <circle cx="28" cy="27" r="9.5" fill={left} />
      <circle cx="72" cy="27" r="9.5" fill={right} />
    </svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      <span className="wordmark-joy">Joy</span>
      <span className="wordmark-to">To</span>
    </span>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <Wordmark size={Math.round(size * 0.72)} />
    </span>
  );
}
