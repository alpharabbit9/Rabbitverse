/*
  The species registry — the one place that maps a stored `mascot` string to a
  drawing. Add a creature by writing its file and adding a line here; nothing
  else in the app knows the list exists.
*/
import type { ComponentType } from "react";
import { Cat } from "./cat";
import { Dragon } from "./dragon";
import { Fox } from "./fox";
import { Owl } from "./owl";
import { Rabbit } from "./rabbit";
import { Wolf } from "./wolf";
import {
  MASCOT_COPY,
  MASCOT_NAMES,
  MASCOT_SPECIES,
  type MascotCopy,
  type MascotProps,
  type MascotSpecies,
} from "./types";

export interface MascotEntry {
  /** Display name — "Fox". Also the `{name} says` heading. */
  name: string;
  Component: ComponentType<MascotProps>;
  copy: MascotCopy;
}

export const MASCOTS: Record<MascotSpecies, MascotEntry> = {
  rabbit: { name: MASCOT_NAMES.rabbit, Component: Rabbit, copy: MASCOT_COPY.rabbit },
  fox: { name: MASCOT_NAMES.fox, Component: Fox, copy: MASCOT_COPY.fox },
  wolf: { name: MASCOT_NAMES.wolf, Component: Wolf, copy: MASCOT_COPY.wolf },
  owl: { name: MASCOT_NAMES.owl, Component: Owl, copy: MASCOT_COPY.owl },
  cat: { name: MASCOT_NAMES.cat, Component: Cat, copy: MASCOT_COPY.cat },
  dragon: { name: MASCOT_NAMES.dragon, Component: Dragon, copy: MASCOT_COPY.dragon },
};

/** The picker's order — the default first, then the rest as declared. */
export const MASCOT_ORDER = MASCOT_SPECIES;

export { DEFAULT_MASCOT, resolveMascot } from "./types";
export type { MascotCopy, MascotProps, MascotSpecies, MascotState } from "./types";
