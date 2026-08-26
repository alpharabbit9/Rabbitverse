/*
  Server-only read of the user's targets out of `user_profiles.settings.targets`.
  Kept separate from the pure `lib/targets.ts` so client components can import
  the types/normaliser without dragging the Supabase server client along.
*/
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TARGETS, type Targets, parseTargets } from "@/lib/targets";

/**
 * The signed-in user's targets, defaults when nothing has been saved yet.
 *
 * `React.cache()`d: a single route asks for targets from the page, the warning
 * banner and the mood pipeline, and each call used to open its own query — two
 * or three reads of the same row per request. Caching is per-request, so a
 * `saveTargets` + `revalidatePath` still shows the new value immediately.
 */
export const getTargets = cache(async (): Promise<Targets> => {
  const supabase = await createClient();
  const { data } = await supabase.from("user_profiles").select("settings").maybeSingle();
  if (!data) return { ...DEFAULT_TARGETS };
  const settings = (data.settings ?? {}) as { targets?: unknown };
  return parseTargets(settings.targets);
});
