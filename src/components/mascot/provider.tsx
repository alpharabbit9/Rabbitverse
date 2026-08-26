"use client";

import { createContext, useContext, useMemo } from "react";
import { MASCOTS, type MascotEntry } from "./registry";
import { DEFAULT_MASCOT, resolveMascot, type MascotSpecies } from "./types";

/*
  Carries the user's chosen creature down to the two components that draw it.

  Seeded once in `(app)/layout.tsx` from `getSession()`. A layout cannot hand
  props to the page below it, and both render sites sit several levels inside
  their pages, so context is the only way down that does not thread a `species`
  prop through every view. Demo mode seeds the rabbit.
*/

interface MascotContextValue extends MascotEntry {
  species: MascotSpecies;
}

function entryFor(species: MascotSpecies): MascotContextValue {
  return { species, ...MASCOTS[species] };
}

const MascotCtx = createContext<MascotContextValue>(entryFor(DEFAULT_MASCOT));

export function MascotProvider({
  species,
  children,
}: {
  species: string;
  children: React.ReactNode;
}) {
  const value = useMemo(() => entryFor(resolveMascot(species)), [species]);
  return <MascotCtx.Provider value={value}>{children}</MascotCtx.Provider>;
}

/** `{ species, name, Component, copy }` for whoever the user picked. */
export function useMascot(): MascotContextValue {
  return useContext(MascotCtx);
}
