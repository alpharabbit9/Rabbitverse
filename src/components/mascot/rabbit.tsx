"use client";

import { Crest, MascotShell } from "./shell";
import type { MascotProps } from "./types";

/**
 * Rabbit — the default. A battle-ready warrior hare, not a soft cartoon.
 * Angular "esports crest" build: swept blade ears (one battle-notched), a heavy
 * brow, glowing predator eyes, and an armored collar.
 *
 * This is the reference body for the whole registry: the head shield, muzzle
 * and collar geometry here are the shape every other species is cut from, so
 * they read as one family. Code-drawn (v1); a photoreal render can be generated
 * later via Higgsfield from the same direction.
 */
export function Rabbit(props: MascotProps) {
  return (
    <MascotShell {...props}>
      {({ eyeColor, sleeping, celebrating }) => (
        <>
          <defs>
            <linearGradient id="rvsteel" x1="30" y1="20" x2="90" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FBFDFF" />
              <stop offset="0.55" stopColor="#D7DEF2" />
              <stop offset="1" stopColor="#AEB8D6" />
            </linearGradient>
            <linearGradient id="rvarmor" x1="42" y1="98" x2="78" y2="116" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#5B7CFA" />
            </linearGradient>
            <linearGradient id="rvear" x1="40" y1="10" x2="60" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E9ECFA" />
              <stop offset="1" stopColor="#B9C2DE" />
            </linearGradient>
          </defs>

          {/* ---- ears: swept-back blades, right ear battle-notched ---- */}
          <Crest celebrating={celebrating}>
            <polygon points="49,57 33,55 24,13 45,30" fill="url(#rvear)" stroke="#95A0C4" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="47,52 37,49 31,24 44,36" fill="#7C5CF5" opacity="0.45" />
            {/* right ear with a V notch near the tip */}
            <polygon points="71,57 87,55 96,13 90,26 92,20 82,29 75,30" fill="url(#rvear)" stroke="#95A0C4" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="73,52 83,49 89,24 76,36" fill="#7C5CF5" opacity="0.45" />
          </Crest>

          {/* ---- head: angular shield ---- */}
          <polygon points="60,47 86,64 83,92 60,106 37,92 34,64" fill="url(#rvsteel)" stroke="#8A94B8" strokeWidth="1.2" strokeLinejoin="round" />
          {/* facet shading */}
          <polygon points="60,47 60,106 37,92 34,64" fill="#000" opacity="0.06" />
          <polygon points="60,47 34,64 47,60" fill="#fff" opacity="0.5" />

          {/* ---- heavy brow (fierce) ---- */}
          <polygon points="39,64 57,73 60,70 63,73 81,64 80,70 62,79 60,76 58,79 40,70" fill="#2A3350" />

          {/* ---- predator eyes ---- */}
          <g style={{ filter: `drop-shadow(0 0 4px ${eyeColor})` }}>
            {sleeping ? (
              <>
                <rect x="44" y="76" width="12" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
                <rect x="64" y="76" width="12" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
              </>
            ) : (
              <>
                <polygon points="44,74 55,77 52,82 44,79" fill={eyeColor} />
                <polygon points="76,74 65,77 68,82 76,79" fill={eyeColor} />
              </>
            )}
          </g>

          {/* ---- muzzle + nose + set jaw ---- */}
          <polygon points="53,83 67,83 60,99" fill="#EDF1FF" opacity="0.9" />
          <polygon points="56,86 64,86 60,91" fill="#1B2138" />
          <path d={celebrating ? "M54 93c3 4 9 4 12 0" : "M55 93h10"} stroke="#1B2138" strokeWidth="2.4" strokeLinecap="round" fill="none" />

          {/* ---- armored collar (built for glory) ---- */}
          <polygon points="42,101 60,111 78,101 71,99 60,106 49,99" fill="url(#rvarmor)" stroke="#6d4bf0" strokeWidth="0.8" strokeLinejoin="round" />
          <polygon points="57,104 60,108 63,104 60,105" fill="#EAE6FF" opacity="0.9" />
        </>
      )}
    </MascotShell>
  );
}
