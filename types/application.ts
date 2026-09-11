export type RequirementImportance =
  | "required"
  | "preferred"
  | "nice_to_have";

export type MatchStatus =
  | "strong"
  | "partial"
  | "unsupported";

export interface JobRequirement {
  id: string;
  requirement: string;
  importance: RequirementImportance;
}

export interface EvidenceMatch {
  requirementId: string;
  requirement: string;
  status: MatchStatus;
  evidence: string[];
  reasoning: string;
  confidence: number;
}

export interface JobAnalysis {
  title: string;
  company: string;
  requirements: JobRequirement[];
  matches: EvidenceMatch[];
  fitScore: number;
}