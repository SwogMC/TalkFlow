import type { AnalysisReport, DealStatus } from "@/lib/types";

function clamp(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function readNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (source[key] != null && source[key] !== "") {
      const score = clamp(source[key]);
      if (score != null) return score;
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStatus(value: unknown): DealStatus {
  const text = String(value ?? "").trim().toLowerCase();
  if (text.includes("no deal") || text.includes("lost") || text.includes("reject") || text.includes("ei kaup") || text.includes("ei ost")) {
    return "No deal";
  }
  if (text.includes("follow") || text.includes("jatko")) return "Follow-up scheduled";
  if (text.includes("won") || text.includes("closed") || text.includes("purchas") || text.includes("bought") || text.includes("ostettu")) {
    return "Won";
  }
  return "No deal";
}

function asList(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback];
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
  return items.length > 0 ? items : [fallback];
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidates = [trimmed];
  if (start !== -1 && end > start) candidates.push(trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  throw new Error("The analysis did not return a JSON report.");
}

export function normalizeAnalysis(payload: unknown): AnalysisReport {
  const root = asRecord(payload);
  if (!root) throw new Error("The analysis did not return a JSON report.");

  const metricsRoot = asRecord(root.metrics) ?? root;
  const objectionHandling = readNumber(metricsRoot, ["objectionHandling", "objection_handling", "vastaväitteet"]);
  const activeListening = readNumber(metricsRoot, ["activeListening", "active_listening", "kuuntelu"]);
  const valueProposition = readNumber(metricsRoot, ["valueProposition", "value_proposition", "arvolupaus"]);
  const closingSkill = readNumber(metricsRoot, ["closingSkill", "closing_skill", "kaupanPäätös", "closing"]);
  const scores = [objectionHandling, activeListening, valueProposition, closingSkill];
  const foundMetric = scores.some((score) => score != null);
  const overall = readNumber(root, ["overallScore", "overall_score", "score", "kokonaispisteet"]);

  if (!foundMetric && overall == null && root.dealStatus == null) {
    throw new Error("The analysis did not include scores.");
  }

  const metrics = {
    objectionHandling: objectionHandling ?? 0,
    activeListening: activeListening ?? 0,
    valueProposition: valueProposition ?? 0,
    closingSkill: closingSkill ?? 0,
  };
  const average = Math.round(
    (metrics.objectionHandling + metrics.activeListening + metrics.valueProposition + metrics.closingSkill) / 4,
  );

  return {
    overallScore: overall ?? average,
    dealStatus: asStatus(root.dealStatus ?? root.deal_status ?? root.status),
    metrics,
    highlights: asList(root.highlights, "The call was too short to show a clear strength."),
    handledObjections: asList(
      root.handledObjections ?? root.handled_objections,
      "No objection was handled in this call.",
    ),
    mistakes: asList(root.mistakes, "The call was too thin to isolate one decisive mistake."),
    keyLessons: asList(root.keyLessons ?? root.key_lessons, "Open the next call with a question, not a pitch."),
  };
}
