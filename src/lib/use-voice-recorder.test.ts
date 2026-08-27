import { describe, expect, it } from "vitest";
import { audioFileName } from "./use-voice-recorder";

/**
 * `audioFileName` is what tells Groq which format the clip is — Whisper reads
 * the extension, not the MediaRecorder mime — so the mapping has to survive the
 * `;codecs=…` suffixes browsers append and fall back sanely for anything odd.
 */
describe("audioFileName", () => {
  it("maps the common recorder mimes to the right extension", () => {
    expect(audioFileName("audio/webm;codecs=opus")).toBe("recording.webm");
    expect(audioFileName("audio/webm")).toBe("recording.webm");
    expect(audioFileName("audio/mp4")).toBe("recording.m4a"); // Safari's path
    expect(audioFileName("audio/mp4;codecs=mp4a.40.2")).toBe("recording.m4a");
    expect(audioFileName("audio/ogg;codecs=opus")).toBe("recording.ogg");
    expect(audioFileName("audio/wav")).toBe("recording.wav");
    expect(audioFileName("audio/mpeg")).toBe("recording.mp3");
  });

  it("is case-insensitive and tolerates whitespace", () => {
    expect(audioFileName("AUDIO/MP4")).toBe("recording.m4a");
    expect(audioFileName(" audio/webm ; codecs=opus")).toBe("recording.webm");
  });

  it("falls back to webm for an unknown or empty mime", () => {
    expect(audioFileName("")).toBe("recording.webm");
    expect(audioFileName("application/octet-stream")).toBe("recording.webm");
  });
});
