import { getGemini, withGeminiRetry } from "@/lib/ai/gemini";

import type {
    ApplicationGap,
    ApplicationPackEvidenceRef,
    FitSummary,
    SellingPoint,
    VerifiedApplicationClaim,
} from "@/types/application-pack";

import type { ApplicationPackContext } from "@/lib/agents/application-pack";

interface GeneratedSellingPoint {
    title: string;
    description: string;
    claims: Array<{
        text: string;
        requirementIds: string[];
    }>;
    requirementIds: string[];
}

interface GeneratedGap {
    requirementId: string;
    explanation: string;
    doNotClaim: string[];
}

export interface GeneratedApplicationPackCore {
    fitSummary: {
        headline: string;
        summary: string;
    };
    sellingPoints: GeneratedSellingPoint[];
    gaps: GeneratedGap[];
}

export interface ApplicationPackCore {
    fitSummary: FitSummary;
    sellingPoints: SellingPoint[];
    gaps: ApplicationGap[];
}

function buildEvidenceRef(context: ApplicationPackContext, requirementId: string): ApplicationPackEvidenceRef | null {
    const match = context.verifiedMatches.find((item) => item.requirementId === requirementId);

    if (!match) {
        return null;
    }

    return {
        requirementId: match.requirementId,
        requirement: match.requirement,
        status: match.status,
        evidence: match.evidence,
    };
}

function calculateCounts(context: ApplicationPackContext) {
    return {
        strongCount: context.strongMatches.length,
        partialCount: context.partialMatches.length,
        unsupportedCount: context.unsupportedMatches.length,
    };
}

export function hydrateApplicationPackCore(context: ApplicationPackContext, fitScore: number, generated: GeneratedApplicationPackCore): ApplicationPackCore {
    const counts = calculateCounts(context);

    const fitSummary: FitSummary = {
        headline: generated.fitSummary.headline,
        summary: generated.fitSummary.summary,
        fitScore,
        ...counts,
    };

    const sellingPoints = generated.sellingPoints.map<SellingPoint | null>((point) => {
        const evidenceRefs = point.requirementIds.map((requirementId) =>
            buildEvidenceRef(context, requirementId)
        ).filter((ref): ref is ApplicationPackEvidenceRef => ref !== null && ref.status !== "unsupported");

        const claims = point.claims.map<VerifiedApplicationClaim | null>((claim) => {
            const claimEvidenceRefs = claim.requirementIds.map((requirementId) =>
                    buildEvidenceRef(context, requirementId)
            ).filter((ref): ref is ApplicationPackEvidenceRef => ref !== null && ref.status !== "unsupported");

            if (claimEvidenceRefs.length === 0) {
                return null;
            }

            return {
                text: claim.text,
                verificationStatus: "pending",
                evidenceRefs: claimEvidenceRefs,
                verification: {
                    reasoning: "Pending semantic verification.",
                    confidence: 0,
                },
            };
        }).filter((claim): claim is VerifiedApplicationClaim => claim !== null);

        if (evidenceRefs.length === 0 || claims.length === 0) {
            return null;
        }

        return {
            title: point.title,
            description: point.description,
            claims,
            evidenceRefs,
        };
    }).filter((point): point is SellingPoint => point !== null);

    const gaps: ApplicationGap[] = generated.gaps.map((gap) => {
        const match = context.verifiedMatches.find((item) => item.requirementId === gap.requirementId);

        if (!match || match.status === "strong") {
            return null;
        }

        return {
            requirementId: match.requirementId,
            requirement: match.requirement,
            status: match.status,
            explanation: gap.explanation,
            doNotClaim: gap.doNotClaim,
        };
    }).filter((gap): gap is ApplicationGap => gap !== null);

    return {
        fitSummary,
        sellingPoints,
        gaps,
    };
}

export async function generateApplicationPackCore(context: ApplicationPackContext, fitScore: number): Promise<ApplicationPackCore> {
    const prompt = `
        You are ApplyPilot's Application Strategy Agent.

        Your job is to create a grounded application strategy using ONLY the verified requirement matches provided below.

        You are NOT allowed to invent candidate experience.

        IMPORTANT:

        - Use only the supplied VERIFIED MATCHES.
        - Never invent technologies, experience, achievements, responsibilities, duration, seniority, or qualifications.
        - Do not create evidence strings.
        - Do not paraphrase candidate evidence as if it were a new fact.
        - When referencing candidate experience, select the relevant requirementId only.
        - Application claims will later be connected to verified evidence deterministically.
        - Unsupported requirements must NEVER be presented as candidate strengths.
        - Partial requirements may be discussed only with clear limitations.
        - Be conservative.

        SELLING POINT RULES:
        1. Prefer requirements with status "strong".
        2. You may use a "partial" requirement only when the description clearly reflects the limitation.
        3. Never use an "unsupported" requirement as a selling point.
        4. Generate between 3 and 5 selling points when enough supported evidence exists.
        5. Every selling point must contain at least one valid requirementId.
        6. Do not exaggerate project or internship scope.

        FIT SUMMARY RULES:
        7. The headline should be concise and realistic.
        8. The summary should explain the candidate's overall alignment with the role.
        9. Mention meaningful strengths and major gaps.
        10. Do not describe the candidate as a perfect or ideal fit unless the supplied evidence genuinely supports that.
        11. Do not invent percentages or scores. The actual fit score is supplied separately.

        GAP RULES:
        12. Include important unsupported requirements.
        13. Include important partial requirements when there is a meaningful missing capability.
        14. "doNotClaim" must describe claims the candidate should avoid making.
        15. Never suggest falsely claiming experience to close a gap.
        16. Keep gaps practical and factual.
        17. Every gap must reference exactly one supplied requirementId.

        CLAIM RULES:
        - Every selling point MUST contain 1-3 atomic claims.
        - Each claim must express only ONE factual candidate capability.
        - Every claim must reference one or more requirementIds.
        - Do not combine supported and unsupported capabilities into one claim.
        - Do not invent evidence.
        - Do not claim production usage, deployment, scale, years of experience, leadership, seniority, or ownership unless explicitly supported.
        - Claims will be independently verified after generation.
        - Keep claims short and factual.

        OUTPUT RULES:
        Return valid JSON only.
        Return exactly this structure:

        {
            "fitSummary": {
                "headline": "concise headline",
                "summary": "grounded overall fit summary"
            },
            "sellingPoints": [
                {
                    "title": "REST API Development",
                    "description": "Verified experience relevant to API development.",
                    "requirementIds": ["req-11"],
                    "claims": [
                    {
                        "text": "Built and integrated REST APIs.",
                        "requirementIds": ["req-11"]
                    }
                    ]
                }
            ],
            "gaps": [
                {
                    "requirementId": "req-2",
                    "explanation": "what is missing or only partially supported",
                    "doNotClaim": [
                        "claim candidate must not make"
                    ]
                }
            ]
        }

        JOB:
        ${JSON.stringify(context.job, null, 2)}

        FIT SCORE:
        ${fitScore}

        VERIFIED MATCHES:
        ${JSON.stringify(context.verifiedMatches, null, 2)}

        FORBIDDEN / UNSUPPORTED REQUIREMENTS:
        ${JSON.stringify(context.forbiddenRequirements, null, 2)}
    `;

    const response = await withGeminiRetry(() =>
        getGemini().models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: "application/json",
            },
        })
    );

    if (!response.text) {
        throw new Error("Gemini returned an empty application pack response");
    }

    const generated = JSON.parse(response.text) as GeneratedApplicationPackCore;
    
    return hydrateApplicationPackCore(context, fitScore, generated);
}