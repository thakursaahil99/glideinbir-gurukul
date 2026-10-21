/** The bird mark as plain SVG for `next/og` images (no CSS variables there). */
export function BirdSvg({ width }: { width: number }) {
  return (
    <svg width={width} height={(width * 40) / 64} viewBox="0 0 64 40">
      <defs>
        <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffae3d" />
          <stop offset="50%" stopColor="#ff6b85" />
          <stop offset="100%" stopColor="#8b7bff" />
        </linearGradient>
      </defs>
      <path
        fill="url(#g)"
        d="M2 23C13 15 23 15 30 21C35 9 47 2 62 3C51 8 43 16 39 26C37 31 32 33 27 30C21 27 12 24 2 23Z"
      />
      <path fill="url(#g)" opacity="0.55" d="M27 30L19 37L31 33Z" />
    </svg>
  );
}
