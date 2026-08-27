"use client";

/*
  A live audio-bars visual for the voice recorder. Reads frequency data off the
  recorder's AnalyserNode each animation frame and paints a mirrored bar field.
  Pure decoration — if the analyser is null (older browser, or the graph failed
  to build) it renders a calm placeholder and the recording still works.
*/
import { useEffect, useRef } from "react";

/** How many bars to draw. Kept modest so it stays crisp on a phone. */
const BAR_COUNT = 28;

export function Waveform({ analyser, className }: { analyser: AnalyserNode | null; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolve the accent colours once from CSS so the bars follow the theme.
    const styles = getComputedStyle(canvas);
    const top = styles.getPropertyValue("--accent-purple").trim() || "#a78bfa";
    const bottom = styles.getPropertyValue("--accent-cyan").trim() || "#22d3ee";

    let raf = 0;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      const mid = height / 2;
      const slot = width / BAR_COUNT;
      const barW = Math.max(2, slot * 0.5);
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, top);
      grad.addColorStop(1, bottom);
      ctx.fillStyle = grad;

      if (data && analyser) {
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / BAR_COUNT) || 1;
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = data[i * step] / 255; // 0..1
          const h = Math.max(barW, v * (height - 4));
          const x = i * slot + (slot - barW) / 2;
          const r = barW / 2;
          roundedBar(ctx, x, mid - h / 2, barW, h, r);
        }
      } else {
        // Idle shimmer when there's no analyser — a low, gently varying baseline.
        const t = Date.now() / 320;
        for (let i = 0; i < BAR_COUNT; i++) {
          const h = barW + (Math.sin(t + i * 0.5) * 0.5 + 0.5) * 6;
          const x = i * slot + (slot - barW) / 2;
          roundedBar(ctx, x, mid - h / 2, barW, h, barW / 2);
        }
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [analyser]);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}

/** A vertical bar with fully rounded caps. */
function roundedBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
}
