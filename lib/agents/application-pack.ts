import type { EvidenceMatch, JobRequirement } from "@/types/application";

export interface ApplicationPackContext {
    job: {
        title: string;
        company: string;
    };
    requirements: JobRequirement[];
    verifiedMatches: EvidenceMatch[];
    strongMatches: EvidenceMatch[];
    partialMatches: EvidenceMatch[];
    unsupportedMatches: EvidenceMatch[];
    allowedEvidence: string[];
    forbiddenRequirements: string[];
}

interface BuildApplicationPackContextInput {
    title: string;
    company: string;
    requirements: JobRequirement[];
    matches: EvidenceMatch[];
}

export function buildApplicationPackContext({ title, company, requirements, matches }: BuildApplicationPackContextInput): ApplicationPackContext {
    const strongMatches = matches.filter((match) => match.status === "strong");
    const partialMatches = matches.filter((match) => match.status === "partial");
    const unsupportedMatches = matches.filter((match) => match.status === "unsupported");

    const allowedEvidence = Array.from(
        new Set(matches.filter((match) => match.status === "strong" || match.status === "partial").flatMap((match) => match.evidence).filter(Boolean))
    );

    const forbiddenRequirements = unsupportedMatches.map((match) => match.requirement);

    return {
        job: {
            title,
            company,
        },
        requirements,
        verifiedMatches: matches,
        strongMatches,
        partialMatches,
        unsupportedMatches,
        allowedEvidence,
        forbiddenRequirements,
    };
}