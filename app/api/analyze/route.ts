import { extractJson, normalizeAnalysis } from "@/lib/analysis";
import { MetaError, metaComplete } from "@/lib/meta";
import {
  analystSystemPrompt,
  cleanProduct,
  cleanTurns,
  getCompanySize,
  getDifficulty,
  getIndustry,
  getObjective,
  getPersona,
  transcript,
} from "@/lib/simulation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  try {
    const result = await metaComplete({
      reasoning: "low",
      maxTokens: 2000,
      json: true,
      messages: [
        { role: "system", content: analystSystemPrompt() },
        {
          role: "user",
          content: `Product: ${product}\nBuyer persona: ${persona.name}\nIndustry: ${industry.name}\nCompany size: ${companySize.name}\nDifficulty: ${difficulty.name}\nSeller's goal: ${objective.name}\n\nConversation:\n${transcript(turns)}`,
        },
      ],
    });

    const report = normalizeAnalysis(extractJson(result.content));
    return NextResponse.json({ report, model: result.model });
  } catch (error) {
    const status = error instanceof MetaError ? error.status : 500;
    const message = error instanceof Error ? error.message : "The analysis failed.";
    return NextResponse.json({ error: message }, { status });
  }
}
