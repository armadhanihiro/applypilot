import { candidateProfile } from "@/data/candidate";
import type { EvidenceMatch, JobRequirement } from "@/types/application";

const STOP_WORDS = new Set([
  "experience",
  "with",
  "using",
  "building",
  "build",
  "developing",
  "development",
  "knowledge",
  "understanding",
  "ability",
  "skills",
  "skill",
  "years",
  "year",
  "required",
  "preferred",
  "strong",
  "working",
]);

function normalize(text: string) {
  return text.toLowerCase();
}

function tokenize(text: string) {
  return normalize(text)
    .replace(/[^\w+#.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => word.length > 2)
    .filter((word) => !STOP_WORDS.has(word));
}

function scoreEvidence(requirement: string, evidence: string) {
  const requirementTokens = tokenize(requirement);
  const evidenceText = normalize(evidence);

  let matches = 0;

  for (const token of requirementTokens) {
    if (evidenceText.includes(token)) {
      matches++;
    }
  }

  if (requirementTokens.length === 0) {
    return 0;
  }

  return matches / requirementTokens.length;
}

export function matchRequirement(requirement: JobRequirement): EvidenceMatch {
  const evidencePool: string[] = [
    ...candidateProfile.skills,
    ...candidateProfile.experience.flatMap((item) => item.evidence),
    ...candidateProfile.projects.flatMap((item) => item.evidence),
  ];

  const scoredEvidence = evidencePool
    .map((evidence) => ({
      evidence,
      score: scoreEvidence(
        requirement.requirement,
        evidence
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const strongEvidence = scoredEvidence.filter((item) => item.score >= 0.6);
  const partialEvidence = scoredEvidence.filter((item) => item.score >= 0.3);

  if (strongEvidence.length > 0) {
    return {
      requirementId: requirement.id,
      requirement: requirement.requirement,
      status: "strong",
      evidence: strongEvidence.slice(0, 4).map((item) => item.evidence),
      reasoning: "Verified candidate evidence strongly overlaps with the core concepts in this requirement.",
      confidence: 0.9,
    };
  }

  if (partialEvidence.length > 0) {
    return {
      requirementId: requirement.id,
      requirement: requirement.requirement,
      status: "partial",
      evidence: partialEvidence.slice(0, 4).map((item) => item.evidence),
      reasoning: "Related candidate evidence exists, but it only partially supports the requirement.",
      confidence: 0.65,
    };
  }

  return {
    requirementId: requirement.id,
    requirement: requirement.requirement,
    status: "unsupported",
    evidence: [],
    reasoning: "No verified candidate evidence was found for this requirement.",
    confidence: 0.95,
  };
}

export function matchRequirements(requirements: JobRequirement[]): EvidenceMatch[] {
  return requirements.map(matchRequirement);
}