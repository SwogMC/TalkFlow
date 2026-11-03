"use client";

import { useEffect, useRef, useState } from "react";

export type DictationEngine = "browser" | "muse";

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type DictationOptions = {
  getDraft: () => string;
  setDraft: (value: string) => void;
  onError: (message: string | null) => void;
};

const FRAME_SAMPLES = 1920;

function speechRecognitionConstructor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function joinDraft(prefix: string, spoken: string) {
  const clean = spoken.replace(/\s+/g, " ").trim();
  if (!clean) return prefix;
  return [prefix, clean].filter(Boolean).join(prefix ? " " : "");
}

export function useDictation({ getDraft, setDraft, onError }: DictationOptions) {
  const [listening, setListening] = useState(false);
  const [engine, setEngine] = useState<DictationEngine | null>(null);
  const wantRef = useRef(false);
  const sessionRef = useRef(0);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const museAbortRef = useRef<AbortController | null>(null);
  const museStopRef = useRef<(() => void) | null>(null);
  const prefixRef = useRef("");

  function publish(session: number, text: string) {
    if (sessionRef.current !== session) return;
    setDraft(text);
  }

  function stopListening() {
    sessionRef.current += 1;
    wantRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    museAbortRef.current?.abort();
    museAbortRef.current = null;
    museStopRef.current?.();
    museStopRef.current = null;
    setListening(false);
    setEngine(null);
  }

  function startBrowser(session: number) {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      wantRef.current = false;
      setListening(false);
      onError("This browser does not support speech recognition. You can type your message.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    prefixRef.current = getDraft().trim();
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const piece = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) finalText += piece;
        else interimText += piece;
      }
      publish(session, joinDraft(prefixRef.current, `${finalText}${interimText}`));
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        wantRef.current = false;
        setListening(false);
        onError("Microphone permission is missing. You can type your message.");
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      if (!wantRef.current || sessionRef.current !== session) {
        if (sessionRef.current === session) setListening(false);
        return;
      }
      window.setTimeout(() => {
        if (wantRef.current && sessionRef.current === session) startBrowser(session);
      }, 250);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setEngine("browser");
      setListening(true);
      onError(null);
    } catch {
      wantRef.current = false;
      setListening(false);
      onError("The microphone could not be started. Check the browser permission.");
    }
  }

  async function startMuse(session: number) {
    prefixRef.current = getDraft().trim();
    const audio = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    if (sessionRef.current !== session) {
      audio.getTracks().forEach((track) => track.stop());
      return;
    }

    const context = new AudioContext();
    await context.audioWorklet.addModule("/pcm-worklet.js");
    const source = context.createMediaStreamSource(audio);
    const node = new AudioWorkletNode(context, "pcm-processor");
    const rate = context.sampleRate;
    let pending: number[] = [];
    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
    });

    const pushPcm = (samples: Float32Array) => {
      if (!streamController || sessionRef.current !== session) return;
      const step = rate / 24000;
      for (let index = 0; index < samples.length; index += step) {
        const sample = Math.max(-1, Math.min(1, samples[Math.floor(index)] ?? 0));
        pending.push(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      }
      while (pending.length >= FRAME_SAMPLES && streamController) {
        const frame = new Int16Array(pending.slice(0, FRAME_SAMPLES));
        pending = pending.slice(FRAME_SAMPLES);
        streamController.enqueue(new Uint8Array(frame.buffer));
      }
    };

    node.port.onmessage = (event: MessageEvent<Float32Array>) => {
      pushPcm(event.data);
    };
    source.connect(node);

    const stopAudio = () => {
      node.port.onmessage = null;
      source.disconnect();
      void context.close();
      audio.getTracks().forEach((track) => track.stop());
      try {
        streamController?.close();
      } catch {
        /* already closed */
      }
    };
    museStopRef.current = stopAudio;

    const abort = new AbortController();
    museAbortRef.current = abort;
    setEngine("muse");
    setListening(true);
    onError(null);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: stream,
        signal: abort.signal,
        duplex: "half",
      } as RequestInit);
      if (!response.ok || !response.body) {
        throw new Error("The Muse connection did not start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (sessionRef.current === session) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim()) as { type?: string; transcript?: string; message?: string };
          if (payload.type === "error") throw new Error(payload.message || "Speech recognition failed.");
          if (payload.type === "transcript" && payload.transcript) {
            publish(session, joinDraft(prefixRef.current, payload.transcript));
          }
        }
      }
    } catch (error) {
      if (sessionRef.current !== session || (error instanceof DOMException && error.name === "AbortError")) return;
      stopAudio();
      museStopRef.current = null;
      if (speechRecognitionConstructor()) {
        startBrowser(session);
        return;
      }
      wantRef.current = false;
      setListening(false);
      setEngine(null);
      onError(error instanceof Error ? error.message : "Speech recognition failed.");
    }
  }

  async function toggleListening() {
    if (wantRef.current) {
      stopListening();
      return;
    }
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    wantRef.current = true;

    let muse = false;
    try {
      const response = await fetch("/api/transcribe");
      const data = (await response.json()) as { muse?: boolean };
      muse = Boolean(data.muse);
    } catch {
      muse = false;
    }
    if (sessionRef.current !== session || !wantRef.current) return;

    if (speechRecognitionConstructor()) {
      startBrowser(session);
      return;
    }
    if (muse && typeof navigator.mediaDevices?.getUserMedia === "function") {
      try {
        await startMuse(session);
        return;
      } catch {
        /* browser error below */
      }
    }
    startBrowser(session);
  }

  useEffect(() => {
    return () => {
      wantRef.current = false;
      recognitionRef.current?.abort();
      museAbortRef.current?.abort();
      museStopRef.current?.();
    };
  }, []);

  return { listening, engine, toggleListening, stopListening };
}
