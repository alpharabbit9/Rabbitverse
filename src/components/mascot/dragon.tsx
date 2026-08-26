"use client";

import { Crest, MascotShell } from "./shell";
import type { MascotProps } from "./types";

/**
 * Dragon — the boss pick. Two swept horns per side, a spined skull ridge and a
 * long scaled snout with bared fangs. Jade and bone against the purple aura.
 */
export function Dragon(props: MascotProps) {
  return (
    <MascotShell {...props}>
      {({ eyeColor, sleeping, celebrating }) => (
        <>
          <defs>
            <linearGradient id="dgscale" x1="30" y1="22" x2="90" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E4FFF6" />
              <stop offset="0.5" stopColor="#6FE3C0" />
              <stop offset="1" stopColor="#1F8571" />
            </linearGradient>
            <linearGradient id="dghorn" x1="24" y1="18" x2="52" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F4EFDD" />
              <stop offset="1" stopColor="#A99C7A" />
            </linearGradient>
            <linearGradient id="dgarmor" x1="42" y1="98" x2="78" y2="116" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>

          {/* ---- horns: swept blades rooted on the skull, plus a crown spine ---- */}
          <Crest celebrating={celebrating}>
            {/* left: base sits on the head's upper edge, tip sweeps back and up */}
            <polygon points="51,52 41,59 17,29 35,39" fill="url(#dghorn)" stroke="#8F8262" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="48,54 43,57 27,37" fill="#8A7C5C" opacity="0.35" />
            <polygon points="69,52 79,59 103,29 85,39" fill="url(#dghorn)" stroke="#8F8262" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="72,54 77,57 93,37" fill="#8A7C5C" opacity="0.35" />
            {/* crown spine + two flanking ridges */}
            <polygon points="55,49 60,33 65,49" fill="url(#dghorn)" stroke="#8F8262" strokeWidth="0.8" strokeLinejoin="round" />
            <polygon points="48,56 52,44 56,52" fill="url(#dghorn)" stroke="#8F8262" strokeWidth="0.7" strokeLinejoin="round" />
            <polygon points="72,56 68,44 64,52" fill="url(#dghorn)" stroke="#8F8262" strokeWidth="0.7" strokeLinejoin="round" />
          </Crest>

          {/* ---- head: scaled shield ---- */}
          <polygon points="60,45 85,63 82,90 60,107 38,90 35,63" fill="url(#dgscale)" stroke="#2C8C77" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="60,45 60,107 38,90 35,63" fill="#000" opacity="0.08" />
          <polygon points="60,45 35,63 47,59" fill="#fff" opacity="0.45" />
          {/* scale facets */}
          <g fill="#0E5C4E" opacity="0.28">
            <polygon points="44,66 49,63 53,67 48,70" />
            <polygon points="67,67 72,63 77,66 72,70" />
          </g>

          {/* ---- brow ridge ---- */}
          <polygon points="40,63 57,73 60,70 63,73 80,63 79,69 62,79 60,76 58,79 41,69" fill="#12352F" />

          {/* ---- reptile eyes ---- */}
          <g style={{ filter: `drop-shadow(0 0 5px ${eyeColor})` }}>
            {sleeping ? (
              <>
                <rect x="44" y="76" width="12" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
                <rect x="64" y="76" width="12" height="2.4" rx="1.2" fill={eyeColor} opacity="0.8" />
              </>
            ) : (
              <>
                <polygon points="44,74 56,78 50,83 44,80" fill={eyeColor} />
                <polygon points="76,74 64,78 70,83 76,80" fill={eyeColor} />
                <rect x="49" y="76" width="1.5" height="5.5" rx="0.7" fill="#0B2B25" />
                <rect x="69.5" y="76" width="1.5" height="5.5" rx="0.7" fill="#0B2B25" />
              </>
            )}
          </g>

          {/* ---- long snout, nostrils, fangs ---- */}
          <polygon points="52,82 68,82 64,103 56,103" fill="#EAFFF8" opacity="0.92" />
          <g fill="#0B2B25">
            <polygon points="56,86 58.5,86 57.5,89" />
            <polygon points="61.5,86 64,86 62.5,89" />
          </g>
          <path d={celebrating ? "M55 95c3 4 7 4 10 0" : "M55.5 95h9"} stroke="#0B2B25" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <polygon points="55,96 57,101 59,96" fill="#FBFFFE" />
          <polygon points="61,96 63,101 65,96" fill="#FBFFFE" />

          {/* ---- plated collar ---- */}
          <polygon points="42,101 60,111 78,101 71,99 60,106 49,99" fill="url(#dgarmor)" stroke="#0f766e" strokeWidth="0.8" strokeLinejoin="round" />
          <polygon points="57,104 60,108 63,104 60,105" fill="#D1FAE5" opacity="0.9" />
        </>
      )}
    </MascotShell>
  );
}
