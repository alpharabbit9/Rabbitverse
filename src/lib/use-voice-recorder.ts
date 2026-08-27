/*
  The microphone side of the AI box's voice input (Phase D).

  Owns exactly one job: turn a tap into a recorded audio Blob, while exposing
  enough state for a live waveform, an elapsed timer and a hard 60-second cap.
  It does NOT transcribe — the caller passes the finished Blob to the
  `transcribe` Server Action. Keeping the network out of here leaves the hook
  pure browser I/O, and the recorder cleanly releasable on unmount.

  Browser-only APIs (`navigator.mediaDevices`, `MediaRecorder`, `AudioContext`)
  are all touched behind guards, so importing this into a client component is
  safe even though the module isn't itself a "use client" boundary.
*/
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** The hard cap the plan sets — long enough for a sentence, short enough to bound cost. */
export const MAX_RECORDING_SECONDS = 60;

/** MediaRecorder mime candidates, best first. `audio/mp4` is the Safari path. */
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

/** Filename (with the right extension) Groq should see for a given recorder mime. */
export function audioFileName(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp4" || base === "audio/x-m4a" || base === "audio/aac") return "recording.m4a";
  if (base === "audio/ogg") return "recording.ogg";
  if (base === "audio/wav" || base === "audio/x-wav") return "recording.wav";
  if (base === "audio/mpeg") return "recording.mp3";
  return "recording.webm";
}

/** Pick a supported mime, or `""` to let the browser choose its own default. */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

/** Whether this browser can record at all — recomputed on the client after mount. */
function recordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    (typeof window !== "undefined" &&
      !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext))
  );
}

export type VoiceRecorderState = "idle" | "recording";

export interface UseVoiceRecorder {
  /** `false` until mounted, and on browsers without MediaRecorder/getUserMedia. */
  supported: boolean;
  state: VoiceRecorderState;
  recording: boolean;
  /** Whole seconds elapsed, for the timer readout. */
  elapsed: number;
  /** Live node for the waveform; `null` while idle. */
  analyser: AnalyserNode | null;
  /** Request the mic and begin. Surfaces permission/hardware errors via `onError`. */
  start: () => Promise<void>;
  /** Stop and emit the recording through `onComplete`. */
  stop: () => void;
  /** Stop and discard — nothing is emitted. */
  cancel: () => void;
}

export function useVoiceRecorder({
  onComplete,
  onError,
  maxSeconds = MAX_RECORDING_SECONDS,
}: {
  onComplete: (audio: Blob, fileName: string) => void;
  onError: (message: string) => void;
  maxSeconds?: number;
}): UseVoiceRecorder {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // A client-only capability read. `useSyncExternalStore` renders `false` on the
  // server and during hydration, then the real value — no setState-in-effect,
  // and no hydration mismatch. The store never changes after load.
  const supported = useSyncExternalStore(
    () => () => {},
    () => recordingSupported(),
    () => false,
  );

  /** Release the mic, close the audio graph and clear the timer. Idempotent. */
  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    recorderRef.current = null;
    setAnalyser(null);
    setState("idle");
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop(); // fires onstop → emit + teardown
    else teardown();
  }, [teardown]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stop();
  }, [stop]);

  const start = useCallback(async () => {
    if (state === "recording") return;
    if (!recordingSupported()) {
      onError("Voice input isn't supported in this browser.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      onError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access is blocked — enable it in your browser settings."
          : name === "NotFoundError"
            ? "No microphone was found."
            : "Couldn't start the microphone.",
      );
      return;
    }

    cancelledRef.current = false;
    chunksRef.current = [];
    streamRef.current = stream;

    // Waveform graph: source → analyser, deliberately NOT wired to the speakers
    // (that would echo the mic straight back out).
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const node = audioCtx.createAnalyser();
      node.fftSize = 1024;
      node.smoothingTimeConstant = 0.8;
      audioCtx.createMediaStreamSource(stream).connect(node);
      setAnalyser(node);
    } catch {
      // A missing AnalyserNode only costs the waveform — recording still works.
      setAnalyser(null);
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      teardown();
      onError("Couldn't start recording on this device.");
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      const emit = !cancelledRef.current && blob.size > 0;
      teardown();
      if (emit) onComplete(blob, audioFileName(type));
    };

    recorder.start();
    setState("recording");
    setElapsed(0);

    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);
      if (secs >= maxSeconds) stop(); // auto-stop at the cap (`stop` is stable)
    }, 250);
  }, [state, onComplete, onError, teardown, maxSeconds, stop]);

  // Release the mic if the component unmounts mid-recording.
  useEffect(() => () => teardown(), [teardown]);

  return { supported, state, recording: state === "recording", elapsed, analyser, start, stop, cancel };
}
