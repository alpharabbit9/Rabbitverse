"use client";

import { Crest, MascotShell } from "./shell";
import type { MascotProps } from "./types";

/**
 * Cat — the opportunist. The smallest head in the registry, with low wide ears
 * (kept short on purpose so it never reads as the Rabbit), slit pupils, a pink
 * nose and swept whiskers. Violet palette, closest to the app accent.
 */
export function Cat(props: MascotProps) {
  return (
    <MascotShell {...props}>
      {({ eyeColor, sleeping, celebrating }) => (
        <>
          <defs>
            <linearGradient id="ctfur" x1="32" y1="22" x2="88" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F7EDFF" />
              <stop offset="0.55" stopColor="#C9A8F5" />
              <stop offset="1" stopColor="#8155CE" />
            </linearGradient>
            <linearGradient id="ctear" x1="40" y1="26" x2="58" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EFE1FF" />
              <stop offset="1" stopColor="#A87BE8" />
            </linearGradient>
            <linearGradient id="ctarmor" x1="42" y1="98" x2="78" y2="116" gradientUnits="userSpaceOnUse">
              <stop stopColor="#A855F7" />
              <stop offset="1" stopColor="#DB2777" />
            </linearGradient>
          </defs>

          {/* ---- ears: tight triangles, set close ---- */}
          <Crest celebrating={celebrating}>
            <polygon points="40,60 32,36 58,50" fill="url(#ctear)" stroke="#9A6EDD" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="42,57 37,42 53,50" fill="#F2A8C6" opacity="0.7" />
            <polygon points="80,60 88,36 62,50" fill="url(#ctear)" stroke="#9A6EDD" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="78,57 83,42 67,50" fill="#F2A8C6" opacity="0.7" />
          </Crest>

          {/* ---- head: compact shield ---- */}
          <polygon points="60,48 83,64 80,90 60,105 40,90 37,64" fill="url(#ctfur)" stroke="#9068CF" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="60,48 60,105 40,90 37,64" fill="#000" opacity="0.07" />
          <polygon points="60,48 37,64 49,60" fill="#fff" opacity="0.5" />

          {/* ---- brow ---- */}
          <polygon points="42,64 57,73 60,70 63,73 78,64 77,69 62,78 60,75 58,78 43,69" fill="#2C2145" />

          {/* ---- slit eyes ---- */}
          <g style={{ filter: `drop-shadow(0 0 4px ${eyeColor})` }}>
            {sleeping ? (
              <>
                <path d="M45 79c3-3.5 8-3.5 11 0" stroke={eyeColor} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
                <path d="M64 79c3-3.5 8-3.5 11 0" stroke={eyeColor} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85" />
              </>
            ) : (
              <>
                <polygon points="45,75 56,78 51,83 45,80" fill={eyeColor} />
                <polygon points="75,75 64,78 69,83 75,80" fill={eyeColor} />
                <rect x="50" y="76" width="1.6" height="5.5" rx="0.8" fill="#2C2145" />
                <rect x="68.4" y="76" width="1.6" height="5.5" rx="0.8" fill="#2C2145" />
              </>
            )}
          </g>

          {/* ---- small muzzle + whiskers ---- */}
          <polygon points="54,83 66,83 60,96" fill="#FBF3FF" opacity="0.95" />
          <polygon points="56,85 64,85 60,90" fill="#F2789F" />
          <path d={celebrating ? "M55 93c2.5 3.5 7 3.5 9.5 0" : "M56 93h8"} stroke="#2C2145" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <g stroke="#FBF3FF" strokeWidth="1.1" strokeLinecap="round" opacity="0.8">
            <path d="M52 88 38 85" />
            <path d="M52 91 39 92" />
            <path d="M68 88 82 85" />
            <path d="M68 91 81 92" />
          </g>

          {/* ---- collar with a bell notch ---- */}
          <polygon points="44,100 60,110 76,100 69,98 60,105 51,98" fill="url(#ctarmor)" stroke="#9333ea" strokeWidth="0.8" strokeLinejoin="round" />
          <polygon points="57,103 60,107 63,103 60,104" fill="#FCE7F3" opacity="0.9" />
        </>
      )}
    </MascotShell>
  );
}
