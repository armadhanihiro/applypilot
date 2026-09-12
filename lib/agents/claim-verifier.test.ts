import { describe, expect, it } from "vitest";

import { hydrateClaimVerification, type GeminiVerificationResult } from "@/lib/agents/claim-verifier";

import type { ClaimVerificationInput } from "@/types/claim-verification";

const claims: ClaimVerificationInput[] = [
    {
        id: "claim-1",
        claim: "Built and integrated REST APIs.",
        evidence: [
            "Built and integrated REST APIs",
        ],
    },
    {
        id: "claim-2",
        claim: "Deployed Gemini models to production.",
        evidence: [
            "Integrated Gemini for AI functionality",
        ],
    },
];

describe("hydrateClaimVerification", () => {
    it("preserves a verified claim", () => {
        const generated: GeminiVerificationResult[] = [
            {
                id: "claim-1",
                status: "verified",
                reasoning: "The claim is directly supported.",
                confidence: 0.99,
            },
        ];

        const result = hydrateClaimVerification([claims[0]], generated);

        expect(result.results[0].status).toBe("verified");
        expect(result.results[0].evidence).toEqual(["Built and integrated REST APIs"]);
    });

    it("preserves a rejected claim", () => {
        const generated: GeminiVerificationResult[] = [
            {
                id: "claim-2",
                status: "rejected",
                reasoning: "Integration does not prove production deployment.",
                confidence: 0.99,
            },
        ];

        const result = hydrateClaimVerification([claims[1]], generated);

        expect( result.results[0].status).toBe("rejected");
    });

    it("rejects a claim when Gemini omits its result", () => {
        const result = hydrateClaimVerification(claims, []);

        expect(result.results).toHaveLength(2);
        expect(result.results.every((item) => item.status === "rejected")).toBe(true);
    });

    it("ignores unknown Gemini result IDs", () => {
        const generated: GeminiVerificationResult[] = [
            {
                id: "claim-999",
                status: "verified",
                reasoning: "Unknown claim.",
                confidence: 1,
            },
        ];

        const result = hydrateClaimVerification([claims[0]], generated);

        expect(result.results).toHaveLength(1);
        expect(result.results[0].id).toBe("claim-1");
        expect(result.results[0].status).toBe("rejected");
    });

    it("never accepts evidence returned by Gemini", () => {
        const generated: GeminiVerificationResult[] = [
            {
                id: "claim-1",
                status: "verified",
                reasoning: "Supported.",
                confidence: 0.95,
            },
        ];

        const result = hydrateClaimVerification([claims[0]], generated);

        expect(result.results[0].evidence).toEqual(claims[0].evidence);
    });

    it("calculates verification metrics deterministically", () => {
        const generated: GeminiVerificationResult[] = [
            {
                id: "claim-1",
                status: "verified",
                reasoning: "Supported.",
                confidence: 0.99,
            },
            {
                id: "claim-2",
                status: "rejected",
                reasoning: "Unsupported deployment claim.",
                confidence: 0.99,
            },
        ];

        const result = hydrateClaimVerification(claims, generated);

        expect(result.metrics).toEqual({
            total: 2,
            verified: 1,
            rejected: 1,
            verificationRate: 0.5,
        });
    });

    it("returns perfect verification rate for an empty batch", () => {
        const result = hydrateClaimVerification([], []);

        expect(result.metrics).toEqual({
            total: 0,
            verified: 0,
            rejected: 0,
            verificationRate: 1,
        });
    });
  }
);