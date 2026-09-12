import { describe, expect, it } from "vitest";

import { applyApplicationPackClaimVerification, buildApplicationPackClaimInputs } from "@/lib/agents/application-pack-claim-verifier";

import type { ApplicationPackCore } from "@/lib/agents/application-pack-generator";

function createApplicationPack(): ApplicationPackCore {
    return {
        fitSummary: {
            headline: "Relevant foundations",
            summary: "Candidate has verified API and AI integration experience.",
            fitScore: 60,
            strongCount: 1,
            partialCount: 1,
            unsupportedCount: 1,
        },
        sellingPoints: [
            {
                title: "API Development",
                description: "Relevant REST API experience.",
                evidenceRefs: [
                    {
                        requirementId: "req-1",
                        requirement: "REST API development",
                        status: "strong",
                        evidence: [
                            "REST APIs",
                            "Built and integrated REST APIs",
                        ],
                    },
                ],

                claims: [
                    {
                        text: "Built and integrated REST APIs.",
                        verificationStatus: "pending",
                        evidenceRefs: [
                            {
                                requirementId: "req-1",
                                requirement: "REST API development",
                                status: "strong",
                                evidence: [
                                    "REST APIs",
                                    "Built and integrated REST APIs",
                                ],
                            },
                        ],

                        verification: {
                        reasoning: "Pending semantic verification.",
                        confidence: 0,
                        },
                    },
                ],
            },

            {
                title: "AI Integration",
                description: "Relevant AI integration experience.",
                evidenceRefs: [
                    {
                        requirementId: "req-2",
                        requirement: "AI integration and deployment",
                        status: "partial",
                        evidence: [
                            "Integrated Gemini for AI functionality",
                        ],
                    },
                ],

                claims: [
                    {
                        text: "Deployed Gemini models to production.",
                        verificationStatus: "pending",
                        evidenceRefs: [
                            {
                                requirementId: "req-2",
                                requirement: "AI integration and deployment",
                                status: "partial",
                                evidence: [
                                    "Integrated Gemini for AI functionality",
                                ],
                            },
                        ],
                        verification: {
                            reasoning: "Pending semantic verification.",
                            confidence: 0,
                        },
                    },
                ],
            },
        ],

        gaps: [],
    };
}

describe("Application Pack claim verification", () => {
    it("builds verifier inputs from exact evidence refs", () => {
        const pack = createApplicationPack();
        const inputs = buildApplicationPackClaimInputs(pack);

        expect(inputs).toEqual([
            {
                id: "selling-0-claim-0",
                claim: "Built and integrated REST APIs.",
                evidence: [
                    "REST APIs",
                    "Built and integrated REST APIs",
                ],
            },
            {
                id: "selling-1-claim-0",
                claim: "Deployed Gemini models to production.",
                evidence: [
                    "Integrated Gemini for AI functionality",
                ],
            },
        ]);
    });

    it("deduplicates evidence before semantic verification", () => {
        const pack = createApplicationPack();
        pack.sellingPoints[0].claims[0].evidenceRefs.push({
            requirementId: "req-extra",
            requirement: "Systems integration",
            status: "strong",
            evidence: [
                "Built and integrated REST APIs",
            ],
        });

        const inputs = buildApplicationPackClaimInputs(pack);

        expect(inputs[0].evidence).toEqual([
            "REST APIs",
            "Built and integrated REST APIs",
        ]);
    });

    it("applies verified semantic results", () => {
        const pack = createApplicationPack();
        const result = applyApplicationPackClaimVerification(
            pack,
            [
                {
                    id: "selling-0-claim-0",
                    claim: "Built and integrated REST APIs.",
                    status: "verified",
                    evidence: [
                        "Built and integrated REST APIs",
                    ],
                    reasoning: "Directly supported.",
                    confidence: 1,
                },
            ]
        );

        const claim = result.sellingPoints[0].claims[0];

        expect(claim.verificationStatus).toBe("verified");
        expect(claim.verification).toEqual({
            reasoning: "Directly supported.",
            confidence: 1,
        });
    });

    it("applies rejected semantic results", () => {
        const pack = createApplicationPack();
        const result = applyApplicationPackClaimVerification(
            pack,
            [
                {
                    id: "selling-1-claim-0",
                    claim: "Deployed Gemini models to production.",
                    status: "rejected",
                    evidence: [
                        "Integrated Gemini for AI functionality",
                    ],
                    reasoning: "Integration does not prove deployment.",
                    confidence: 0.99,
                },
            ]
        );

        expect(result.sellingPoints[1].claims[0].verificationStatus).toBe("rejected");
    });

    it("fails closed when a verification result is missing", () => {
        const pack = createApplicationPack();
        const result = applyApplicationPackClaimVerification(pack, []);
        const statuses = result.sellingPoints.flatMap((point) =>
            point.claims.map((claim) => claim.verificationStatus)
        );

        expect(statuses).toEqual(["rejected", "rejected"]);
    });

    it("ignores unknown verification result IDs", () => {
        const pack = createApplicationPack();
        const result = applyApplicationPackClaimVerification(
            pack,
            [
                {
                    id: "fake-claim",
                    claim: "Fake claim",
                    status: "verified",
                    evidence: [],
                    reasoning: "Should be ignored.",
                    confidence: 1,
                },
            ]
        );

        expect(result.sellingPoints.flatMap(
            (point) => point.claims.map((claim) => claim.verificationStatus)
        )).toEqual(["rejected", "rejected"]);
    });

    it("does not replace trusted evidence refs with verifier evidence", () => {
        const pack = createApplicationPack();
        const originalEvidence = pack.sellingPoints[0].claims[0].evidenceRefs;
        const result = applyApplicationPackClaimVerification(
            pack,
            [
                {
                    id: "selling-0-claim-0",
                    claim: "Built and integrated REST APIs.",
                    status: "verified",

                    // Imagine the AI verifier
                    // returned unrelated evidence.
                    evidence: [
                        "INVENTED EVIDENCE",
                    ],

                    reasoning: "Supported.",
                    confidence: 1,
                },
            ]
        );

        expect(result.sellingPoints[0].claims[0].evidenceRefs).toEqual(originalEvidence);
    });
});