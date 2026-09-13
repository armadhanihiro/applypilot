import { getGemini, withGeminiRetry } from "@/lib/ai/gemini";

import type { CandidateProfile } from "@/types/candidate";

export async function extractCandidateProfile(cvText: string): Promise<CandidateProfile> {
    if (!cvText.trim()) {
        throw new Error("CV text is empty");
    }

    const gemini = getGemini();

    const prompt = `
    You are extracting candidate evidence from a CV.

    CRITICAL RULES:
    - Use ONLY information explicitly present in the CV.
    - Do not infer experience.
    - Do not invent skills, technologies, achievements, metrics, or responsibilities.
    - Preserve the meaning and specificity of the CV.
    - Evidence statements must be factual and independently supportable by the CV.
    - A technology listed only under Skills must remain a skill. Do not convert it into work experience.
    - Do not infer seniority, years of experience, production experience, leadership, deployment experience, or proficiency levels.
    - If information is absent, omit it.

    Return JSON only using this structure:

    {
        "name": "string",
        "education": [
            {
                "degree": "string",
                "institution": "string",
                "achievement": "string"
            }
        ],
        "experience": [
            {
                "organization": "string",
                "role": "string",
                "evidence": ["exact factual evidence"]
            }
        ],
        "projects": [
            {
                "name": "string",
                "evidence": ["exact factual evidence"]
            }
        ],
        "skills": ["string"]
    }

    CV:
    ${cvText}
    `;

    const response = await withGeminiRetry(() =>
        gemini.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.1,
            },
        })
    );

    const text = response.text;

    if (!text) {
        throw new Error("Gemini returned an empty CV extraction response");
    }

    const parsed = JSON.parse(text) as CandidateProfile;

    return {
        name: parsed.name ?? "",
        education: Array.isArray(parsed.education) ? parsed.education : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    };
}