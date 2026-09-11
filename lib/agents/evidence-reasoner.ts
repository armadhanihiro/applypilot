import { gemini } from "@/lib/ai/gemini";
import { candidateProfile } from "@/data/candidate";
import type { EvidenceMatch, JobRequirement } from "@/types/application";

function buildEvidencePool() {
    return {
        skills: candidateProfile.skills,
        experience: candidateProfile.experience,
        projects: candidateProfile.projects,
        education: candidateProfile.education,
    };
}

export async function reasonAboutRequirements(requirements: JobRequirement[]): Promise<EvidenceMatch[]> {
    const evidencePool = buildEvidencePool();

    const prompt = `
        You are the evidence reasoning agent for ApplyPilot.

        Your task is to evaluate ALL job requirements against the candidate evidence.

        IMPORTANT RULES:
        - Use ONLY the candidate evidence supplied below.
        - Never invent experience, duration, tools, responsibilities, achievements, or qualifications.
        - Do not infer professional experience from a skill name alone if the requirement explicitly asks for professional experience.
        - "strong" means the evidence directly and substantially supports the requirement.
        - "partial" means related evidence exists but does not fully satisfy the requirement.
        - "unsupported" means there is no sufficient verified evidence.
        - Every evidence item MUST be copied EXACTLY from the candidate evidence supplied below.
        - If a claim cannot be traced to candidate evidence, do not use it.
        - Be conservative.
        - Evaluate every requirement exactly once.

        Return valid JSON only.

        Return this shape:

        {
            "matches": [
                {
                    "requirementId": "req-1",
                    "requirement": "original requirement",
                    "status": "strong",
                    "evidence": [
                        "exact evidence string"
                    ],
                    "reasoning": "short explanation",
                    "confidence": 0.9
                }
            ]
        }

        JOB REQUIREMENTS:
        ${JSON.stringify(requirements, null, 2)}

        CANDIDATE EVIDENCE:
        ${JSON.stringify(evidencePool, null, 2)}
    `;

    const response = await gemini.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            temperature: 0,
            responseMimeType: "application/json",
        },
    });

    if (!response.text) {
        throw new Error("Gemini returned no evidence reasoning");
    }

    const parsed = JSON.parse(response.text) as {
        matches: EvidenceMatch[];
    };

    return parsed.matches;
}