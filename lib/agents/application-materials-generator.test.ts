import { describe, expect, it } from "vitest";

import { hydrateApplicationMaterials } from "@/lib/agents/application-materials-generator";

import type { VerifiedApplicationClaim } from "@/types/application-pack";

function createVerifiedClaims(): VerifiedApplicationClaim[] {
    return [
        {
            text: "Built and integrated REST APIs.",
            verificationStatus: "verified",
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
                reasoning: "Directly supported.",
                confidence: 1,
            },
        },

        {
            text: "Worked with Gemini embeddings and FAISS vector search.",
            verificationStatus: "verified",
            evidenceRefs: [
                {
                    requirementId: "req-2",
                    requirement: "Vector databases and embeddings",
                    status: "strong",
                    evidence: [
                        "Worked with Gemini embeddings",
                        "Worked with FAISS vector search",
                    ],
                },
            ],

            verification: {
                reasoning: "Directly supported.",
                confidence: 0.99,
            },
        },
    ];
}

describe("application materials hydration", () => {
    it("hydrates resume suggestions using verified claims only", () => {
        const claims = createVerifiedClaims();
        const result = hydrateApplicationMaterials(
            claims,
            {
                resumeSuggestions: [
                    {
                        section: "experience",
                        action: "emphasize",
                        suggestion: "Emphasize relevant API experience.",
                        claimIndexes: [0],
                    },
                ],

                coverLetter: {
                    opening: "I am applying for the role.",
                    paragraphs: [],
                    closing: "I would welcome the opportunity to discuss the role.",
                },
            }
        );

        expect(result.resumeSuggestions).toHaveLength(1);
        expect(result.resumeSuggestions[0].currentEvidence).toEqual(["REST APIs", "Built and integrated REST APIs"]);
    });

    it("hydrates cover letter with exact verified claim text", () => {
        const claims = createVerifiedClaims();
        const result = hydrateApplicationMaterials(
            claims,
            {
                resumeSuggestions: [],
                coverLetter: {
                    opening: "I am applying for the role.",
                    paragraphs: [
                        {
                            introduction: "My background aligns with several core requirements.",
                            claimIndexes: [0],
                        },
                    ],
                    closing: "I would welcome the opportunity to discuss the role.",
                },
            }
        );

        expect(result.coverLetter.bodyParagraphs[0].text).toContain("Built and integrated REST APIs.");
        expect(result.coverLetter.bodyParagraphs[0].claims[0].text).toBe("Built and integrated REST APIs.");
    });

    it("drops invalid claim indexes", () => {
        const claims = createVerifiedClaims();
        const result = hydrateApplicationMaterials(
            claims,
            {
                resumeSuggestions: [
                    {
                        section: "skills",
                        action: "emphasize",
                        suggestion: "Use unsupported claim.",
                        claimIndexes: [999],
                    },
                ],

                coverLetter: {
                    opening: "I am applying for the role.",
                    paragraphs: [
                        {
                            introduction: "Relevant experience includes:",
                            claimIndexes: [999],
                        },
                    ],
                    closing: "Thank you.",
                },
            }
        );

        expect(result.resumeSuggestions).toEqual([]);
        expect(result.coverLetter.bodyParagraphs).toEqual([]);
    });

    it("deduplicates duplicate claim indexes", () => {
        const claims = createVerifiedClaims();
        const result = hydrateApplicationMaterials(
            claims,
            {
                resumeSuggestions: [],
                coverLetter: {
                    opening: "I am applying for the role.",
                    paragraphs: [
                        {
                            introduction: "My relevant experience includes:",
                            claimIndexes: [0, 0, 0],
                        },
                    ],
                    closing: "Thank you.",
                },
            }
        );

        expect(result.coverLetter.bodyParagraphs[0].claims).toHaveLength(1);
    });

    it("preserves exact evidence refs instead of generated evidence", () => {
        const claims = createVerifiedClaims();
        const result = hydrateApplicationMaterials(
            claims,
            {
                resumeSuggestions: [
                    {
                        section: "projects",
                        action: "emphasize",
                        suggestion: "Highlight vector search experience.",
                        claimIndexes: [1],
                    },
                ],

                coverLetter: {
                    opening: "I am applying for the role.",
                    paragraphs: [],
                    closing: "Thank you.",
                },
            }
        );

        expect(result.resumeSuggestions[0].evidenceRefs).toEqual(claims[1].evidenceRefs);
    });

    it("supports multiple verified claims in one paragraph", () => {
        const claims = createVerifiedClaims();
        const result = hydrateApplicationMaterials(
            claims,
            {
                resumeSuggestions: [],
                coverLetter: {
                    opening: "I am applying for the role.",
                    paragraphs: [
                        {
                            introduction: "My experience includes:",
                            claimIndexes: [0, 1],
                        },
                    ],
                    closing: "Thank you.",
                },
            }
        );

        expect(result.coverLetter.bodyParagraphs[0].claims).toHaveLength(2);
        expect(result.coverLetter.bodyParagraphs[0].text).toContain("Worked with Gemini embeddings and FAISS vector search.");
    });
});