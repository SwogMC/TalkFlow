import type { ChatTurn } from "@/lib/types";

export type PersonaId = "ceo" | "skeptic" | "cfo";
export type IndustryId = "saas" | "industrial";
export type CompanySizeId = "startup" | "enterprise";
export type DifficultyId = "easy" | "medium" | "hard";
export type ObjectiveId = "demo" | "price";

export type Product = {
  id: string;
  name: string;
  blurb: string;
};

export type Persona = {
  id: PersonaId;
  name: string;
  fullName?: string;
  title: string;
  tagline: string;
  brief: string;
  objections: string[];
  opener: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "pen",
    name: "Smart Pen",
    blurb: "B2C. Transcribes meetings and syncs notes.",
  },
  {
    id: "erp",
    name: "Enterprise ERP Software",
    blurb: "B2B SaaS. Finance, inventory, and production in one cloud.",
  },
  {
    id: "gym",
    name: "Gym Membership Card",
    blurb: "B2C. A year of unlimited training and group classes.",
  },
];

export const PERSONAS: Persona[] = [
  {
    id: "ceo",
    name: "Busy CEO",
    fullName: "Matti Virtanen",
    title: "Chief Executive Officer",
    tagline: "Impatient. Values time and efficiency.",
    brief:
      "An impatient chief executive. You value time and efficiency, you cut off vague talk, and you want the point in 30 seconds.",
    objections: ["no time", "send an email", "we already have a solution", "prove the benefit now"],
    opener: "You have three minutes before my next meeting. If you do not get to the point, this call is over.",
  },
  {
    id: "skeptic",
    name: "Skeptical CTO",
    title: "Chief Technology Officer",
    tagline: "Questions the architecture. Distrusts vendor claims.",
    brief:
      "A skeptical chief technology officer. You question the architecture, security, and whether your team could build this itself.",
    objections: ["we can build it", "security review", "integration risk", "vendor lock-in"],
    opener: "CTO here. What breaks in our stack if we actually turn this on?",
  },
  {
    id: "cfo",
    name: "Strict CFO",
    title: "Chief Financial Officer",
    tagline: "Focused on ROI, numbers, and payback.",
    brief:
      "A strict chief financial officer. You care only about ROI, numbers, and payback time. Stories do not move you without a calculation.",
    objections: ["where is the ROI", "no budget", "show me the model", "payback is too long"],
    opener: "CFO on the line. If you cannot tell me the payback and the cost, we are done.",
  },
];

export function getPersona(id: unknown): Persona | null {
  if (typeof id !== "string") return null;
  return PERSONAS.find((persona) => persona.id === id) ?? null;
}

export function cleanProduct(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const product = value.replace(/\s+/g, " ").trim();
  if (product.length < 2 || product.length > 400) return null;
  return product;
}

export function cleanTurns(value: unknown): ChatTurn[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const turns: ChatTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "seller" && role !== "buyer") return null;
    if (typeof content !== "string") return null;
    const text = content.trim();
    if (!text || text.length > 4000) return null;
    turns.push({ role, content: text });
  }
  return turns;
}

export type Industry = {
  id: IndustryId;
  name: string;
  blurb: string;
  brief: string;
};

export type CompanySize = {
  id: CompanySizeId;
  name: string;
  blurb: string;
  brief: string;
};

export type Difficulty = {
  id: DifficultyId;
  name: string;
  blurb: string;
  brief: string;
};

export type Objective = {
  id: ObjectiveId;
  name: string;
  blurb: string;
  brief: string;
};

export const INDUSTRIES: Industry[] = [
  {
    id: "saas",
    name: "SaaS",
    blurb: "Software company. Seats, integrations, and renewal risk.",
    brief: "You buy software. You care about integrations, seats, onboarding, and what happens at renewal.",
  },
  {
    id: "industrial",
    name: "Industrial",
    blurb: "Operations company. Uptime, safety, and on-site rollout.",
    brief: "You run operations. You care about uptime, safety, and whether a rollout works on site.",
  },
];

export const COMPANY_SIZES: CompanySize[] = [
  {
    id: "startup",
    name: "Startup",
    blurb: "Small team. Fast decision, tight budget.",
    brief: "The company is a startup. The team is small, the budget is tight, and you can decide quickly if the case is real.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Large organization. Procurement and several stakeholders.",
    brief: "The company is an enterprise. Procurement, security, and other stakeholders sit between you and a yes.",
  },
];

export const DIFFICULTIES: Difficulty[] = [
  {
    id: "easy",
    name: "Easy",
    blurb: "One mild objection, then room to move.",
    brief:
      "Difficulty is easy. Raise one mild objection. If the seller answers it clearly, move toward their goal.",
  },
  {
    id: "medium",
    name: "Medium",
    blurb: "Realistic pushback. A few answers required.",
    brief:
      "Difficulty is medium. Push back realistically. Do not grant the goal until the seller has answered two or three concerns.",
  },
  {
    id: "hard",
    name: "Hard",
    blurb: "Stacked objections. Specifics or no.",
    brief:
      "Difficulty is hard. Interrupt fluff, stack objections, and refuse the goal unless the seller earns it with specifics, numbers, and a clear next step.",
  },
];

export const OBJECTIVES: Objective[] = [
  {
    id: "demo",
    name: "Book a demo meeting",
    blurb: "The seller is trying to put a demo on the calendar.",
    brief:
      "The seller's goal is to book a demo meeting. Agree to a demo only when they have earned a specific time or a clear next step. Do not buy the product on this call.",
  },
  {
    id: "price",
    name: "Defend the price",
    blurb: "The seller must hold the price without folding.",
    brief:
      "The seller's goal is to defend the price. Push for a discount, a free pilot, or a smaller package. Treat a defended price with a real reason as progress. Do not reward an instant discount.",
  },
];

export function getIndustry(id: unknown): Industry | null {
  if (typeof id !== "string") return null;
  return INDUSTRIES.find((item) => item.id === id) ?? null;
}

export function getCompanySize(id: unknown): CompanySize | null {
  if (typeof id !== "string") return null;
  return COMPANY_SIZES.find((item) => item.id === id) ?? null;
}

export function getDifficulty(id: unknown): Difficulty | null {
  if (typeof id !== "string") return null;
  return DIFFICULTIES.find((item) => item.id === id) ?? null;
}

export function getObjective(id: unknown): Objective | null {
  if (typeof id !== "string") return null;
  return OBJECTIVES.find((item) => item.id === id) ?? null;
}

export function buyerSystemPrompt(input: {
  product: string;
  persona: Persona;
  industry: Industry;
  companySize: CompanySize;
  difficulty: Difficulty;
  objective: Objective;
}): string {
  const { product, persona, industry, companySize, difficulty, objective } = input;
  return `You are role-playing a buyer on a phone call. You are not an assistant and you are not a sales coach.
Speak English, short and direct: 1–3 sentences. No lists, no headings, no coaching for the seller.
The product being sold to you: ${product}.
Your persona: ${persona.name}.
Character: ${persona.brief}.
Typical objections: ${persona.objections.join(", ")}.
Your company: ${companySize.name} in ${industry.name}. ${industry.brief} ${companySize.brief}
The seller's goal for this call: ${objective.name}. ${objective.brief}
How hard you are to move: ${difficulty.brief}
Rules:
- Stay inside this company, this persona, and this difficulty. Do not switch roles.
- If the seller is vague, demand specifics that fit ${industry.name} and a ${companySize.name.toLowerCase()}.
- If the seller listens and ties value to your situation, you may soften only as far as the difficulty allows.
- Grant "${objective.name}" only when the difficulty rules say the seller has earned it.
- Do not reveal that you are an AI. Do not give sales tips. Do not analyze the seller's performance.
- Sound like a real person on the phone. Reply only as the buyer.`;
}

export function analystSystemPrompt(): string {
  return `You are TalkFlow's sales coach. You analyze an English sales call and you score the SELLER.
Return only one JSON object. No markdown, no code fence, no explanation.
Use exactly these keys:
{
  "overallScore": 0,
  "dealStatus": "No deal",
  "metrics": {
    "objectionHandling": 0,
    "activeListening": 0,
    "valueProposition": 0,
    "closingSkill": 0
  },
  "highlights": ["", "", ""],
  "handledObjections": ["", "", ""],
  "mistakes": ["", "", ""],
  "keyLessons": ["", "", ""]
}
Rules:
- Every number is an integer from 0 to 100. Do not use a 0–10 scale.
- dealStatus is exactly one of: "Won", "No deal", "Follow-up scheduled".
- Use "Won" only if the buyer clearly agreed to buy. Use "Follow-up scheduled" if a next meeting was agreed without a purchase. Otherwise use "No deal".
- highlights: at most 3 best moments. Include a short quote from the seller and why it worked.
- handledObjections: at most 3 objections the seller handled. Name the objection and how the seller answered. If none were handled, say so directly.
- mistakes: at most 3 critical mistakes that weakened or lost the deal. Be direct.
- keyLessons: at most 3 concrete actions for the next call. No generic clichés.
- Write every text value in English.
- Do not copy the zeros from this instruction. Score the call you were given.
- If the seller never said anything substantial, keep the scores low and set dealStatus to "No deal".`;
}

export function transcript(turns: ChatTurn[]): string {
  return turns
    .map((turn) => `${turn.role === "seller" ? "SELLER" : "BUYER"}: ${turn.content}`)
    .join("\n");
}
