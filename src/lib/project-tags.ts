/*
  Project tags — the shared preset set and its ceiling.

  Both the Create New Project page and the detail-view `TagEditor` offer the same
  chips, so the list lives here rather than being copied into each. The column is
  a free `text[]` (0006), but the UI only ever writes from this set; the server
  actions cap each tag at 40 chars and the whole list at MAX_PROJECT_TAGS.
*/

export const PROJECT_PRESET_TAGS = [
  "Full-stack", "Frontend", "Backend", "AI Agent", "ML/AI",
  "Mobile", "Web", "API", "Data", "DevOps", "Design", "Game", "Other",
] as const;

/** How many tags one project may carry. */
export const MAX_PROJECT_TAGS = 10;

/** The one place that turns any tag list into what a project row may store. */
export function sanitiseTags(tags: readonly string[] | null | undefined): string[] {
  return (tags ?? [])
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, MAX_PROJECT_TAGS);
}
