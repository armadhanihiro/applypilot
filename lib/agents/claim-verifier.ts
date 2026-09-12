import { getGemini, withGeminiRetry } from "@/lib/ai/gemini";

import type {
    ClaimVerificationBatch,
    ClaimVerificationInput,
    ClaimVerificationResult,
} from "@/types/claim-verification";

export interface GeminiVerificationResult {
    id: string;
    status:
        | "verified"
        | "rejected";
    reasoning: string;
    confidence: number;
}

export interface GeminiVerificationResponse {
    results: GeminiVerificationResult[];
}

function calculateMetrics(results: ClaimVerificationResult[]) {
    const verified = results.filter((result) => result.status === "verified").length;
    const rejected = results.filter((result) => result.status === "rejected").length;
    const total = results.length;

    return {
        total,
        verified,
        rejected,
        verificationRate:
        total === 0 ? 1 : verified / total,
    };
}

export function hydrateClaimVerification(claims: ClaimVerificationInput[], generatedResults: GeminiVerificationResult[]): ClaimVerificationBatch {
    const resultMap = new Map(
        generatedResults.map((result) => [
            result.id,
            result,
        ])
    );

    const results: ClaimVerificationResult[] = claims.map((claim) => {
        const verification = resultMap.get(claim.id);

        // Fail closed:
        // if Gemini forgets a claim, reject it.
        if (!verification) {
            return {
                id: claim.id,
                claim: claim.claim,
                status: "rejected",
                evidence: claim.evidence,
                reasoning: "No verification result was returned for this claim.",
                confidence: 1,
            };
        }

        return {
            id: claim.id,
            claim: claim.claim,
            status: verification.status === "verified" ? "verified" : "rejected",

            // Evidence always comes from input,
            // never from Gemini.
            evidence: claim.evidence,
            reasoning: verification.reasoning,
            confidence: verification.confidence,
        };
    });

    return {
        results,
        metrics: calculateMetrics(results),
    };
}

export async function verifyClaims(claims: ClaimVerificationInput[]): Promise<ClaimVerificationBatch> {
    if (claims.length === 0) {
        return {
            results: [],
            metrics: {
                total: 0,
                verified: 0,
                rejected: 0,
                verificationRate: 1,
            },
        };
    }

    const prompt = `
        You are ApplyPilot's Semantic Claim Verifier.
        Your job is NOT to improve, rewrite, or make claims sound better.
        Your only job is to determine whether each generated claim is fully supported by its supplied verified evidence.

        CRITICAL RULES:
        1. Use ONLY the evidence supplied with each claim.
        2. Do not use outside knowledge.
        3. Do not infer missing experience.
        4. A claim is "verified" only when ALL material parts of the claim are directly supported by the evidence.
        5. If any meaningful part of the claim goes beyond the evidence, mark it "rejected".
        6. Related technologies or activities are not automatically equivalent.
        7. Integration does NOT prove:
        - deployment
        - production usage
        - model training
        - fine-tuning
        - MLOps
        8. Using an LLM does NOT automatically prove:
        - prompt engineering
        - agentic workflows
        - LLM orchestration
        - autonomous agents
        9. A skill name does not prove:
        - professional experience
        - years of experience
        - production experience
        - seniority
        - ownership
        10. Project or internship evidence is valid, but its scope must not be exaggerated.
        11. Never accept invented:
        - metrics
        - achievements
        - responsibilities
        - technologies
        - duration
        - scale
        - production usage
        12. When uncertain, REJECT the claim.

        EXAMPLES:

        Evidence:
        ["Integrated Gemini for AI functionality"]

        Claim:
        "Integrated Gemini into AI functionality."

        Result:
        verified

        Evidence:
        ["Integrated Gemini for AI functionality"]

        Claim:
        "Deployed Gemini-powered AI models to production."

        Result:
        rejected

        Evidence:
        ["Python"]

        Claim:
        "Experienced Python developer with five years of production experience."

        Result:
        rejected

        Evidence:
        [
            "Worked with Gemini embeddings",
            "Worked with FAISS vector search"
        ]

        Claim:
        "Worked with embeddings and FAISS vector search."

        Result:
        verified

        Return JSON only.

        Return exactly:

        {
            "results": [
                {
                    "id": "claim-1",
                    "status": "verified",
                    "reasoning": "Short factual explanation.",
                    "confidence": 0.98
                }
            ]
        }

        Evaluate EVERY claim exactly once.

        CLAIMS:
        ${JSON.stringify(claims, null, 2)}
    `;

    const response = await withGeminiRetry(() =>
        getGemini().models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
                temperature: 0,
                responseMimeType: "application/json",
            },
        })
    );

    if (!response.text) {
        throw new Error("Gemini returned no claim verification");
    }

    const parsed = JSON.parse(response.text) as GeminiVerificationResponse;

    if (!Array.isArray(parsed.results)) {
        throw new Error("Claim verifier response is missing results");
    }

    return hydrateClaimVerification(claims, parsed.results);
}