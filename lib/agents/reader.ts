import { getGemini, withGeminiRetry } from "@/lib/ai/gemini";
import type { JobRequirement } from "@/types/application";

export interface ExtractedJob {
    isJobPosting: boolean;
    title: string;
    company: string;
    requirements: JobRequirement[];
    rejectionReason?: string;
}

export async function extractJobFromMarkdown(markdown: string): Promise<ExtractedJob> {
    const prompt = `
        You are the job-reading agent for ApplyPilot.

        First determine whether the supplied webpage is actually a job posting.

        RULES:
        - Use ONLY information present in the scraped webpage.
        - Never infer missing skills, requirements, job title, or employer.
        - A valid job posting should contain clear hiring information such as:
        job title, responsibilities, qualifications, requirements, or application details.
        - A generic company homepage, marketing page, error page, or redirect is NOT a valid job posting.

        Return valid JSON only.

        If it IS a job posting:

        {
        "isJobPosting": true,
        "title": "string",
        "company": "string",
        "requirements": [
            {
            "id": "req-1",
            "requirement": "string",
            "importance": "required"
            }
        ]
        }

        If it is NOT a job posting:

        {
        "isJobPosting": false,
        "title": "",
        "company": "",
        "requirements": [],
        "rejectionReason": "Short explanation"
        }

        WEBPAGE:

        ${markdown}
    `;

    const response = await withGeminiRetry(() =>
        getGemini().models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
            config: {
                temperature: 0.1,
                responseMimeType: "application/json",
            },
        })
    );

    if (!response.text) {
        throw new Error("Gemini returned an empty response");
    }

    return JSON.parse(response.text) as ExtractedJob;
}