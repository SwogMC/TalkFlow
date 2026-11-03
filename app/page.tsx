"use client";

import type { AnalysisReport, ChatTurn, DealStatus } from "@/lib/types";
import { modelLabel } from "@/lib/models";
import {
  COMPANY_SIZES,
  DIFFICULTIES,
  INDUSTRIES,
  OBJECTIVES,
  PERSONAS,
  PRODUCTS,
  type CompanySizeId,
  type DifficultyId,
  type IndustryId,
  type ObjectiveId,
  type PersonaId,
} from "@/lib/simulation";
import { useDictation } from "@/app/use-dictation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  AudioLines,
  BadgeCheck,
  Ban,
  Building2,
  Calculator,
  CalendarCheck,
  Check,
  Clipboard,
  Crown,
  Dumbbell,
  Ear,
  Factory,
  Gem,
  Handshake,
  LayoutDashboard,
  Menu,
  Mic,
  MicOff,
  PenLine,
  PhoneCall,
  PhoneOff,
  Play,
  Rocket,
  Send,
  Shield,
  ShieldQuestion,
  Sparkles,
  Timer,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Stage = "setup" | "live" | "analyzing" | "debrief";
type ViewState = "hero" | "setup" | "active_call";
type LegalDoc = "privacy" | "terms";

const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const CREDIT_KEY = "talkflow-credits";
const PRO_KEY = "talkflow-pro";

const productIcons: Record<string, LucideIcon> = {
  pen: PenLine,
  erp: LayoutDashboard,
  gym: Dumbbell,
};

const personaIcons: Record<PersonaId, LucideIcon> = {
  ceo: Timer,
  skeptic: ShieldQuestion,
  cfo: Calculator,
};

function SelectCard({
  selected,
  onClick,
  icon: Icon,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-500/10"
          : "border-slate-200 bg-white shadow-sm hover:border-blue-200"
      }`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className={`mt-3 block text-sm font-semibold ${selected ? "text-blue-700" : "text-slate-900"}`}>
        {title}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{body}</span>
    </button>
  );
}

const metricMeta: {
  key: keyof AnalysisReport["metrics"];
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    key: "objectionHandling",
    label: "Objections",
    hint: "Objection handling",
    icon: Shield,
  },
  {
    key: "activeListening",
    label: "Listening",
    hint: "Listening and questions",
    icon: Ear,
  },
  {
    key: "valueProposition",
    label: "Value",
    hint: "Value proposition",
    icon: Gem,
  },
  {
    key: "closingSkill",
    label: "Close",
    hint: "Closing skill",
    icon: Handshake,
  },
];

const statusMeta: Record<
  DealStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  Won: {
    label: "DEAL WON",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: BadgeCheck,
  },
  "No deal": {
    label: "NO DEAL",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: Ban,
  },
  "Follow-up scheduled": {
    label: "FOLLOW-UP",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: CalendarCheck,
  },
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function useCountUp(target: number) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, target]);

  return value;
}

function reportText(
  report: AnalysisReport,
  product: string,
  persona: string,
  elapsed: number,
  count: number,
) {
  return [
    "TalkFlow — Sales report",
    `Product: ${product}`,
    `Buyer: ${persona}`,
    `Duration: ${formatTime(elapsed)}`,
    `Messages: ${count}`,
    `Result: ${report.dealStatus}`,
    `Overall score: ${report.overallScore}/100`,
    "",
    `Objection handling: ${report.metrics.objectionHandling}`,
    `Listening and questions: ${report.metrics.activeListening}`,
    `Value proposition: ${report.metrics.valueProposition}`,
    `Closing skill: ${report.metrics.closingSkill}`,
    "",
    "Key strengths:",
    ...report.highlights.map((item) => `- ${item}`),
    "",
    "Handled objections:",
    ...report.handledObjections.map((item) => `- ${item}`),
    "",
    "Critical mistakes:",
    ...report.mistakes.map((item) => `- ${item}`),
    "",
    "Tips for next time:",
    ...report.keyLessons.map((item) => `- ${item}`),
  ].join("\n");
}

function ScoreGauge({ score }: { score: number }) {
  const shown = useCountUp(score);
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (shown / 100) * circumference;

  return (
    <div
      className="relative h-44 w-44 shrink-0"
      aria-label={`Overall score ${score} percent`}
    >
      <svg viewBox="0 0 160 160" className="relative h-full w-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#e2e8f0"
          strokeWidth="12"
          fill="none"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="url(#score-gradient)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="score-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-4xl font-semibold tracking-tight text-blue-600">
            {shown}
            <span className="text-lg font-medium text-blue-400">%</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Overall
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end p-4 sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-md">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Close window"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const plans = [
  {
    id: "free",
    name: "Starter",
    price: "€0",
    period: "",
    cta: "Start for free",
    featured: false,
    features: [
      "Occasional practice",
      "Basic personas",
      "Limited analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "€29",
    period: "/mo",
    cta: "Choose Pro",
    featured: true,
    features: [
      "Unlimited simulations",
      "All buyer personas",
      "Precise post-call analytics",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    cta: "Contact sales",
    featured: false,
    features: [
      "Custom buyer personas",
      "Team management",
      "API integrations",
    ],
  },
] as const;

function PricingTiers({
  onFree,
  onPro,
  onEnterprise,
}: {
  onFree: () => void;
  onPro: () => void;
  onEnterprise: () => void;
}) {
  const actions = { free: onFree, pro: onPro, enterprise: onEnterprise };
  return (
    <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
      {plans.map((plan) => (
        <article
          key={plan.id}
          className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
            plan.featured
              ? "border-indigo-600 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-600"
              : "border-slate-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            {plan.featured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                <Crown className="h-3.5 w-3.5" />
                Most popular
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {plan.price}
            <span className="text-base font-medium text-slate-500">{plan.period}</span>
          </p>
          <ul className="mt-5 flex-1 space-y-2.5 text-sm text-slate-700">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={actions[plan.id]}
            className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
              plan.featured
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500"
                : "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-indigo-200 hover:bg-slate-50"
            }`}
          >
            {plan.cta}
          </button>
        </article>
      ))}
    </div>
  );
}

function Soundwave() {
  const reduce = useReducedMotion();
  return (
    <span className="flex h-5 items-center gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((bar) => (
        <motion.span
          key={bar}
          className="w-1 rounded-full bg-blue-600"
          animate={reduce ? { height: 10 } : { height: [4, 16, 8, 18, 6] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: bar * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function Landing({
  onEnter,
  onPricing,
  onPro,
}: {
  onEnter: () => void;
  onPricing: () => void;
  onPro: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const metrics = [
    {
      icon: AudioLines,
      kicker: "Voice Mode",
      title: "",
      body: "Speak your pitch naturally or type below.",
    },
    {
      icon: Sparkles,
      kicker: "Meta Muse Spark 1.3 AI",
      title: "Roleplay and analysis",
      body: "Smart roleplay, and an analysis that is ready in seconds.",
    },
    {
      icon: Zap,
      kicker: "Real-Time Feedback",
      title: "Instant feedback",
      body: "Immediate scoring on objections and the value proposition.",
    },
  ];

  const features = [
    {
      icon: PhoneCall,
      title: "TalkFlow",
      body: "Practice a call with a Busy CEO, a Skeptical CTO, and a Strict CFO. Speak or type, then get an analysis of that same conversation.",
    },
  ];

  return (
    <div className="min-h-dvh scroll-smooth bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="" className="h-10 w-auto shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold tracking-tight text-slate-900">
                Talk<span className="text-blue-600">Flow</span>
              </span>
              <span className="mt-1 inline-flex max-w-full items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                Meta AI Hackathon MVP
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
            >
              Features
            </a>
            <a
              href="#buyer-personas"
              className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
            >
              Buyer personas
            </a>
            <button
              type="button"
              onClick={onPricing}
              className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={onPricing}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-indigo-600"
            >
              Start For Free
            </button>
          </nav>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              <a
                href="#features"
                onClick={closeMenu}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Features
              </a>
              <a
                href="#buyer-personas"
                onClick={closeMenu}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Buyer personas
              </a>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onPricing();
                }}
                className="rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onPricing();
                }}
                className="mt-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Start For Free
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 md:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:py-20">
          <div>
            <p className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
              Powered by Meta Muse Spark 1.3 AI
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl md:leading-[1.12]">
              Close <span className="text-blue-600">more deals</span> with sales
              tactics sharpened by AI.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              Simulate demanding B2B sales calls in real time by voice, and get
              an immediate, in-depth report on your technique.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onEnter}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-indigo-600"
              >
                Start free simulation
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <Play className="h-4 w-4 text-blue-600" />
                Watch 2 min demo
              </a>
            </div>
          </div>

          <article
            id="demo"
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 md:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                TalkFlow
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-slate-200 bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-900">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  CFO
                </p>
                Your ROI looks overly optimistic. How do you justify it?
              </div>
              <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-relaxed text-white shadow-md shadow-blue-500/10">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100">
                  Seller
                </p>
                I understand the concern. Our customers have reached payback in
                about 4 months on average...
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Objection handled exceptionally +15pt
            </div>
          </article>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.kicker}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight text-blue-600">
                    {item.kicker}
                  </h2>
                  {item.title ? (
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-14 md:px-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Practice that holds up on a real call.
          </h2>
          <div className="mt-8 grid max-w-xl gap-4">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                    {item.body}
                  </p>
                  <button
                    type="button"
                    onClick={onEnter}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-indigo-600"
                  >
                    Open TalkFlow
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="buyer-personas"
          className="scroll-mt-24 border-y border-slate-200 bg-white"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Buyer personas
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900">
              Three buyers who do not fold easily.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PERSONAS.map((persona) => {
                const Icon = personaIcons[persona.id];
                return (
                  <article
                    key={persona.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
                      {persona.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {persona.tagline}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 mx-auto w-full max-w-6xl px-4 py-14 md:px-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Practice at the pace of the deal.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
            Listed plans for TalkFlow. This MVP starts the simulator in the
            browser and does not charge a card.
          </p>
          <PricingTiers
            onFree={onEnter}
            onPro={onPro}
            onEnterprise={onPricing}
          />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center md:px-6">
          <p>Powered by Meta Muse Spark 1.3 AI</p>
          <p>TalkFlow · Meta AI Hackathon MVP</p>
        </div>
      </footer>
    </div>
  );
}

const heroFeatures = [
  {
    title: "Real-time Voice Analysis",
    body: "A live waveform reads the pitch as you speak.",
    start: 0.16,
    className: "left-2 top-3 sm:left-[4%] sm:top-[14%] md:left-[7%]",
    kind: "wave" as const,
  },
  {
    title: "Meta Muse Spark 1.3 AI",
    body: "A roleplay identity that answers as the buyer.",
    start: 0.34,
    className: "right-2 top-16 sm:right-[4%] sm:top-[32%] md:right-[7%]",
    kind: "buyer" as const,
  },
  {
    title: "Instant Sales Metrics",
    body: "Deep feedback for the seller as soon as the call ends.",
    start: 0.52,
    className: "bottom-3 left-2 sm:bottom-[8%] sm:left-[2%] md:left-[5%]",
    kind: "metrics" as const,
  },
];

function HeroWave() {
  const reduce = useReducedMotion();
  return (
    <span className="mt-1 flex h-4 items-center gap-0.5 md:mt-3 md:h-5" aria-hidden>
      {[0, 1, 2, 3, 4].map((bar) => (
        <motion.span
          key={bar}
          className="w-1 rounded-full bg-blue-300"
          animate={reduce ? { height: 8 } : { height: [4, 16, 7, 18, 5] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: bar * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

function SimulationCapsule({
  spin,
  scale,
  sheen,
}: {
  spin: number;
  scale: number;
  sheen: number;
}) {
  const face =
    "absolute inset-0 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_80px_rgba(37,99,235,0.35)] backdrop-blur-md";
  return (
    <div
      className="relative h-60 w-44 md:h-80 md:w-64"
      style={{
        transform: `rotateY(${spin}deg) scale(${scale})`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        className="absolute left-1/2 top-6 h-[calc(100%-3rem)] w-9 -translate-x-1/2 rounded-2xl border border-white/10 bg-gradient-to-b from-white/25 via-blue-400/30 to-white/5"
        style={{ transform: "rotateY(90deg)" }}
      />
      <div
        className={face}
        style={{ transform: "translateZ(18px)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          style={{ transform: `translateX(${sheen}%)` }}
        />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-[58%] rounded-full bg-gradient-to-br from-white via-blue-200 to-blue-600 shadow-[0_0_46px_rgba(37,99,235,0.85)] md:h-28 md:w-28" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-left md:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-200">
            B2B AI
          </p>
          <p className="mt-1 text-base font-semibold text-white md:text-lg">Simulation core</p>
        </div>
      </div>
      <div
        className={`${face} flex flex-col justify-end p-5 text-left`}
        style={{
          transform: "rotateY(180deg) translateZ(18px)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-blue-200">
          TalkFlow
        </p>
        <p className="mt-1 text-base font-semibold text-white md:text-lg">Practice the close</p>
      </div>
    </div>
  );
}

function HeroShowcase({ onEnter }: { onEnter: () => void }) {
  const reduce = useReducedMotion();
  const sceneRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onScroll = () => {
      const scene = sceneRef.current;
      if (!scene) return;
      const distance = scene.offsetHeight - window.innerHeight;
      const passed = Math.min(Math.max(-scene.getBoundingClientRect().top, 0), Math.max(distance, 0));
      setProgress(distance > 0 ? passed / distance : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const fade = (start: number) => Math.min(1, Math.max(0, (progress - start) / 0.16));
  const spin = reduce ? 18 : progress * 360;
  const capsuleScale = reduce ? 1 : 1 + progress * 0.14;
  const sheen = ((spin % 180) / 180) * 180 - 40;

  return (
    <div className="relative min-h-dvh bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        aria-hidden
        style={{
          backgroundImage: "radial-gradient(circle, rgba(226,232,240,0.95) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(circle at center, black 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 20%, transparent 78%)",
        }}
      />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-10 w-auto" />
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Talk<span className="text-blue-400">Flow</span>
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400">Voice practice</p>
        </div>
      </header>

      <section
        ref={sceneRef}
        className="relative h-[620vh]"
      >
        <div
          className="sticky top-0 flex h-dvh items-center justify-center overflow-hidden"
          onMouseMove={(event) => {
            if (reduce) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            setTilt({
              x: (event.clientX - bounds.left) / bounds.width - 0.5,
              y: (event.clientY - bounds.top) / bounds.height - 0.5,
            });
          }}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="absolute left-1/2 top-0 h-[520px] w-[520px] animate-pulse rounded-full bg-blue-600/20 blur-[140px] [animation-duration:7s]"
              style={{ transform: `translate(calc(-50% + ${tilt.x * 36}px), calc(-18% + ${tilt.y * 24}px))` }}
            />
            <div className="absolute bottom-0 right-0 h-[440px] w-[440px] translate-x-1/4 translate-y-1/4 animate-pulse rounded-full bg-blue-600/20 blur-[140px] [animation-duration:9s]" />
            <div className="absolute bottom-1/4 left-0 h-[380px] w-[380px] -translate-x-1/3 animate-pulse rounded-full bg-blue-600/20 blur-[140px] [animation-duration:8s]" />
          </div>
          <div
            className="relative h-[min(78vh,640px)] w-[min(94vw,860px)]"
            style={{ perspective: "1200px" }}
          >
            <div
              className="h-full w-full"
              style={{
                transform: reduce
                  ? undefined
                  : `rotateX(${tilt.y * -12}deg) rotateY(${tilt.x * 18}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
              <div className={reduce ? "relative h-full" : "pitch-float relative h-full"}>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <SimulationCapsule spin={spin} scale={capsuleScale} sheen={sheen} />
                </div>
                {heroFeatures.map((feature) => {
                  const shown = fade(feature.start);
                  const Icon = feature.kind === "buyer" ? PhoneCall : Sparkles;
                  return (
                    <article
                      key={feature.title}
                      className={`absolute w-[9.25rem] rounded-2xl border border-white/10 bg-white/5 p-2.5 text-left shadow-[0_18px_50px_rgba(37,99,235,0.22)] backdrop-blur-md md:w-56 md:p-4 ${feature.className}`}
                      style={{
                        opacity: shown,
                        transform: reduce ? undefined : `translateY(${(1 - shown) * 28}px)`,
                      }}
                    >
                      {feature.kind === "wave" ? (
                        <HeroWave />
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-xl border border-white/10 bg-white/10 text-blue-200 md:h-9 md:w-9">
                          <Icon className="h-4 w-4" />
                        </span>
                      )}
                      <h2 className="mt-2 text-xs font-semibold text-white md:mt-3 md:text-sm">{feature.title}</h2>
                      <p className="mt-1 text-[11px] leading-snug text-slate-300 md:text-xs md:leading-relaxed">{feature.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-24 pt-8 text-center md:px-6">
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
          Ready to Master Your B2B Pitch?
        </h1>
        <button
          type="button"
          onClick={onEnter}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-blue-300/80 bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_0_1px_rgba(147,197,253,0.35),0_0_42px_rgba(37,99,235,0.55)] transition hover:border-white hover:bg-blue-500 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.7),0_0_56px_rgba(59,130,246,0.75)]"
        >
          Enter TalkFlow Gym
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
}

function PricingView({
  onBack,
  onSetup,
  onPro,
  canReturnToCall,
}: {
  onBack: () => void;
  onSetup: () => void;
  onPro: () => void;
  canReturnToCall: boolean;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={onBack}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Back"
          >
            <img src="/logo.png" alt="" className="h-10 w-auto shrink-0" />
            <span className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
              Talk<span className="text-indigo-600">Flow</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            {canReturnToCall ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-indigo-600"
              >
                Back to call
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSetup}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-500"
            >
              Setup
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Pricing
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Practice at the pace of the deal.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
          Starter is enough for occasional practice. Pro is for active sellers.
          Enterprise is built for a team. This MVP stores the choice in the
          browser and does not charge a card.
        </p>
        <PricingTiers onFree={onSetup} onPro={onPro} onEnterprise={() => setContactOpen(true)} />
        {contactOpen ? (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-indigo-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Enterprise team</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Custom personas, team management, and API integrations are scoped
              together. This MVP does not send the form yet.
            </p>
            <button
              type="button"
              onClick={onSetup}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Go to the setup dashboard
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function Page() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<Stage>("setup");
  const [productId, setProductId] = useState("erp");
  const [customProduct, setCustomProduct] = useState("");
  const [personaId, setPersonaId] = useState<PersonaId>("ceo");
  const [industryId, setIndustryId] = useState<IndustryId>("saas");
  const [companySizeId, setCompanySizeId] = useState<CompanySizeId>("startup");
  const [difficultyId, setDifficultyId] = useState<DifficultyId>("medium");
  const [objectiveId, setObjectiveId] = useState<ObjectiveId>("demo");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [chatModel, setChatModel] = useState<string | null>(null);
  const [analyzeModel, setAnalyzeModel] = useState<string | null>(null);
  const [credits, setCredits] = useState(3);
  const [isPro, setIsPro] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [legal, setLegal] = useState<LegalDoc | null>(null);
  const [copied, setCopied] = useState(false);
  const [gymOpen, setGymOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("hero");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const analyzingRef = useRef(false);
  const messagesRef = useRef<ChatTurn[]>([]);
  const draftRef = useRef("");
  const { listening, toggleListening, stopListening } = useDictation({
    getDraft: () => draftRef.current,
    setDraft: (text) => {
      draftRef.current = text;
      setDraft(text);
    },
    onError: setError,
  });

  const persona = PERSONAS.find((item) => item.id === personaId) ?? PERSONAS[0];
  const industry = INDUSTRIES.find((item) => item.id === industryId) ?? INDUSTRIES[0];
  const companySize = COMPANY_SIZES.find((item) => item.id === companySizeId) ?? COMPANY_SIZES[0];
  const difficulty = DIFFICULTIES.find((item) => item.id === difficultyId) ?? DIFFICULTIES[1];
  const objective = OBJECTIVES.find((item) => item.id === objectiveId) ?? OBJECTIVES[0];
  const PersonaIcon = personaIcons[persona.id];
  const product = PRODUCTS.find((item) => item.id === productId);
  const productTitle =
    productId === "custom" ? customProduct.trim() : (product?.name ?? "");
  const productBrief =
    productId === "custom"
      ? customProduct.trim()
      : product
        ? `${product.name} — ${product.blurb}`
        : "";
  const productReady = productTitle.length > 1;
  messagesRef.current = messages;
  draftRef.current = draft;

  useEffect(() => {
    const storedCredits = localStorage.getItem(CREDIT_KEY);
    const storedPro = localStorage.getItem(PRO_KEY) === "1";
    setIsPro(storedPro);
    if (!storedPro && storedCredits != null) {
      const value = Number(storedCredits);
      if (Number.isFinite(value))
        setCredits(Math.max(0, Math.min(3, Math.floor(value))));
    }
  }, []);

  useEffect(() => {
    if (stage !== "live") return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || stage !== "live") return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [messages, pending, error, stage]);

  useEffect(() => {
    if (!upgradeOpen && !legal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUpgradeOpen(false);
        setLegal(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [legal, upgradeOpen]);

  function activatePro() {
    localStorage.setItem(PRO_KEY, "1");
    setIsPro(true);
    setUpgradeOpen(false);
  }

  const demoApplied =
    productId === "erp" &&
    customProduct.trim().length === 0 &&
    personaId === "skeptic" &&
    industryId === "saas" &&
    companySizeId === "enterprise" &&
    difficultyId === "hard" &&
    objectiveId === "demo";

  function applyDemoMode() {
    setProductId("erp");
    setCustomProduct("");
    setPersonaId("skeptic");
    setIndustryId("saas");
    setCompanySizeId("enterprise");
    setDifficultyId("hard");
    setObjectiveId("demo");
  }

  function startCall() {
    if (!productReady) return;
    if (!isPro && credits <= 0) {
      setUpgradeOpen(true);
      return;
    }
    if (!isPro) {
      const next = credits - 1;
      setCredits(next);
      localStorage.setItem(CREDIT_KEY, String(next));
    }
    const opener = [{ role: "buyer" as const, content: persona.opener }];
    messagesRef.current = opener;
    setMessages(opener);
    setDraft("");
    setError(null);
    setReport(null);
    setChatModel(null);
    setAnalyzeModel(null);
    setElapsed(0);
    setCopied(false);
    setStage("live");
    setViewState("active_call");
  }

  async function requestReply(history: ChatTurn[]) {
    const id = ++requestId.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          product: productBrief,
          personaId,
          industryId,
          companySizeId,
          difficultyId,
          objectiveId,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        model?: string;
        error?: string;
      };
      if (id !== requestId.current) return;
      if (!response.ok || !data.message) {
        throw new Error(data.error || "The buyer did not reply.");
      }
      setMessages((current) => {
        const next = [
          ...current,
          { role: "buyer" as const, content: data.message as string },
        ];
        messagesRef.current = next;
        return next;
      });
      if (data.model) setChatModel(data.model);
    } catch (caught) {
      if (id !== requestId.current || isAbort(caught)) return;
      setError(caught instanceof Error ? caught.message : "Network error.");
    } finally {
      if (id === requestId.current) setPending(false);
    }
  }

  function send() {
    stopListening();
    const content = draftRef.current.trim();
    if (!content || pending || stage !== "live") return;
    const history = [
      ...messagesRef.current,
      { role: "seller" as const, content },
    ];
    messagesRef.current = history;
    setMessages(history);
    setDraft("");
    void requestReply(history);
  }

  async function endCall() {
    if (stage !== "live" || analyzingRef.current) return;
    stopListening();
    analyzingRef.current = true;
    requestId.current += 1;
    abortRef.current?.abort();
    setPending(false);
    setError(null);
    setStage("analyzing");
    const history = messagesRef.current;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          product: productBrief,
          personaId,
          industryId,
          companySizeId,
          difficultyId,
          objectiveId,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        report?: AnalysisReport;
        model?: string;
        error?: string;
      };
      if (!response.ok || !data.report) {
        throw new Error(data.error || "The analysis failed.");
      }
      setReport(data.report);
      if (data.model) setAnalyzeModel(data.model);
      setStage("debrief");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The analysis failed.",
      );
      setStage("live");
    } finally {
      analyzingRef.current = false;
    }
  }

  function retry() {
    setViewState("setup");
    setStage("setup");
    messagesRef.current = [];
    setMessages([]);
    setReport(null);
    setElapsed(0);
    setDraft("");
    setError(null);
    setCopied(false);
  }

  function copyWithCommand(text: string) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const copiedWithCommand = document.execCommand("copy");
    area.remove();
    return copiedWithCommand;
  }

  async function copyReport() {
    if (!report) return;
    const text = reportText(
      report,
      productTitle,
      persona.name,
      elapsed,
      messages.length,
    );
    setError(null);
    if (copyWithCommand(text)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the report in this browser.");
    }
  }

  function openGym() {
    setPricingOpen(false);
    setStage("setup");
    setViewState("setup");
    setGymOpen(true);
  }

  function goHome() {
    stopListening();
    abortRef.current?.abort();
    setPending(false);
    setStage("setup");
    setViewState("hero");
    setGymOpen(false);
    setPricingOpen(false);
  }

  function openPro() {
    activatePro();
    openGym();
  }

  if (viewState === "hero") {
    return (
      <div className="view-in">
        <HeroShowcase onEnter={openGym} />
      </div>
    );
  }

  if (pricingOpen) {
    return (
      <PricingView
        onBack={() => setPricingOpen(false)}
        onSetup={() => {
          setPricingOpen(false);
          setGymOpen(true);
          setStage("setup");
          setViewState("setup");
        }}
        onPro={() => {
          activatePro();
          setPricingOpen(false);
          setGymOpen(true);
          setStage("setup");
          setViewState("setup");
        }}
        canReturnToCall={gymOpen && stage !== "setup"}
      />
    );
  }

  if (!gymOpen) {
    return (
      <Landing
        onEnter={openGym}
        onPricing={() => setPricingOpen(true)}
        onPro={openPro}
      />
    );
  }

  return (
    <div key={viewState} className="view-in grid h-dvh grid-rows-[auto_1fr_auto] overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={goHome}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Back to home"
          >
            <img src="/logo.png" alt="" className="h-10 w-auto shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                Talk<span className="text-blue-600">Flow</span>
              </div>
              <div className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-blue-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                <span className="truncate">Meta Muse Spark 1.3 AI</span>
              </div>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={goHome}
              className="hidden text-xs font-medium text-slate-500 transition hover:text-blue-600 sm:inline"
            >
              Back to Home
            </button>
            <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm sm:flex">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              {isPro ? "Pro · Unlimited" : `${credits}/3 Free Practice Credits`}
            </div>
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 shadow-sm sm:hidden">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              {isPro ? "Pro" : `${credits}/3`}
            </div>
            <button
              type="button"
              onClick={() => setPricingOpen(true)}
              className="text-xs font-medium text-slate-500 transition hover:text-indigo-600 sm:text-sm"
            >
              Pricing
            </button>
          </div>
        </div>
      </header>

      <main
        className={`min-h-0 ${stage === "live" ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        <div
          className={`mx-auto flex w-full flex-col px-4 py-4 md:px-6 ${
            stage === "live" || stage === "analyzing" ? "h-full min-h-0" : ""
          } ${stage === "debrief" ? "max-w-6xl" : stage === "setup" ? "max-w-5xl" : "max-w-3xl"}`}
        >
          <div
            key={stage}
            className={`stage-in ${stage === "live" || stage === "analyzing" ? "flex h-full min-h-0 w-full flex-1 flex-col" : "w-full"}`}
          >
            {stage === "setup" && (
              <section className="w-full pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  TalkFlow
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                  Set up the <span className="text-blue-600">call</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
                  Choose the buyer, the company, how hard they push, and what
                  you are trying to get from the call.
                </p>

                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Recording preset
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {demoApplied
                        ? "Skeptical CTO · SaaS Enterprise · Hard · Book a demo meeting"
                        : "One click loads a buyer that is ready to record."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applyDemoMode}
                    aria-pressed={demoApplied}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      demoApplied
                        ? "bg-slate-900 text-white shadow-md"
                        : "border border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Demo Mode
                  </button>
                </div>

                <h2 className="mt-8 text-sm font-semibold text-slate-800">
                  1. Choose the product you are selling
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {PRODUCTS.map((item) => {
                    const Icon = productIcons[item.id] ?? PenLine;
                    const selected = productId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setProductId(item.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-500/10"
                            : "border-slate-200 bg-white shadow-sm hover:border-blue-200"
                        }`}
                      >
                        <span
                          className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span
                          className={`mt-3 block text-sm font-semibold ${selected ? "text-blue-700" : "text-slate-900"}`}
                        >
                          {item.name}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                          {item.blurb}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <label className="mt-4 block">
                  <span className="text-xs font-medium text-slate-500">
                    Or your own product
                  </span>
                  <input
                    value={customProduct}
                    onChange={(event) => {
                      setCustomProduct(event.target.value);
                      setProductId("custom");
                    }}
                    onFocus={() => setProductId("custom")}
                    maxLength={200}
                    placeholder="e.g. an industrial maintenance contract"
                    className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
                      productId === "custom" ? "border-blue-600 shadow-md shadow-blue-500/10" : "border-slate-200 shadow-sm"
                    }`}
                  />
                </label>

                <h2 className="mt-8 text-sm font-semibold text-slate-800">
                  2. Choose a buyer persona
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {PERSONAS.map((item) => {
                    const Icon = personaIcons[item.id];
                    const selected = personaId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setPersonaId(item.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-blue-600 bg-blue-50 shadow-md shadow-blue-500/10"
                            : "border-slate-200 bg-white shadow-sm hover:border-blue-200"
                        }`}
                      >
                        <span
                          className={`grid h-10 w-10 place-items-center rounded-xl ${selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span
                          className={`mt-3 block text-sm font-semibold ${selected ? "text-blue-700" : "text-slate-900"}`}
                        >
                          {item.name}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                          {item.tagline}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <h2 className="mt-8 text-sm font-semibold text-slate-900">
                  3. Industry
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {INDUSTRIES.map((item) => (
                    <SelectCard
                      key={item.id}
                      selected={industryId === item.id}
                      onClick={() => setIndustryId(item.id)}
                      icon={item.id === "saas" ? LayoutDashboard : Factory}
                      title={item.name}
                      body={item.blurb}
                    />
                  ))}
                </div>

                <h2 className="mt-8 text-sm font-semibold text-slate-900">
                  4. Company size
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {COMPANY_SIZES.map((item) => (
                    <SelectCard
                      key={item.id}
                      selected={companySizeId === item.id}
                      onClick={() => setCompanySizeId(item.id)}
                      icon={item.id === "startup" ? Rocket : Building2}
                      title={item.name}
                      body={item.blurb}
                    />
                  ))}
                </div>

                <h2 className="mt-8 text-sm font-semibold text-slate-900">
                  5. Difficulty
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {DIFFICULTIES.map((item) => (
                    <SelectCard
                      key={item.id}
                      selected={difficultyId === item.id}
                      onClick={() => setDifficultyId(item.id)}
                      icon={item.id === "easy" ? Check : item.id === "medium" ? Timer : Shield}
                      title={item.name}
                      body={item.blurb}
                    />
                  ))}
                </div>

                <h2 className="mt-8 text-sm font-semibold text-slate-900">
                  6. Call objective
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {OBJECTIVES.map((item) => (
                    <SelectCard
                      key={item.id}
                      selected={objectiveId === item.id}
                      onClick={() => setObjectiveId(item.id)}
                      icon={item.id === "demo" ? CalendarCheck : BadgeCheck}
                      title={item.name}
                      body={item.blurb}
                    />
                  ))}
                </div>

                {!isPro && credits <= 0 && (
                  <p className="mt-4 text-sm text-amber-700">
                    You are out of credits. Upgrade to Pro to keep practicing.
                  </p>
                )}

                <button
                  type="button"
                  onClick={startCall}
                  disabled={!productReady}
                  className="group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-[0_12px_40px_rgba(37,99,235,0.35)] transition hover:bg-indigo-600 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
                >
                  <PhoneCall className="h-5 w-5" />
                  Start Simulation
                </button>
              </section>
            )}

            {stage === "live" && (
              <section className="flex h-full min-h-0 w-full flex-1 flex-col">
                <div
                  className={`${card} flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <PersonaIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {persona.fullName
                          ? `${persona.name} - ${persona.fullName}`
                          : persona.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {persona.title}
                      </div>
                      {pending ? (
                        <div
                          className="mt-1 flex items-center gap-2"
                          aria-live="polite"
                        >
                          <span className="flex gap-1">
                            {[0, 1, 2].map((dot) => (
                              <span
                                key={dot}
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600"
                                style={{ animationDelay: `${dot * 120}ms` }}
                              />
                            ))}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            Persona is thinking...
                          </span>
                        </div>
                      ) : (
                        <div className="truncate text-xs text-slate-400">
                          {productTitle} · {industry.name} {companySize.name} · {difficulty.name} · {objective.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="font-mono text-lg font-semibold tracking-tight text-blue-600"
                    aria-label="Call duration"
                  >
                    {formatTime(elapsed)}
                  </div>
                  <button
                    type="button"
                    onClick={() => void endCall()}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                  >
                    <PhoneOff className="h-4 w-4" />
                    End Call & Analyze
                  </button>
                </div>

                <div
                  className={`${card} mt-3 flex min-h-0 flex-1 flex-col overflow-hidden`}
                >
                  <div
                    ref={scrollerRef}
                    className="chat-scroll flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 px-3 py-4 sm:px-4"
                  >
                    <div className="mt-auto space-y-3">
                      {messages.map((message, index) => {
                        const mine = message.role === "seller";
                        return (
                          <motion.div
                            key={`${index}-${message.role}`}
                            initial={reduce ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex max-w-[88%] flex-col gap-1 ${mine ? "ml-auto items-end" : "mr-auto items-start"}`}
                          >
                            <span className="px-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                              {mine ? "You" : "Buyer"}
                            </span>
                            <div
                              className={
                                mine
                                  ? "rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-relaxed text-white shadow-md shadow-blue-500/10"
                                  : "rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900"
                              }
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                      {pending && (
                        <div
                          className="mr-auto max-w-[88%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3"
                          aria-live="polite"
                        >
                          <p className="text-xs font-medium text-slate-500">
                            Persona is thinking...
                          </p>
                          <span className="mt-2 flex gap-1">
                            {[0, 1, 2].map((dot) => (
                              <span
                                key={dot}
                                className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600"
                                style={{ animationDelay: `${dot * 120}ms` }}
                              />
                            ))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      send();
                    }}
                    className={`border-t border-slate-200 bg-white p-3 sm:p-4 ${
                      listening
                        ? "animate-pulse shadow-[0_0_28px_rgba(37,99,235,0.28)] ring-2 ring-inset ring-blue-500"
                        : ""
                    }`}
                  >
                    {error && (
                      <div
                        role="alert"
                        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      >
                        <span>{error}</span>
                        {messages.at(-1)?.role === "seller" && (
                          <button
                            type="button"
                            onClick={() => void requestReply(messages)}
                            className="rounded-full px-3 py-1 text-xs hover:bg-red-100"
                          >
                            Try the reply again
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={toggleListening}
                        aria-pressed={listening}
                        aria-label={
                          listening ? "Stop listening" : "Speak your pitch"
                        }
                        disabled={pending}
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition disabled:opacity-40 ${
                          listening
                            ? "animate-pulse border-transparent bg-blue-600 text-white ring-4 ring-blue-500/40"
                            : "border-slate-200 bg-white text-blue-600 shadow-sm hover:border-blue-300"
                        }`}
                      >
                        {listening ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </button>
                      {listening ? (
                        <div className="flex h-11 shrink-0 items-center gap-2 self-end rounded-2xl border border-blue-200 bg-blue-50 px-3">
                          <Soundwave />
                          <span className="hidden text-xs font-medium text-blue-700 sm:inline">
                            Listening to your pitch...
                          </span>
                        </div>
                      ) : null}
                      <textarea
                        value={draft}
                        disabled={pending}
                        onChange={(event) => {
                          if (listening) stopListening();
                          draftRef.current = event.target.value;
                          setDraft(event.target.value);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            if (!pending) send();
                          }
                        }}
                        rows={2}
                        maxLength={2000}
                        placeholder={
                          pending
                            ? "Persona is thinking..."
                            : listening
                              ? "Listening..."
                              : "Type or speak your pitch..."
                        }
                        className="min-h-[52px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="submit"
                        disabled={pending || !draft.trim()}
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-medium text-white shadow-md shadow-blue-500/10 transition hover:bg-indigo-600 disabled:opacity-40 disabled:shadow-none"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {pending
                        ? "Persona is thinking..."
                        : listening
                          ? "Listening to your pitch..."
                          : "Enter sends · Shift+Enter adds a line · the mic fills the field from speech"}
                    </p>
                  </form>
                </div>
              </section>
            )}

            {stage === "analyzing" && (
              <section className="grid h-full w-full place-items-center">
                <div
                  className={`${card} w-full max-w-md px-6 py-10 text-center`}
                >
                  <div className="mx-auto h-16 w-16 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                  <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
                    Meta Muse Spark 1.3 AI is analyzing your sales pitch...
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Meta Muse Spark 1.3 AI reviews objections, listening, the value
                    proposition, and the close.
                  </p>
                </div>
              </section>
            )}

            {stage === "debrief" && report && (
              <section className="w-full space-y-4 pb-8">
                <div
                  className={`${card} flex flex-col items-center gap-6 p-6 shadow-md md:flex-row md:justify-between md:p-8`}
                >
                  <div className="text-center md:text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                      Debrief
                    </p>
                    <DealBadge status={report.dealStatus} />
                    <p className="mt-3 text-sm text-slate-600">
                      {report.dealStatus}
                    </p>
                    <p className="mt-4 max-w-md text-sm text-slate-500">
                      {productTitle} · {persona.name}
                      <br />
                      {formatTime(elapsed)} · {messages.length}{" "}
                      {messages.length === 1 ? "message" : "messages"}
                      {analyzeModel ? ` · ${modelLabel(analyzeModel)}` : ""}
                    </p>
                  </div>
                  <ScoreGauge score={report.overallScore} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {metricMeta.map((metric) => {
                    const Icon = metric.icon;
                    const value = report.metrics[metric.key];
                    return (
                      <article key={metric.key} className={`${card} p-4`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-2xl font-semibold tracking-tight text-blue-600">
                            {value}%
                          </span>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-slate-900">
                          {metric.label}
                        </h3>
                        <p className="text-xs text-slate-500">{metric.hint}</p>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            className="h-full rounded-full bg-blue-600"
                            initial={reduce ? false : { width: 0 }}
                            animate={{ width: `${value}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <InsightCard
                    title="Key strengths"
                    items={report.highlights}
                    icon={Check}
                    tone="border-emerald-200 bg-emerald-50/60"
                    iconClass="bg-emerald-100 text-emerald-700"
                  />
                  <InsightCard
                    title="Handled objections"
                    items={report.handledObjections}
                    icon={Shield}
                    tone="border-slate-200 bg-white"
                    iconClass="bg-blue-50 text-blue-600"
                  />
                  <InsightCard
                    title="Improvement tips"
                    items={report.keyLessons}
                    icon={Sparkles}
                    tone="border-blue-200 bg-blue-50/70"
                    iconClass="bg-blue-100 text-blue-700"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={retry}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyReport()}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-md shadow-blue-500/15 transition hover:bg-indigo-600"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy Report to Clipboard"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center md:px-6">
          <p>Powered by Meta Muse Spark 1.3 AI</p>
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href="https://dev.meta.ai"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blue-600"
            >
              API Status
            </a>
            <span aria-hidden>•</span>
            <button
              type="button"
              onClick={() => setLegal("privacy")}
              className="hover:text-blue-600"
            >
              Privacy Policy
            </button>
            <span aria-hidden>•</span>
            <button
              type="button"
              onClick={() => setLegal("terms")}
              className="hover:text-blue-600"
            >
              Terms
            </button>
          </nav>
        </div>
      </footer>

      {upgradeOpen && (
        <Modal title="Upgrade to Pro" onClose={() => setUpgradeOpen(false)}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Crown className="h-3.5 w-3.5" />
            {isPro
              ? "Pro is already active in this browser"
              : "Unlimited practice, stored locally"}
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Unlimited practice credits</li>
            <li>The same buyer personas and a custom product</li>
            <li>A feedback report after every call</li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            The Pro demo is stored only in this browser. You will not be
            charged.
          </p>
          <button
            type="button"
            onClick={activatePro}
            disabled={isPro}
            className="mt-5 w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {isPro ? "Pro active" : "Activate Pro demo"}
          </button>
        </Modal>
      )}

      {legal && (
        <Modal
          title={legal === "privacy" ? "Privacy Policy" : "Terms"}
          onClose={() => setLegal(null)}
        >
          {legal === "privacy" ? (
            <div className="space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                The call text is sent to the Meta Model API. The buyer and the
                analysis both use Meta Muse Spark 1.3 AI in Contributor mode,
                so Meta may use that content to train future models.
              </p>
              <p>
                The microphone uses the browser speech recognizer in English. If
                MODEL_API_KEY is set and the browser has no speech support,
                audio is sent to Muse Voice Transcribe.
              </p>
              <p>
                TalkFlow does not store the conversation on a server. The
                browser only remembers free credits and the Pro demo.
              </p>
              <p>
                Do not put passwords, personal data, or confidential material
                from a real customer into a call.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                TalkFlow is a practice tool. The other party is simulated, and
                the conversation is not a real sales situation.
              </p>
              <p>
                Scores and deal status come from the model. They are not a
                guarantee of a real sales outcome.
              </p>
              <p>The Pro demo is a local feature, not a paid subscription.</p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function DealBadge({ status }: { status: DealStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <div
      className={`mt-4 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.12em] sm:text-sm sm:tracking-[0.16em] ${meta.className}`}
    >
      <Icon className="h-4 w-4" />
      {meta.label}
    </div>
  );
}

function InsightCard({
  title,
  items,
  icon: Icon,
  tone,
  iconClass,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
  tone: string;
  iconClass: string;
}) {
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={`${title}-${item}`}
            className="flex gap-3 text-sm leading-relaxed text-slate-700"
          >
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${iconClass}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
