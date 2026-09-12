import { describe, expect, it } from "vitest";

import { hydrateApplicationPackCore, type GeneratedApplicationPackCore } from "@/lib/agents/application-pack-generator";
import type { ApplicationPackContext } from "@/lib/agents/application-pack";

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
        reasoning: "Direct REST API evidence.",
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
        reasoning: "Integration is supported, deployment is not.",
        confidence: 0.85,
    },
];

const context: ApplicationPackContext = {
    job: {
        title: "AI Software Engineer",
        company: "Example Company",
    },
    requirements,
    verifiedMatches: matches,
    strongMatches: [matches[0]],
    partialMatches: [matches[2]],
    unsupportedMatches: [matches[1]],
    allowedEvidence: [
        "REST APIs",
        "Built and integrated REST APIs",
        "Integrated Gemini for AI functionality",
    ],
    forbiddenRequirements: [
        "Docker experience",
    ],
};

function createGenerated(overrides: Partial<GeneratedApplicationPackCore> = {}): GeneratedApplicationPackCore {
    return {
        fitSummary: {
            headline: "Grounded fit",
            summary: "Candidate has relevant verified experience.",
        },
        sellingPoints: [],
        gaps: [],
        ...overrides,
    };
}

describe("hydrateApplicationPackCore", () => {
    it("hydrates a valid strong selling point with verified evidence", () => {
        const generated = createGenerated({
            sellingPoints: [
                {
                    title: "REST API Experience",
                    description: "Candidate has verified REST API experience.",
                    requirementIds: ["req-1"],
                    claims: [
                        {
                            text: "Built and integrated REST APIs.",
                            requirementIds: ["req-1"],
                        },
                    ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.sellingPoints).toHaveLength(1);
        expect(result.sellingPoints[0].evidenceRefs[0]).toEqual({
            requirementId: "req-1",
            requirement: "Experience with REST APIs",
            status: "strong",
            evidence: [
                "REST APIs",
                "Built and integrated REST APIs",
            ],
        });
    });

    it("allows a partial requirement as a selling point with verified evidence", () => {
        const generated = createGenerated({
            sellingPoints: [
                {
                    title: "AI Integration",
                    description: "Candidate has verified AI integration experience.",
                    requirementIds: ["req-3"],
                    claims: [
                        {
                            text: "Integrated Gemini for AI functionality.",
                            requirementIds: ["req-3"],
                        },
                    ],
                    },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.sellingPoints).toHaveLength(1);
        expect(result.sellingPoints[0].evidenceRefs[0].status).toBe("partial");
        expect(result.sellingPoints[0].evidenceRefs[0].evidence).toEqual(["Integrated Gemini for AI functionality"]);
    });

    it("removes an unsupported requirement used as a selling point", () => {
        const generated = createGenerated({
            sellingPoints: [
                {
                    title: "Docker Expertise",
                    description: "Candidate has Docker experience.",
                    requirementIds: ["req-2"],
                    claims: [
                        {
                            text: "Candidate has Docker experience.",
                            requirementIds: ["req-2"],
                        },
                    ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.sellingPoints).toHaveLength(0);
    });

    it("removes a selling point with an unknown requirement ID", () => {
        const generated = createGenerated({
            sellingPoints: [
                {
                    title: "Invented Skill",
                    description: "Candidate has an invented skill.",
                    requirementIds: ["req-999"],
                    claims: [
                        {
                            text: "Candidate has an invented skill.",
                            requirementIds: ["req-999"],
                        },
                    ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.sellingPoints).toHaveLength(0);
    });

    it("keeps valid refs and removes invalid refs from a mixed selling point", () => {
        const generated = createGenerated({
            sellingPoints: [
                {
                    title: "Mixed Point",
                    description: "Candidate has supported and unsupported areas.",
                    requirementIds: [
                        "req-1",
                        "req-2",
                        "req-999",
                    ],
                    claims: [
                        {
                            text: "Built and integrated REST APIs.",
                            requirementIds: ["req-1"],
                        },

                        {
                            text: "Candidate has Docker experience.",
                            requirementIds: ["req-2"],
                        },
                    ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.sellingPoints).toHaveLength(1);
        expect(result.sellingPoints[0].evidenceRefs).toHaveLength(1);
        expect(result.sellingPoints[0].evidenceRefs[0].requirementId).toBe("req-1");
    });

    it("creates a valid gap for an unsupported requirement", () => {
        const generated = createGenerated({
            gaps: [
                {
                    requirementId: "req-2",
                    explanation: "Docker experience is not supported.",
                    doNotClaim: [
                        "Docker production experience",
                    ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.gaps).toEqual([
            {
                requirementId: "req-2",
                requirement: "Docker experience",
                status: "unsupported",
                explanation: "Docker experience is not supported.",
                doNotClaim: [
                    "Docker production experience",
                ],
            },
        ]);
    });

    it("creates a valid gap for a partial requirement", () => {
        const generated = createGenerated({
            gaps: [
                {
                requirementId: "req-3",
                explanation: "Integration is supported, deployment is not.",
                doNotClaim: [
                    "AI model deployment experience",
                ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.gaps).toHaveLength(1);
        expect(result.gaps[0].status).toBe("partial");
    });

    it("removes a strong requirement incorrectly returned as a gap", () => {
        const generated = createGenerated({
            gaps: [
                {
                    requirementId: "req-1",
                    explanation: "REST APIs are supposedly a gap.",
                    doNotClaim: [
                        "REST API experience",
                    ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.gaps).toHaveLength(0);
    });

    it("removes a gap with an unknown requirement ID", () => {
        const generated = createGenerated({
            gaps: [
                {
                    requirementId: "req-999",
                    explanation: "Invented gap.",
                    doNotClaim: [
                        "Invented experience",
                    ],
                },
            ],
        });

        const result = hydrateApplicationPackCore(context, 65, generated );

        expect(result.gaps).toHaveLength(0);
    });

    it("uses deterministic fit metrics instead of generated metrics", () => {
        const generated = createGenerated();
        const result = hydrateApplicationPackCore(context, 65, generated);

        expect(result.fitSummary).toEqual({
            headline: "Grounded fit",
            summary: "Candidate has relevant verified experience.",
            fitScore: 65,
            strongCount: 1,
            partialCount: 1,
            unsupportedCount: 1,
        });
    });
});