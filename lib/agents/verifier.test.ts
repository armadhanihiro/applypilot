import { describe, expect, it } from "vitest";

import { verifyEvidenceMatches } from "@/lib/agents/verifier";
import { scoreMatches } from "@/lib/agents/scoring";

describe("ApplyPilot evidence verifier", () => {
    it("keeps verified candidate evidence", () => {
        const result = verifyEvidenceMatches([
            {
                requirementId: "req-1",
                requirement: "Experience with REST APIs",
                status: "strong",
                evidence: [
                    "Built and integrated REST APIs",
                ],
                reasoning: "Candidate has direct REST API evidence.",
                confidence: 0.95,
            },
        ]);

        expect(result[0].status).toBe("strong");
        expect(result[0].evidence).toEqual(["Built and integrated REST APIs"]);
        expect(result[0].verification.verified).toBe(true);
        expect(result[0].verification.removedUnsupportedEvidence).toEqual([]);
    });

    it("removes hallucinated evidence", () => {
        const result = verifyEvidenceMatches([
            {
                requirementId: "req-2",
                requirement: "5+ years Kubernetes production experience",
                status: "strong",
                evidence: [
                    "5 years of Kubernetes production experience",
                ],
                reasoning: "Candidate has extensive Kubernetes experience.",
                confidence: 0.99,
            },
        ]);

        expect(result[0].status).toBe("unsupported");
        expect(result[0].evidence).toEqual([]);
        expect(result[0].verification.removedUnsupportedEvidence).toEqual(["5 years of Kubernetes production experience"]);
    });

    it("allows partial support only when evidence exists", () => {
        const result = verifyEvidenceMatches([
            {
                requirementId: "req-3",
                requirement: "Experience using LLMs in production applications",
                status: "partial",
                evidence: [
                    "Integrated Gemini for AI functionality",
                ],
                reasoning: "Candidate has relevant LLM integration experience.",
                confidence: 0.78,
            },
        ]);

        expect(result[0].status).toBe("partial");
        expect(result[0].evidence.length).toBe(1);
        expect(result[0].verification.verified).toBe(true);
    });
});

describe("ApplyPilot scoring", () => {
    it("calculates deterministic fit score", () => {
        const verifiedMatches = verifyEvidenceMatches([
            {
                requirementId: "req-1",
                requirement: "REST API experience",
                status: "strong",
                evidence: [
                    "Built and integrated REST APIs",
                ],
                reasoning: "Direct support.",
                confidence: 0.95,
            },

            {
                requirementId: "req-2",
                requirement: "LLM experience",
                status: "partial",
                evidence: [
                    "Integrated Gemini for AI functionality",
                ],
                reasoning: "Related support.",
                confidence: 0.8,
            },

            {
                requirementId: "req-3",
                requirement: "Kubernetes",
                status: "unsupported",
                evidence: [],
                reasoning: "No evidence.",
                confidence: 0.95,
            },
        ]);

        const scoring = scoreMatches(verifiedMatches);

        expect(scoring.fitScore).toBe(50);
        expect(scoring.metrics.strong).toBe(1);
        expect(scoring.metrics.partial).toBe(1);
        expect(scoring.metrics.unsupported).toBe(1);
        expect(scoring.metrics.total).toBe(3);

        expect(scoring.metrics.unsupportedGeneratedClaims).toBe(0);
    });

    it("counts hallucinated evidence removed by verifier", () => {
        const verifiedMatches = verifyEvidenceMatches([
            {
                requirementId: "req-1",
                requirement: "Kubernetes",
                status: "strong",
                evidence: [
                    "Managed Kubernetes clusters in production",
                ],
                reasoning: "Claimed direct experience.",
                confidence: 0.99,
            },
        ]);

        const scoring = scoreMatches(verifiedMatches);

        expect(scoring.fitScore).toBe(0);
        expect(scoring.metrics.unsupportedGeneratedClaims).toBe(1);
        expect(verifiedMatches[0].status).toBe("unsupported");
    });
});