import { describe, expect, it } from "vitest";

import { buildApplicationPackContext } from "@/lib/agents/application-pack";

import type { EvidenceMatch, JobRequirement } from "@/types/application";

const requirements: JobRequirement[] = [
    {
        id: "req-1",
        requirement: "Experience with REST APIs",
        importance: "required",
    },
    {
        id: "req-2",
        requirement: "Docker experience",
        importance: "required",
    },
    {
        id: "req-3",
        requirement: "AI model integration and deployment",
        importance: "required",
    },
];

const matches: EvidenceMatch[] = [
    {
        requirementId: "req-1",
        requirement: "Experience with REST APIs",
        status: "strong",
        evidence: [
            "REST APIs",
            "Built and integrated REST APIs",
        ],
        reasoning: "Direct verified REST API evidence.",
        confidence: 0.95,
    },
    {
        requirementId: "req-2",
        requirement: "Docker experience",
        status: "unsupported",
        evidence: [],
        reasoning: "No Docker evidence.",
        confidence: 0.95,
    },
    {
        requirementId: "req-3",
        requirement: "AI model integration and deployment",
        status: "partial",
        evidence: [
            "Integrated Gemini for AI functionality",
        ],
        reasoning:
        "AI integration is supported, but deployment is not.",
        confidence: 0.85,
    },
];

describe("buildApplicationPackContext", () => {
    it("separates matches by status", () => {
        const context = buildApplicationPackContext({
            title: "AI Software Engineer",
            company: "Example Company",
            requirements,
            matches,
        });

        expect(context.strongMatches).toHaveLength(1);
        expect(context.partialMatches).toHaveLength(1);
        expect(context.unsupportedMatches).toHaveLength(1);
        
        expect(context.strongMatches[0].requirementId).toBe("req-1");
        expect(context.partialMatches[0].requirementId).toBe("req-3");
        expect(context.unsupportedMatches[0].requirementId).toBe("req-2");
    });

    it("builds allowed evidence from strong and partial matches only", () => {
        const context = buildApplicationPackContext({
            title: "AI Software Engineer",
            company: "Example Company",
            requirements,
            matches,
        });

        expect(context.allowedEvidence).toEqual([
            "REST APIs",
            "Built and integrated REST APIs",
            "Integrated Gemini for AI functionality",
        ]);
    });

    it("does not include unsupported requirements in allowed evidence", () => {
        const context = buildApplicationPackContext({
            title: "AI Software Engineer",
            company: "Example Company",
            requirements,
            matches,
        });

        expect(context.allowedEvidence.includes("Docker experience")).toBe(false);
    });

    it("creates forbidden requirements from unsupported matches", () => {
        const context = buildApplicationPackContext({
            title: "AI Software Engineer",
            company: "Example Company",
            requirements,
            matches,
        });

        expect(context.forbiddenRequirements).toEqual([
            "Docker experience",
        ]);
    });

    it("preserves job metadata and original matches", () => {
        const context = buildApplicationPackContext({
            title: "AI Software Engineer",
            company: "Example Company",
            requirements,
            matches,
        });

        expect(context.job).toEqual({
            title: "AI Software Engineer",
            company: "Example Company",
        });

        expect(context.requirements).toEqual(requirements);
        expect(context.verifiedMatches).toEqual(matches);
    });

    it("deduplicates allowed evidence", () => {
        const duplicatedMatches: EvidenceMatch[] = [
            ...matches,
            {
                requirementId: "req-4",
                requirement: "Backend API development",
                status: "strong",
                evidence: [
                    "REST APIs",
                    "Built and integrated REST APIs",
                ],
                reasoning: "Same verified evidence reused.",
                confidence: 0.95,
            },
        ];

        const context = buildApplicationPackContext({
            title: "AI Software Engineer",
            company: "Example Company",
            requirements,
            matches: duplicatedMatches,
        });

        expect(context.allowedEvidence.filter((evidence) => evidence === "REST APIs")).toHaveLength(1);
        expect(context.allowedEvidence.filter((evidence) => evidence === "Built and integrated REST APIs")).toHaveLength(1);
    });
});