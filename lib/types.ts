export type ChatRole = "seller" | "buyer";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

export type DealStatus = "Won" | "No deal" | "Follow-up scheduled";

export type AnalysisMetrics = {
  objectionHandling: number;
  activeListening: number;
  valueProposition: number;
  closingSkill: number;
};

export type AnalysisReport = {
  overallScore: number;
  dealStatus: DealStatus;
  metrics: AnalysisMetrics;
  highlights: string[];
  handledObjections: string[];
  mistakes: string[];
  keyLessons: string[];
};
