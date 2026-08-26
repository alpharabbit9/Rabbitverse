/*
  Thin Groq client wrapper for the AI natural-language logging layer.

  SERVER-ONLY: reads the private `GROQ_API_KEY` env var, so this module must only
  be imported from Server Components / Server Actions — never from a "use client"
  module. (The project doesn't install the `server-only` package; keep this
  boundary by convention, as the rest of the data layer does.)

  Groq exposes an OpenAI-compatible chat API; we use it in JSON mode for
  structured extraction. See `parse-log.ts` for the prompt + schema.
*/
import Groq from "groq-sdk";

/**
 * Default model — fast, cheap, strong enough for sentence→schema extraction.
 *
 * The V2 plan named `llama-3.3-70b-versatile`, but Groq has since retired it
 * (the API 404s with `model_not_found`). `openai/gpt-oss-120b` is the strongest
 * JSON-mode model on the current roster and parsed every test sentence cleanly.
 * Swapping models is a one-line change — nothing downstream depends on this id.
 */
export const GROQ_MODEL = "openai/gpt-oss-120b";

let client: Groq | null = null;

/** Lazily construct a singleton Groq client. Throws if the key is missing. */
export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set — add it to .env.local (see SUPABASE_SETUP.md).");
  }
  if (!client) client = new Groq({ apiKey });
  return client;
}

/** Whether the AI layer is configured (used to fall back to demo/manual flows). */
export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
