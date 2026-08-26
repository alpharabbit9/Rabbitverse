"use client";

import { Crest, MascotShell } from "./shell";
import type { MascotProps } from "./types";

/**
 * Owl — the watcher. The one body that breaks the muzzle rule: a heart-shaped
 * facial disc, huge ringed eyes and a hooked beak where the others have a
 * snout. Its tufts are deliberately short and blunt so the silhouette can never
 * be mistaken for the Cat's or the Rabbit's at chip size.
 */
export function Owl(props: MascotProps) {
  return (
    <MascotShell {...props}>
      {({ eyeColor, sleeping, celebrating }) => (
        <>
          <defs>
            <linearGradient id="owfeather" x1="30" y1="20" x2="90" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E8EFFF" />
              <stop offset="0.55" stopColor="#9FB2E4" />
              <stop offset="1" stopColor="#5C6FA8" />
            </linearGradient>
            <linearGradient id="owtuft" x1="34" y1="32" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#D7E1FA" />
              <stop offset="1" stopColor="#7C8CC0" />
            </linearGradient>
            <linearGradient id="owdisc" x1="60" y1="52" x2="60" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDFEFF" />
              <stop offset="1" stopColor="#C6D3F0" />
            </linearGradient>
            <linearGradient id="owarmor" x1="42" y1="98" x2="78" y2="116" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
          </defs>

          {/* ---- tufts: short, blunt, swept outward ---- */}
          <Crest celebrating={celebrating}>
            <polygon points="45,55 30,33 51,46" fill="url(#owtuft)" stroke="#7787BA" strokeWidth="1" strokeLinejoin="round" />
            <polygon points="75,55 90,33 69,46" fill="url(#owtuft)" stroke="#7787BA" strokeWidth="1" strokeLinejoin="round" />
          </Crest>

          {/* ---- head: wide shield ---- */}
          <polygon points="60,45 87,64 83,91 60,107 37,91 33,64" fill="url(#owfeather)" stroke="#6E7DAF" strokeWidth="1.2" strokeLinejoin="round" />
          <polygon points="60,45 60,107 37,91 33,64" fill="#000" opacity="0.07" />
          <polygon points="60,45 33,64 46,59" fill="#fff" opacity="0.4" />

          {/* ---- heart-shaped facial disc: the owl's whole tell ---- */}
          <path
            d="M60 52c11 0 20 8 20 19 0 13-9 24-20 30-11-6-20-17-20-30 0-11 9-19 20-19z"
            fill="url(#owdisc)"
            opacity="0.85"
            stroke="#8393C4"
            strokeWidth="1"
          />
          {/* the disc's centre seam */}
          <path d="M60 53v10" stroke="#8393C4" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />

          {/* ---- big ringed eyes ---- */}
          <g style={{ filter: `drop-shadow(0 0 5px ${eyeColor})` }}>
            {sleeping ? (
              <>
                <path d="M42 78c3.5-5 10.5-5 14 0" stroke={eyeColor} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85" />
                <path d="M64 78c3.5-5 10.5-5 14 0" stroke={eyeColor} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85" />
              </>
            ) : (
              <>
                <circle cx="49" cy="77" r="9" fill={eyeColor} />
                <circle cx="71" cy="77" r="9" fill={eyeColor} />
                <circle cx="49" cy="77" r="9" fill="none" stroke="#232B4A" strokeWidth="1.6" />
                <circle cx="71" cy="77" r="9" fill="none" stroke="#232B4A" strokeWidth="1.6" />
                <circle cx="49" cy="77" r="3.9" fill="#141A33" />
                <circle cx="71" cy="77" r="3.9" fill="#141A33" />
                <circle cx="51.4" cy="74.4" r="1.5" fill="#fff" opacity="0.85" />
                <circle cx="73.4" cy="74.4" r="1.5" fill="#fff" opacity="0.85" />
              </>
            )}
          </g>

          {/* ---- hooked beak ---- */}
          <polygon points="55,87 65,87 60,100" fill="#F4C05A" stroke="#C08A24" strokeWidth="0.9" strokeLinejoin="round" />
          <path d={celebrating ? "M56 92h8" : "M57 91h6"} stroke="#B07E1F" strokeWidth="1.4" strokeLinecap="round" fill="none" />

          {/* ---- chest plate ---- */}
          <polygon points="43,101 60,111 77,101 70,99 60,106 50,99" fill="url(#owarmor)" stroke="#3730a3" strokeWidth="0.8" strokeLinejoin="round" />
          <polygon points="57,104 60,108 63,104 60,105" fill="#E0F2FE" opacity="0.9" />
        </>
      )}
    </MascotShell>
  );
}
