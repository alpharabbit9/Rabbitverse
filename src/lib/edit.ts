/*
  Shared validation for Phase F "edit" paths.

  Logging is fenced to today+yesterday so a streak can't be retro-fabricated.
  Editing is the opposite: correcting a row you genuinely logged three weeks ago
  makes the history *truer*, so it has NO lower bound — any real past date is
  allowed. The only rule that survives is "not in the future". Keep this in mind
  before a later session "fixes" edit back to the logging window.
*/

/** A yyyy-mm-dd string that is a real date and not after `today`. */
export function isEditableDate(date: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  // Lexical compare is correct for zero-padded ISO day strings.
  return date <= today;
}
