/** Lightweight dependency-free sparkline (SVG path). */
export function Sparkline({
  data,
  width = 120,
  height = 40,
  color = "var(--accent-mint)",
  fill = true,
  strokeWidth = 2,
  responsive = false,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  /** When true the SVG scales to fill its container width (keeps `height`). */
  responsive?: boolean;
  className?: string;
}) {
  // Intrinsic drawing space stays fixed; `responsive` lets CSS stretch the width.
  const svgProps = responsive
    ? { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: "none" as const, width: "100%", height }
    : { width, height };
  if (data.length < 2) return <svg {...svgProps} className={className} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = strokeWidth;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const gid = `spark-${Math.round(color.length * data.length)}-${Math.round(data[0])}`;

  return (
    <svg {...svgProps} className={className ? `overflow-visible ${className}` : "overflow-visible"}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
