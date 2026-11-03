import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "muse-voice-transcribe-1.0";

export async function GET() {
  return NextResponse.json({ muse: Boolean(process.env.MODEL_API_KEY?.trim()) });
}

export async function POST(request: Request) {
  const apiKey = process.env.MODEL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "MODEL_API_KEY is missing. Speech input uses the browser recognizer." },
      { status: 503 },
    );
  }
  if (!request.body) {
    return NextResponse.json({ error: "Audio is missing." }, { status: 400 });
  }

  const sessionId = `talkflow-${crypto.randomUUID()}`;
  const socket = new WebSocket(`wss://api.meta.ai/v1/asr/realtime?sessionId=${encodeURIComponent(sessionId)}`);
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      };

      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("The Muse connection timed out.")), 12_000);
          socket.addEventListener(
            "open",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
          socket.addEventListener(
            "error",
            () => {
              clearTimeout(timer);
              reject(new Error("The Muse connection failed."));
            },
            { once: true },
          );
        });

        const handshake = new Promise<Record<string, unknown>>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Muse did not confirm the session.")), 12_000);
          socket.addEventListener(
            "message",
            (event) => {
              if (typeof event.data !== "string") return;
              clearTimeout(timer);
              try {
                resolve(JSON.parse(event.data) as Record<string, unknown>);
              } catch {
                reject(new Error("Muse returned an unreadable response."));
              }
            },
            { once: true },
          );
        });

        socket.send(
          JSON.stringify({
            authorization: { accessToken: `Bearer ${apiKey}` },
            audioEncoding: "PCM_24KHZ",
            model: MODEL,
            mode: "PUSH_TO_TALK",
            partialMode: "CUMULATIVE",
            emitAudioProgress: false,
          }),
        );

        const reader = request.body!.getReader();
        const buffered: Uint8Array[] = [];
        let accepted = false;
        const pump = (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!value) continue;
              if (!accepted) buffered.push(value);
              else if (socket.readyState === WebSocket.OPEN) socket.send(value);
            }
          } catch {
            /* client stopped the microphone */
          }
          if (accepted && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "endStream" }));
          }
        })();

        const ack = await handshake;
        if (typeof ack.sessionId !== "string") {
          const message = typeof ack.message === "string" ? ack.message : "Muse rejected the speech session.";
          send({ type: "error", message });
          finish();
          return;
        }

        accepted = true;
        for (const chunk of buffered) {
          if (socket.readyState === WebSocket.OPEN) socket.send(chunk);
        }
        buffered.length = 0;
        send({ type: "ready" });

        socket.addEventListener("message", (event) => {
          if (typeof event.data !== "string") return;
          try {
            const payload = JSON.parse(event.data) as {
              type?: string;
              transcript?: string;
              final?: boolean;
              message?: string;
            };
            if (payload.type === "error") {
              send({ type: "error", message: payload.message || "Speech recognition failed." });
              return;
            }
            if ((payload.type === "transcript" || payload.type === "speechComplete") && payload.transcript) {
              send({
                type: "transcript",
                transcript: payload.transcript,
                final: payload.type === "speechComplete" || Boolean(payload.final),
              });
            }
          } catch {
            /* ignore malformed frames */
          }
        });

        await new Promise<void>((resolve) => {
          socket.addEventListener("close", () => resolve(), { once: true });
        });
        await pump;
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "Speech recognition failed." });
      } finally {
        finish();
      }
    },
    cancel() {
      closed = true;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
