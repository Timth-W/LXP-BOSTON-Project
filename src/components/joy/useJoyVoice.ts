"use client";

/**
 * Joy's voice. Two engines behind the same interface:
 * - "realtime": GPT Realtime 2.1 over WebRTC (needs OPENAI_API_KEY on the server);
 * - "demo": the browser's own speech synthesis and recognition, with simple rules.
 * The screen (JoyScreen) decides what Joy says in demo mode and reacts to the AI's tool calls.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/types";

export type JoyMode = "realtime" | "demo";
export type JoyStatus = "off" | "connecting" | "speaking" | "listening" | "thinking" | "waiting" | "error";

export interface JoyContext {
  role: "senior" | "companion" | "family";
  firstName: string;
  greeting: string;
  proposals: { id: string; line: string; label: string }[];
}

export interface JoyHandlers {
  /** Demo mode: what Joy answers to the user's words (may also highlight or open a card). */
  respond: (text: string) => Promise<string | null>;
  onShow: (proposalId: string) => void;
  onOpen: (proposalId: string) => void;
  onFind: (args: { category?: string; day?: string }) => Promise<{ proposal_id: string; line: string }[]>;
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function createRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined;
  return Ctor ? new Ctor() : null;
}

const LANG: Record<Locale, string> = { en: "en-GB", fr: "fr-FR" };

export function useJoyVoice(locale: Locale, handlers: JoyHandlers) {
  const [mode, setMode] = useState<JoyMode>("demo");
  const [status, setStatus] = useState<JoyStatus>("off");
  const [joyLine, setJoyLine] = useState("");
  const [userLine, setUserLine] = useState("");
  const [error, setError] = useState<"start" | "mic" | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [canListen, setCanListen] = useState(false);
  /** True once we know which engine to use. */
  const [ready, setReady] = useState(false);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const activeRef = useRef(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const timerRef = useRef<number | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef("");
  const micDeniedRef = useRef(false);
  /** Latest version of handleText, used by the speech recognition callback. */
  const handleTextRef = useRef<(text: string) => Promise<void>>(async () => {});

  /* Is GPT Realtime configured on the server? */
  useEffect(() => {
    setCanListen(createRecognition() !== null);
    fetch("/api/joy/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { realtime?: boolean } | null) => setMode(d?.realtime ? "realtime" : "demo"))
      .catch(() => setMode("demo"))
      .finally(() => setReady(true));
  }, []);

  /* ---------- Demo engine (browser voice) ---------- */

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const listenOnce = useCallback(() => {
    if (!activeRef.current) return;
    const r = createRecognition();
    if (!r || micDeniedRef.current) {
      setStatus("waiting");
      return;
    }
    recognitionRef.current?.abort();
    recognitionRef.current = r;
    r.lang = LANG[locale];
    r.interimResults = false;
    r.continuous = false;
    let heard = false;
    r.onresult = (e) => {
      heard = true;
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join(" ")
        .trim();
      if (text) void handleTextRef.current(text);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        micDeniedRef.current = true;
        setError("mic");
      }
    };
    r.onend = () => {
      if (!heard && activeRef.current) setStatus("waiting");
    };
    try {
      r.start();
      setStatus("listening");
    } catch {
      setStatus("waiting");
    }
  }, [locale]);

  const speak = useCallback(
    (text: string) => {
      setJoyLine(text);
      clearTimer();
      const done = () => {
        clearTimer();
        if (!activeRef.current) return;
        listenOnce();
      };
      const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
      // Fallback timer in case the browser never signals the end of speech.
      const estimate = Math.min(20_000, 1200 + text.split(/\s+/).length * 380);
      setStatus("speaking");
      if (synth && typeof SpeechSynthesisUtterance !== "undefined") {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = LANG[locale];
        u.rate = 0.95;
        const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(locale));
        if (voice) u.voice = voice;
        u.onend = done;
        u.onerror = done;
        synth.speak(u);
        timerRef.current = window.setTimeout(done, estimate + 4000);
      } else {
        timerRef.current = window.setTimeout(done, estimate);
      }
    },
    [locale, listenOnce],
  );

  /* ---------- Realtime engine (GPT Realtime over WebRTC) ---------- */

  const send = (event: object) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") dc.send(JSON.stringify(event));
  };

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    dcRef.current?.close();
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    if (audioRef.current) audioRef.current.srcObject = null;
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
    setStatus("off");
  }, []);

  async function onRealtimeEvent(raw: string) {
    let ev: { type: string; [k: string]: unknown };
    try {
      ev = JSON.parse(raw);
    } catch {
      return;
    }
    switch (ev.type) {
      case "output_audio_buffer.started":
      case "response.output_audio.delta":
        setStatus("speaking");
        break;
      case "output_audio_buffer.stopped":
      case "input_audio_buffer.speech_started":
        setStatus("listening");
        break;
      case "response.output_audio_transcript.delta":
      case "response.audio_transcript.delta":
        transcriptRef.current += String(ev.delta ?? "");
        setJoyLine(transcriptRef.current);
        break;
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
        setJoyLine(String(ev.transcript ?? transcriptRef.current));
        transcriptRef.current = "";
        break;
      case "conversation.item.input_audio_transcription.completed":
        setUserLine(String(ev.transcript ?? ""));
        setStatus("thinking");
        break;
      case "response.output_item.done": {
        // A finished function call from the model: { type: "function_call", name, call_id, arguments }.
        const item = ev.item as { type?: string; name?: string; call_id?: string; arguments?: string } | undefined;
        if (item?.type !== "function_call") break;
        const name = String(item.name);
        const callId = String(item.call_id);
        let args: Record<string, string> = {};
        try {
          args = JSON.parse(String(item.arguments || "{}"));
        } catch {
          /* keep empty arguments */
        }
        let output: unknown = { ok: true };
        if (name === "show_proposal") handlersRef.current.onShow(args.proposal_id);
        else if (name === "open_confirmation") {
          handlersRef.current.onOpen(args.proposal_id);
          output = { opened: true, note: "Nothing is booked yet: the user must tap the green button." };
        } else if (name === "find_activities") output = { activities: await handlersRef.current.onFind(args) };
        else if (name === "end_conversation") {
          window.setTimeout(stop, 2500);
          return;
        }
        send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) } });
        send({ type: "response.create" });
        break;
      }
      case "error":
        console.error("[joy] realtime error", ev);
        break;
    }
  }

  async function startRealtime(context: JoyContext) {
    const tokenRes = await fetch("/api/joy/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale, ...context }),
    });
    if (!tokenRes.ok) throw new Error("token");
    const { value } = (await tokenRes.json()) as { value: string };

    const pc = new RTCPeerConnection();
    pcRef.current = pc;
    const audio = audioRef.current ?? new Audio();
    audio.autoplay = true;
    audioRef.current = audio;
    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch {
      setError("mic");
      pc.addTransceiver("audio", { direction: "recvonly" });
    }
    const dc = pc.createDataChannel("oai-events");
    dcRef.current = dc;
    dc.onmessage = (e) => void onRealtimeEvent(String(e.data));
    dc.onopen = () => {
      // Joy speaks first: the greeting is in the session instructions.
      send({ type: "response.create" });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: { Authorization: `Bearer ${value}`, "Content-Type": "application/sdp" },
    });
    if (!sdpRes.ok) throw new Error("sdp");
    await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
  }

  /* ---------- Public interface ---------- */

  /** Must be called from a tap (browsers only play sound after a user gesture). */
  const start = useCallback(
    (context: JoyContext) => {
      setError(null);
      setUserLine("");
      activeRef.current = true;
      if (mode === "realtime") {
        setStatus("connecting");
        setJoyLine("");
        // Create the audio element inside the tap so the browser allows playback.
        audioRef.current = audioRef.current ?? new Audio();
        startRealtime(context).catch((err) => {
          console.error("[joy] realtime start failed, falling back to demo voice", err);
          stop();
          activeRef.current = true;
          setMode("demo");
          speak(context.greeting);
        });
      } else {
        speak(context.greeting);
      }
    },
    [mode, speak, stop, locale],
  );

  const handleText = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      setUserLine(clean);
      if (mode === "realtime" && dcRef.current) {
        send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: clean }] } });
        send({ type: "response.create" });
        setStatus("thinking");
        return;
      }
      activeRef.current = true;
      recognitionRef.current?.abort();
      setStatus("thinking");
      const reply = await handlersRef.current.respond(clean);
      if (reply) speak(reply);
      else if (activeRef.current) setStatus("waiting");
    },
    [mode, speak],
  );
  handleTextRef.current = handleText;

  /** Tell Joy what just happened in the app (for example a confirmation by tap). */
  const notify = useCallback(
    (appText: string, spoken: string) => {
      if (!activeRef.current) {
        setJoyLine(spoken);
        return;
      }
      if (mode === "realtime" && dcRef.current) {
        send({
          type: "conversation.item.create",
          item: { type: "message", role: "user", content: [{ type: "input_text", text: `[App] ${appText}` }] },
        });
        send({ type: "response.create" });
      } else {
        speak(spoken);
      }
    },
    [mode, speak],
  );

  const toggleMic = useCallback(() => {
    const next = !micOn;
    setMicOn(next);
    streamRef.current?.getAudioTracks().forEach((tr) => (tr.enabled = next));
    if (!next) recognitionRef.current?.abort();
  }, [micOn]);

  useEffect(() => stop, [stop]);

  return {
    ready,
    mode,
    status,
    active: status !== "off",
    joyLine,
    userLine,
    error,
    micOn,
    canListen,
    start,
    stop,
    sendText: handleText,
    listen: listenOnce,
    notify,
    toggleMic,
  };
}
