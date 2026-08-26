"use client";

import { Crest, MascotShell } from "./shell";
import type { MascotProps } from "./types";

/**
 * Wolf — the pack leader. The widest head in the registry: short upright ears
 * set far apart, a heavy jaw with bared fangs, and a jagged neck ruff.
 */
export function Wolf(props: MascotProps) {
  return (
    <MascotShell {...props}>
      {({ eyeColor, sleeping, celebrating }) => (
        <>
          <defs>
            <linearGradient id="wffur" x1="28" y1="20" x2="92" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F2F5FC" />
              <stop offset="0.55" stopColor="#AEB9D2" />
              <stop offset="1" stopColor="#6C7794" />
            </linearGradient>
            <linearGradient id="wfear" x1="34" y1="20" x2="54" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DCE3F2" />
              <stop offset="1" stopColor="#8894B2" />
            </linearGradient>
            <linearGradient id="wfarmor" x1="42" y1="98" x2="78" y2="116" gradientUnits="userSpaceOnUse">
              <stop stopColor="#64748B" />
              <stop offset="1" stopColor="#334155" />
            </linearGradient>
          </defs>

          {/* ---- ears: short, upright, set wide ---- */}
          <Crest celebrating={celebrating}>
            <polygon points="34,62 54,56 38,21" fill="url(#wfear)" stroke="#7C88A6" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="37,58 50,55 39,31" fill="#2F3A55" opacity="0.6" />
            <polygon points="86,62 66,56 82,21" fill="url(#wfear)" stroke="#7C88A6" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="83,58 70,55 81,31" fill="#2F3A55" opacity="0.6" />
          </Crest>

          {/* ---- head: broad shield ---- */}
          <polygon points="60,46 88,64 84,92 60,108 36,92 32,64" fill="url(#wffur)" stroke="#78849F" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="60,46 60,108 36,92 32,64" fill="#000" opacity="0.08" />
          <polygon points="60,46 32,64 46,60" fill="#fff" opacity="0.45" />

          {/* ---- heavy brow ---- */}
          <polygon points="37,64 57,74 60,70 63,74 83,64 82,70 62,80 60,77 58,80 38,70" fill="#212942" />

          {/* ---- eyes ---- */}
          <g style={{ filter: `drop-shadow(0 0 4px ${eyeColor})` }}>
            {sleeping ? (
              <>
                <rect x="42" y="77" width="13" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
                <rect x="65" y="77" width="13" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
              </>
            ) : (
              <>
                <polygon points="42,75 55,78 51,83 42,80" fill={eyeColor} />
                <polygon points="78,75 65,78 69,83 78,80" fill={eyeColor} />
              </>
            )}
          </g>

          {/* ---- broad muzzle + bared fangs ---- */}
          <polygon points="51,84 69,84 60,100" fill="#EEF2FC" opacity="0.92" />
          <polygon points="55,86 65,86 60,92" fill="#161C2E" />
          <path d={celebrating ? "M54 94c3 4 9 4 12 0" : "M54 94h12"} stroke="#161C2E" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <polygon points="55,95 57,100 59,95" fill="#FBFDFF" />
          <polygon points="61,95 63,100 65,95" fill="#FBFDFF" />

          {/* ---- jagged neck ruff over the collar ---- */}
          <polygon points="38,97 46,104 52,98 60,106 68,98 74,104 82,97 78,108 60,114 42,108" fill="url(#wfarmor)" stroke="#293548" strokeWidth="0.8" strokeLinejoin="round" />
          <polygon points="57,105 60,109 63,105 60,106" fill="#E2E8F0" opacity="0.9" />
        </>
      )}
    </MascotShell>
  );
}
