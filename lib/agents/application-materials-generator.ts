import { getGemini, withGeminiRetry } from "@/lib/ai/gemini";
import { getVerifiedApplicationClaims } from "@/lib/agents/application-pack-claim-verifier";
import type { ApplicationPackCore } from "@/lib/agents/application-pack-generator";

import type { CoverLetterDraft, ResumeSuggestion, VerifiedApplicationClaim } from "@/types/application-pack";

interface GeneratedResumeSuggestion {
    section:
        | "summary"
        | "skills"
        | "experience"
        | "projects";

    action:
        | "add"
        | "rewrite"
        | "emphasize"
        | "remove";

    suggestion: string;
    claimIndexes: number[];
}

interface GeneratedCoverLetterPlan {
    opening: string;
    paragraphs: Array<{
        introduction: string;
        claimIndexes: number[];
    }>;
    closing: string;
}

interface GeneratedApplicationMaterials {
    resumeSuggestions: GeneratedResumeSuggestion[];
    coverLetter: GeneratedCoverLetterPlan;
}

export interface ApplicationMaterials {
    resumeSuggestions: ResumeSuggestion[];
    coverLetter: CoverLetterDraft;
}

function getClaimByIndex(claims: VerifiedApplicationClaim[], index: number) {
    return claims[index] ?? null;
}

function uniqueValidClaims(claims: VerifiedApplicationClaim[], indexes: number[]) {
    const seen = new Set<number>();

    return indexes.filter((index) => {
        if (!Number.isInteger(index) || index < 0 || index >= claims.length || seen.has(index)) {
            return false;
        }

        seen.add(index);

        return true;
    }).map((index) => getClaimByIndex(claims, index)).filter((claim): claim is VerifiedApplicationClaim => claim !== null);
}

export function hydrateApplicationMaterials(verifiedClaims: VerifiedApplicationClaim[], generated: GeneratedApplicationMaterials): ApplicationMaterials {
    const resumeSuggestions = generated.resumeSuggestions.map((suggestion) => {
        const selectedClaims = uniqueValidClaims(verifiedClaims, suggestion.claimIndexes);

        if (selectedClaims.length === 0) {
            return null;
        }

        return {
            section: suggestion.section,
            action: suggestion.action,
            suggestion: suggestion.suggestion,
            currentEvidence: Array.from(new Set(selectedClaims.flatMap((claim) => claim.evidenceRefs.flatMap((ref) => ref.evidence)))),
            evidenceRefs: selectedClaims.flatMap((claim) => claim.evidenceRefs),
        };
    }).filter((suggestion): suggestion is ResumeSuggestion => suggestion !== null);

    const bodyParagraphs = generated.coverLetter.paragraphs.map((paragraph) => {
        const selectedClaims = uniqueValidClaims(verifiedClaims, paragraph.claimIndexes);

        if (selectedClaims.length === 0) {
            return null;
        }

        return {
            text: [
                paragraph.introduction.trim(),
                ...selectedClaims.map((claim) => claim.text),
            ].filter(Boolean).join(" "),

            claims: selectedClaims.map((claim) => ({
                text: claim.text,
                evidenceRefs:
                claim.evidenceRefs,
            })),
        };
    }).filter((paragraph): paragraph is CoverLetterDraft["bodyParagraphs"][number] => paragraph !== null);

    return {
        resumeSuggestions,
        coverLetter: {
            opening: generated.coverLetter.opening,
            bodyParagraphs,
            closing: generated.coverLetter.closing,
        },
    };
}

export async function generateApplicationMaterials(applicationPack: ApplicationPackCore, job: { title: string; company: string; }): Promise<ApplicationMaterials> {
    const verifiedClaims = getVerifiedApplicationClaims(applicationPack);

    if (verifiedClaims.length === 0) {
        return {
            resumeSuggestions: [],
            coverLetter: {
                opening: "",
                bodyParagraphs: [],
                closing: "",
            },
        };
    }

    const safeClaimPayload = verifiedClaims.map((claim, index) => ({
        index,
        text: claim.text,
    }));

    const prompt = `
        You are ApplyPilot's Application Materials Agent.

        Your task is to create an application strategy using ONLY the VERIFIED CLAIMS supplied below.

        CRITICAL SAFETY RULES:

        - Every factual statement about the candidate must come from a VERIFIED CLAIM.
        - Never invent candidate experience.
        - Never add technologies, achievements, responsibilities, seniority, duration, scale, metrics, deployment experience, leadership, or qualifications.
        - Never strengthen or rewrite a verified claim into a broader claim.
        - You must reference candidate capabilities using claimIndexes only.
        - The final candidate claims will be inserted deterministically after generation.
        - Do not repeat rejected or unsupported capabilities.
        - Do not attempt to compensate for missing requirements by inventing experience.

        RESUME RULES:

        - Generate 2-4 useful resume suggestions.
        - Focus only on capabilities represented by the supplied VERIFIED CLAIMS.
        - Each suggestion must reference at least one claimIndex.
        - "suggestion" should explain HOW to position or emphasize the supplied claim.
        - The suggestion itself must not invent new candidate facts.
        - The "suggestion" field is instructional text only.
        - Do not describe the candidate using stronger capability language than the verified claims.
        - Avoid words such as "proficient", "expert", "advanced", "extensive",
        "strong", "proven", or "experienced" unless that exact level is explicitly
        supported by a verified claim.
        - Prefer neutral instructions such as "Highlight", "Emphasize",
        "Feature", or "Prioritize".
        - Do not use the words "verified", "verification", "evidence-backed",
        or similar internal ApplyPilot terminology in employer-facing text.

        COVER LETTER RULES:

        - Write a concise professional opening.
        - Opening may mention only the job title and company.
        - Generate 1-2 body paragraph plans.
        - Each paragraph must reference at least one verified claimIndex.
        - "introduction" must be a transition only.
        - Do NOT place candidate factual claims inside "introduction".
        - Exact verified claim text will be inserted deterministically.
        - Closing should express interest in discussing the role without inventing facts.
        - Do not use "verified", "verification", or other internal ApplyPilot terminology in the cover letter.

        Return valid JSON only.

        Return exactly this structure:

        {
            "resumeSuggestions": [
                {
                    "section": "experience",
                    "action": "emphasize",
                    "suggestion": "Emphasize the API development evidence because it directly aligns with this role.",
                    "claimIndexes": [0]
                }
            ],

            "coverLetter": {
                "opening": "I am writing to apply for the Software Engineer position at Example Company.",
                "paragraphs": [
                    {
                        "introduction": "My background includes experience relevant to several of the role's core requirements.",
                        "claimIndexes": [0, 1]
                    }
                ],
                "closing": "I would welcome the opportunity to discuss how my verified experience could contribute to the team."
            }
        }

        JOB:

        ${JSON.stringify(job, null, 2)}

        VERIFIED CLAIMS:

        ${JSON.stringify(
        safeClaimPayload,
        null,
        2
        )}
    `;

    const response = await withGeminiRetry(() => getGemini().models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            temperature: 0.2,
            responseMimeType: "application/json",
        },
    }));

    if (!response.text) {
        throw new Error("Gemini returned an empty application materials response");
    }

    const generated = JSON.parse(response.text) as GeneratedApplicationMaterials;

    if (!Array.isArray(generated.resumeSuggestions) || !generated.coverLetter || !Array.isArray(generated.coverLetter.paragraphs)) {
        throw new Error("Invalid application materials response");
    }

    return hydrateApplicationMaterials(verifiedClaims, generated);
}