"use client";

import { Crest, MascotShell } from "./shell";
import type { MascotProps } from "./types";

/**
 * Fox — the strategist. Same crest silhouette as the Rabbit, cut narrower:
 * broad swept ears, a long tapered snout and a cheek ruff. Ember palette.
 */
export function Fox(props: MascotProps) {
  return (
    <MascotShell {...props}>
      {({ eyeColor, sleeping, celebrating }) => (
        <>
          <defs>
            <linearGradient id="fxfur" x1="30" y1="20" x2="90" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE7C4" />
              <stop offset="0.5" stopColor="#F5A85C" />
              <stop offset="1" stopColor="#C9662A" />
            </linearGradient>
            <linearGradient id="fxear" x1="30" y1="16" x2="56" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFD9A5" />
              <stop offset="1" stopColor="#D9762F" />
            </linearGradient>
            <linearGradient id="fxarmor" x1="42" y1="98" x2="78" y2="116" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* ---- ears: broad blades, left one nicked ---- */}
          <Crest celebrating={celebrating}>
            <polygon points="37,63 56,51 29,18 33,30 30,25" fill="url(#fxear)" stroke="#B9601F" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="39,60 51,53 33,28" fill="#5B2410" opacity="0.75" />
            <polygon points="83,63 64,51 91,18" fill="url(#fxear)" stroke="#B9601F" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="81,60 69,53 87,28" fill="#5B2410" opacity="0.75" />
          </Crest>

          {/* ---- head: narrow shield ---- */}
          <polygon points="60,47 84,63 80,90 60,107 40,90 36,63" fill="url(#fxfur)" stroke="#B4682C" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="60,47 60,107 40,90 36,63" fill="#000" opacity="0.07" />
          <polygon points="60,47 36,63 48,60" fill="#fff" opacity="0.45" />

          {/* ---- cheek ruff: two swept spikes ---- */}
          <polygon points="37,72 26,79 38,85" fill="url(#fxfur)" stroke="#B4682C" strokeWidth="0.9" strokeLinejoin="round" />
          <polygon points="83,72 94,79 82,85" fill="url(#fxfur)" stroke="#B4682C" strokeWidth="0.9" strokeLinejoin="round" />

          {/* ---- heavy brow ---- */}
          <polygon points="41,64 57,73 60,70 63,73 79,64 78,70 62,79 60,76 58,79 42,70" fill="#3B2114" />

          {/* ---- narrowed, calculating eyes ---- */}
          <g style={{ filter: `drop-shadow(0 0 4px ${eyeColor})` }}>
            {sleeping ? (
              <>
                <rect x="45" y="76" width="11" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
                <rect x="64" y="76" width="11" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
              </>
            ) : (
              <>
                <polygon points="45,74 56,78 51,82 45,79" fill={eyeColor} />
                <polygon points="75,74 64,78 69,82 75,79" fill={eyeColor} />
              </>
            )}
          </g>

          {/* ---- long snout + black nose ---- */}
          <polygon points="52,82 68,82 60,102" fill="#FFF3E2" opacity="0.95" />
          <polygon points="56,86 64,86 60,92" fill="#231710" />
          <path d={celebrating ? "M55 95c2.5 4 8 4 10.5 0" : "M56 95h9"} stroke="#231710" strokeWidth="2.2" strokeLinecap="round" fill="none" />

          {/* ---- collar ---- */}
          <polygon points="43,101 60,111 77,101 70,99 60,106 50,99" fill="url(#fxarmor)" stroke="#92400e" strokeWidth="0.8" strokeLinejoin="round" />
          <polygon points="57,104 60,108 63,104 60,105" fill="#FFEFD5" opacity="0.9" />
        </>
      )}
    </MascotShell>
  );
}
