/*
  Data export — everything Rabbit Verse holds about you, on demand.

  `GET /api/export`                  → one JSON file, every table
  `GET /api/export?table=expenses`   → that table as CSV

  RLS does the scoping: the route uses the cookie-bound client, so each `select`
  can only ever return the signed-in user's own rows — there is no `user_id`
  filter to get wrong here. Signed-out requests get a 401 rather than an empty
  file, so a bookmarked link can't quietly hand back "you have no data".

  The JSON body is streamed table by table rather than assembled in memory: a
  long-running account's `expenses` alone can run to thousands of rows, and the
  free tier's memory is not worth spending on a string that is written straight
  to a download.

  `push_subscriptions` is deliberately excluded — it holds per-device push keys,
  which are credentials for talking to the user's browser, not user data.
*/
import { NextResponse } from "next/server";
import { todayIn } from "@/lib/dates";
import { getLocaleContext } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Every owned table, in a sensible reading order. Keys of the JSON export. */
const TABLES = [
  "user_profiles",
  "expense_categories",
  "expenses",
  "projects",
  "project_tasks",
  "project_logs",
  "workout_plan_days",
  "workout_logs",
  "body_metrics",
  "journal_entries",
] as const;

type Table = (typeof TABLES)[number];

function isTable(value: string | null): value is Table {
  return !!value && (TABLES as readonly string[]).includes(value);
}

/** RFC 4180: quote anything containing a comma, quote or newline; double inner quotes. */
function csvCell(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  // Union of keys, not just the first row's — a nullable column can be absent.
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvCell(row[h])).join(","));
  return lines.join("\r\n");
}

function attachment(name: string, type: string): HeadersInit {
  return {
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${name}"`,
    // A personal data dump must never sit in a shared cache.
    "Cache-Control": "no-store, private",
  };
}

export async function GET(request: Request) {
  // Demo mode has no database to read and no client to build one with.
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to export your data." }, { status: 401 });

  const { tz } = await getLocaleContext();
  const stamp = todayIn(tz);
  const table = new URL(request.url).searchParams.get("table");

  if (table !== null) {
    if (!isTable(table)) return NextResponse.json({ error: "Unknown table." }, { status: 400 });
    const { data, error } = await supabase.from(table).select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return new Response(toCsv((data ?? []) as Record<string, unknown>[]), {
      headers: attachment(`rabbit-verse-${table}-${stamp}.csv`, "text/csv; charset=utf-8"),
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (s: string) => controller.enqueue(encoder.encode(s));
      write(`{\n  "exportedAt": ${JSON.stringify(new Date().toISOString())},\n  "timezone": ${JSON.stringify(tz)}`);
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select("*");
        // One unreadable table must not cost the user the other nine, so the
        // error travels in the file instead of failing the whole download.
        const value = error ? { error: error.message } : (data ?? []);
        write(`,\n  ${JSON.stringify(t)}: ${JSON.stringify(value, null, 2)}`);
      }
      write("\n}\n");
      controller.close();
    },
  });

  return new Response(stream, {
    headers: attachment(`rabbit-verse-${stamp}.json`, "application/json; charset=utf-8"),
  });
}
