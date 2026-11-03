import { MetaError, metaComplete } from "@/lib/meta";
import {
  buyerSystemPrompt,
  cleanProduct,
  cleanTurns,
  getCompanySize,
  getDifficulty,
  getIndustry,
  getObjective,
  getPersona,
} from "@/lib/simulation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cleanReply(text: string): string {
  let reply = text.trim().replace(/^(asiakas|ostaja|buyer|customer)\s*:\s*/i, "");
  if (
    (reply.startsWith('"') && reply.endsWith('"')) ||
    (reply.startsWith("«") && reply.endsWith("»")) ||
    (reply.startsWith("“") && reply.endsWith("”"))
  ) {
    reply = reply.slice(1, -1).trim();
  }
  return reply;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const persona = getPersona(payload.personaId);
  const industry = getIndustry(payload.industryId);
  const companySize = getCompanySize(payload.companySizeId);
  const difficulty = getDifficulty(payload.difficultyId);
  const objective = getObjective(payload.objectiveId);
  const product = cleanProduct(payload.product);
  const turns = cleanTurns(payload.messages);

  if (!persona || !industry || !companySize || !difficulty || !objective || !product || !turns) {
    return NextResponse.json({ error: "Product, persona, or conversation is missing." }, { status: 400 });
  }

  const last = turns[turns.length - 1];
  if (last.role !== "seller") {
    return NextResponse.json({ error: "The last message must come from the seller." }, { status: 400 });
  }

  try {
    const result = await metaComplete({
      reasoning: "minimal",
      maxTokens: 800,
      messages: [
        {
          role: "system",
          content: buyerSystemPrompt({ product, persona, industry, companySize, difficulty, objective }),
        },
        ...turns.map((turn) => ({
          role: turn.role === "seller" ? ("user" as const) : ("assistant" as const),
          content: turn.content,
        })),
      ],
    });

    const message = cleanReply(result.content);
    if (!message) {
      return NextResponse.json({ error: "The buyer did not reply. Try again." }, { status: 502 });
    }

    return NextResponse.json({ message, model: result.model });
  } catch (error) {
    const status = error instanceof MetaError ? error.status : 500;
    const message = error instanceof Error ? error.message : "The conversation failed.";
    return NextResponse.json({ error: message }, { status });
  }
}
