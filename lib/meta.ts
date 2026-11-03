const META_URL = "https://api.meta.ai/v1/chat/completions";

export const MUSE_SPARK_MODEL = "muse-spark-1.3-contributor";

export class MetaError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MetaError";
    this.status = status;
  }
}

type MetaRole = "system" | "user" | "assistant";

type CompleteOptions = {
  messages: { role: MetaRole; content: string }[];
  maxTokens: number;
  json?: boolean;
  reasoning?: "minimal" | "low";
};

function readContent(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof (part as { text: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
      return "";
    })
    .join("")
    .trim();
}

function publicError(status: number, body: string): MetaError {
  const text = body.toLowerCase();
  if (status === 401 || status === 403) {
    return new MetaError("Meta Model API rejected the API key. Check META_API_KEY.", status);
  }
  if (status === 429 || text.includes("rate limit")) {
    return new MetaError("The Meta Model API quota is full. Wait a moment and try again.", 429);
  }
  const detail = body.replace(/\s+/g, " ").trim().slice(0, 280);
  return new MetaError(detail || "The Meta Model API request failed.", status >= 400 ? status : 502);
}

export async function metaComplete(options: CompleteOptions): Promise<{ content: string; model: string }> {
  const apiKey = process.env.META_API_KEY?.trim();
  if (!apiKey) {
    throw new MetaError("META_API_KEY is missing on the server. Add it to .env.local and restart the app.", 500);
  }

  let useJson = Boolean(options.json);
  let useReasoning = Boolean(options.reasoning);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const body: Record<string, unknown> = {
      model: MUSE_SPARK_MODEL,
      messages: options.messages,
      max_completion_tokens: options.maxTokens,
    };
    if (useReasoning && options.reasoning) body.reasoning_effort = options.reasoning;
    if (useJson) body.response_format = { type: "json_object" };

    let response: Response;
    try {
      response = await fetch(META_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
    } catch {
      throw new MetaError("The connection to Meta Model API dropped. Try again.", 502);
    }

    const raw = await response.text();
    if (!response.ok) {
      const lower = raw.toLowerCase();
      if (useJson && lower.includes("response_format")) {
        useJson = false;
        continue;
      }
      if (useReasoning && lower.includes("reasoning")) {
        useReasoning = false;
        continue;
      }
      throw publicError(response.status, raw);
    }

    let parsed: {
      model?: string;
      choices?: { message?: { content?: unknown; reasoning?: string | null } }[];
    };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new MetaError("Meta Model API returned an unreadable response.", 502);
    }

    const message = parsed.choices?.[0]?.message;
    let content = readContent(message?.content);
    if (!content && message?.reasoning?.includes("{")) {
      content = message.reasoning.trim();
    }
    if (!content) {
      throw new MetaError("Meta Muse Spark 1.3 AI returned an empty response.", 502);
    }
    return { content, model: parsed.model || MUSE_SPARK_MODEL };
  }

  throw new MetaError("Meta Muse Spark 1.3 AI did not return a response.", 502);
}
