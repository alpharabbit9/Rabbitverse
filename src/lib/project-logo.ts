/*
  Project logo upload.

  BROWSER-SIDE ON PURPOSE. The obvious alternative — post the file to a Server
  Action — runs into Next's Server Action body limit (1 MB by default), which a
  perfectly ordinary 1200px PNG clears without trying. Uploading straight from
  the browser to Supabase Storage skips the app server entirely, so the only
  ceiling is the bucket's own 2 MB one (see migration 0009), and that ceiling is
  enforced by Postgres rather than by the checks below.

  The checks below are therefore courtesy, not security: they exist so the user
  gets "that file is 6 MB" instantly instead of after a slow failed upload. The
  bucket's `file_size_limit` / `allowed_mime_types` and its owner-folder RLS
  policies are what actually hold.
*/

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const LOGO_BUCKET = "project-logos";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const LOGO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;
/** What the `<input type="file">` offers, and what the helper text promises. */
export const LOGO_ACCEPT = LOGO_MIME_TYPES.join(",");
export const LOGO_FORMATS_LABEL = "PNG, JPG, WEBP or SVG · up to 2 MB";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export type LogoUploadResult =
  | { ok: true; url: string | null; path: string | null }
  | { ok: false; error: string };

/** Reject the obvious cases before touching the network. */
export function validateLogoFile(file: File): string | null {
  if (!LOGO_MIME_TYPES.includes(file.type as (typeof LOGO_MIME_TYPES)[number])) {
    return "That format is not supported — use PNG, JPG, WEBP or SVG.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 2 MB.`;
  }
  return null;
}

/**
 * Upload one logo and return its public URL.
 *
 * In demo mode there is no bucket to upload to, so this resolves with a null
 * URL: the caller keeps its local object-URL preview and the project is created
 * without a stored logo. That is why `url` is nullable on the success case — a
 * missing logo is not an error, it is a project without a logo.
 */
export async function uploadProjectLogo(file: File): Promise<LogoUploadResult> {
  const invalid = validateLogoFile(file);
  if (invalid) return { ok: false, error: invalid };

  if (!isSupabaseConfigured) return { ok: true, url: null, path: null };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  // The first path segment must be the owner uuid — that is exactly what the
  // bucket policies check, so a wrong prefix fails at the database.
  const ext = EXTENSIONS[file.type] ?? "png";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });

  if (error) {
    const missingBucket = /bucket.*not.*found/i.test(error.message);
    return {
      ok: false,
      error: missingBucket
        ? "Logo storage is not set up yet — run the latest migration, or create the project without a logo."
        : error.message,
    };
  }

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, path };
}

/** Best-effort cleanup when a logo is replaced or removed before creation. */
export async function removeProjectLogo(path: string | null): Promise<void> {
  if (!path || !isSupabaseConfigured) return;
  try {
    await createClient().storage.from(LOGO_BUCKET).remove([path]);
  } catch {
    // An orphaned 40 KB file is not worth interrupting the user over.
  }
}
