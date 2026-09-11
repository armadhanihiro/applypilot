import type { EvidenceMatch } from "@/types/application";

export interface MatchMetrics {
    strong: number;
    partial: number;
    unsupported: number;
    total: number;
    groundedEvidenceRate: number;
    unsupportedGeneratedClaims: number;
}

export interface ScoringResult {
    fitScore: number;
    metrics: MatchMetrics;
}

function getStatusWeight(status: EvidenceMatch["status"]) {
    switch (status) {
        case "strong":
            return 1;
        case "partial":
            return 0.5;
        case "unsupported":
            return 0;
    }
}

export function scoreMatches(matches: EvidenceMatch[]): ScoringResult {
    const total = matches.length;

    if (total === 0) {
        return {
            fitScore: 0,
            metrics: {
                strong: 0,
                partial: 0,
                unsupported: 0,
                total: 0,
                groundedEvidenceRate: 1,
                unsupportedGeneratedClaims: 0,
            },
        };
    }

    const strong = matches.filter((match) => match.status === "strong").length;
    const partial = matches.filter((match) => match.status === "partial").length;
    const unsupported = matches.filter((match) => match.status === "unsupported").length;
    const weightedScore = matches.reduce((sum, match) => sum + getStatusWeight(match.status), 0);

    const fitScore = Math.round((weightedScore / total) * 100);
    const allEvidence = matches.flatMap((match) => match.evidence);

    const groundedEvidenceCount = matches.reduce(
        (count, match) => {
            const verification = (
                match as EvidenceMatch & {
                verification?: {
                    verified: boolean;
                    removedUnsupportedEvidence: string[];
                };
                }
            ).verification;

            if (!verification) {
                return count;
            }

            return verification.verified ? count + match.evidence.length : count;
        },
        0
    );

    const groundedEvidenceRate = allEvidence.length === 0 ? 1 : groundedEvidenceCount / allEvidence.length;

    const unsupportedGeneratedClaims = matches.reduce(
        (count, match) => {
            const verification = (
                match as EvidenceMatch & {
                    verification?: {
                        verified: boolean;
                        removedUnsupportedEvidence: string[];
                    };
                }
            ).verification;

            return (count + (verification?.removedUnsupportedEvidence.length ?? 0));
        },
        0
    );

    return {
        fitScore,
        metrics: {
            strong,
            partial,
            unsupported,
            total,
            groundedEvidenceRate: Math.round(groundedEvidenceRate * 100) / 100,
            unsupportedGeneratedClaims,
        },
    };
}