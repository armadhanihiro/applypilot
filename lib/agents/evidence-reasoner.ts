import { getGemini, withGeminiRetry } from "@/lib/ai/gemini";
import type { CandidateProfile } from "@/types/candidate";

import type { EvidenceMatch, JobRequirement } from "@/types/application";

function buildEvidencePool(candidateProfile: CandidateProfile) {
    return {
        skills: candidateProfile.skills,
        experience: candidateProfile.experience,
        projects: candidateProfile.projects,
        education: candidateProfile.education,
    };
}

export async function reasonAboutRequirements(requirements: JobRequirement[], candidateProfile: CandidateProfile): Promise<EvidenceMatch[]> {
    const evidencePool = buildEvidencePool(candidateProfile);

    const prompt = `
        You are ApplyPilot's Evidence Reasoner.

        Your task is to evaluate ALL job requirements against the candidate's verified evidence.

        You MUST use only the candidate evidence supplied below.
        Never invent, infer, embellish, or assume experience that is not explicitly supported.

        For each requirement, assign exactly one status:
        - "strong"
        - "partial"
        - "unsupported"

        STATUS DEFINITIONS:

        STRONG:
        The candidate has explicit, direct, and sufficiently complete evidence covering the requirement.

        PARTIAL:
        Relevant evidence exists, but it covers only part of the requirement, is adjacent rather than exact, or lacks enough detail to claim full coverage.

        UNSUPPORTED:
        There is no verified candidate evidence sufficiently supporting the requirement.

        EVIDENCE RULES:

        1. Use ONLY the candidate evidence supplied below.
        2. Never invent experience, duration, tools, responsibilities, achievements, qualifications, production usage, or seniority.
        3. Every item returned in "evidence" MUST be copied EXACTLY from the candidate evidence supplied below.
        Never paraphrase evidence.
        4. If there is no valid evidence:
        - status must be "unsupported"
        - evidence must be []
        5. Do not infer professional experience from a skill name alone when the requirement explicitly asks for professional experience.
        6. Similar or related technologies are NOT automatically equivalent.

        Examples:
        - PostgreSQL does not prove MySQL.
        - React does not prove Angular.
        - Azure does not prove AWS.
        - Machine Learning does not prove PyTorch.
        - FAISS does not prove experience with every vector database.

        7. Do not infer production experience, deployment, scale, years of experience, commercial use, or senior-level ownership unless explicitly supported.
        
        COMPOUND REQUIREMENT RULES:
        8. "strong" means the evidence covers the FULL requirement or nearly all essential parts.
        9. If a requirement contains multiple technologies, skills, responsibilities, or capabilities, do NOT mark it "strong" unless all or nearly all essential parts are supported.
        10. If evidence supports only part of a compound requirement, mark it "partial".

        Example:

        Requirement:
        "Python and React"

        Evidence:
        "Python"

        Result:
        "partial"

        11. Treat "and" as requiring evidence for each essential component.

        Example:

        Requirement:
        "AI model integration and deployment"

        Evidence:
        "Integrated Gemini for AI functionality"

        Result:
        "partial"

        Integration evidence does NOT automatically prove deployment.

        12. Treat "or" differently.
        If the requirement clearly accepts any one option, explicit evidence for one acceptable option may be enough for "strong".

        Example:

        Requirement:
        "Python or Golang"

        Evidence:
        "Golang"

        Result:
        "strong"

        13. Interpret comma-separated technology lists conservatively.

        Example:

        Requirement:
        "Programming Languages: Swift, C#, Python, JavaScript"

        Evidence:
        "Python"
        "JavaScript"

        Result:
        "partial"

        14. Evidence for one named database, framework, language, platform, or tool does not prove another named one.

        Example:

        Requirement:
        "MySQL, PostgreSQL"

        Evidence:
        "PostgreSQL"

        Result:
        "partial"

        AI-SPECIFIC RULES:

        15. Building or integrating an AI application does NOT automatically prove:
        - production deployment
        - model training
        - fine-tuning
        - MLOps
        - autonomous agent systems

        16. Using an LLM or LLM API does NOT automatically prove:
        - prompt engineering
        - LLM orchestration
        - agentic workflows
        unless candidate evidence explicitly supports those capabilities.

        17. Embeddings and vector search evidence may support requirements involving embeddings, vector similarity, or vector retrieval.
        However, do not use that evidence to claim experience with an unrelated named vector database or platform.
        18. General AI or Machine Learning evidence does NOT prove experience with specifically named frameworks such as PyTorch, TensorFlow, OpenCLIP, or DeepFace.
        19. Project and internship evidence are valid evidence, but do not exaggerate their scope.
        
        CONSERVATIVE DECISION RULES:
        20. When uncertain between "strong" and "partial", choose "partial".
        21. When uncertain between "partial" and "unsupported", choose "unsupported".
        22. It is better to under-claim than over-claim.
        23. Unsupported experience must NEVER be generated to make the candidate appear more qualified.

        REASONING RULES:
        24. Keep reasoning short, factual, and directly tied to the supplied evidence.
        25. For "partial", explain both:
        - what the candidate evidence supports
        - what part of the requirement remains unsupported
        26. For "unsupported", clearly state that no candidate evidence supports the requirement.
        27. Do not speculate or make recommendations in the reasoning field.

        CONFIDENCE:
        28. Confidence must be between 0 and 1.
        29. Use 0.90–1.00 when the classification is clearly supported.
        30. Use 0.70–0.89 when classification depends on partial semantic overlap.
        31. Use below 0.70 only when the requirement is genuinely ambiguous.
        32. Evaluate EVERY requirement exactly once.

        Return valid JSON only.
        Return exactly this shape:

        {
            "matches": [
                {
                "requirementId": "req-1",
                "requirement": "original requirement",
                "status": "strong",
                "evidence": [
                    "exact candidate evidence string"
                ],
                "reasoning": "short factual explanation",
                "confidence": 0.9
                }
            ]
        }

        FINAL CHECK BEFORE RETURNING:

        For every match verify:
        - Is every evidence string copied EXACTLY from candidate evidence?
        - Did I avoid inventing experience?
        - Does "strong" actually cover the full requirement?
        - If only part is covered, did I use "partial"?
        - If nothing supports it, did I use "unsupported"?
        - Did I avoid treating similar technologies as equivalent?
        - Did I avoid inferring deployment, production use, seniority, or years of experience?

        JOB REQUIREMENTS:
        ${JSON.stringify(requirements, null, 2)}

        CANDIDATE EVIDENCE:
        ${JSON.stringify(evidencePool, null, 2)}
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
        throw new Error("Gemini returned no evidence reasoning");
    }

    const parsed = JSON.parse(response.text) as {
        matches: EvidenceMatch[];
    };

    if (!Array.isArray(parsed.matches)) {
        throw new Error("Gemini evidence reasoning response is missing matches");
    }

    return parsed.matches;
}