import { describe, expect, it } from "vitest";

import { agenticStructuredDataToJob, normalizeJobSource } from "@/lib/agents/source-normalizer";

describe("source normalizer", () => {
    it("keeps direct scrape content without structured data", () => {
        const source = {
            content: "# Software Engineer\nJob description...",
            strategy: "direct_scrape" as const,
            anakinJobId: "test-job",
        };

        const result = normalizeJobSource(source);
        expect(result.content).toBe(source.content);
        expect(result.structuredData).toBeNull();
    });

    it("extracts Agentic Search structured data", () => {
        const source = {
            strategy: "agentic_search" as const,
            content: JSON.stringify({
                structured_data: {
                employer: "Life Insurance Partners Pty Ltd",
                employment_type: "Full time",
                job_id: "94352688",
                job_title: "Software Developer",
                location: "Surry Hills, Sydney NSW",
                qualifications: [
                    "Bachelor's degree in Computer Science or related field.",
                    "3+ years of software development experience.",
                ],
                requirements: [
                    "Proficiency in Python and React.",
                    "Experience with AWS services.",
                    "Strong problem-solving skills.",
                ],
                responsibilities: [
                    "Develop and maintain software applications.",
                ],
                source_url:
                    "https://www.seek.com.au/job/94352688",
                technologies: [
                    "Python",
                    "React",
                    "AWS",
                ],
                },
            }),
        };

        const result = normalizeJobSource(source);
        expect(result.structuredData).not.toBeNull();
        expect(result.structuredData?.job_id).toBe("94352688");
    });

    it("converts Agentic structured data into an extracted job", () => {
        const job = agenticStructuredDataToJob({
            employer: "Life Insurance Partners Pty Ltd",
            job_id: "94352688",
            job_title: "Software Developer",
            requirements: [
                "Proficiency in Python and React.",
                "Experience with AWS services.",
                "Strong problem-solving skills.",
            ],
            qualifications: [
                "Bachelor's degree in Computer Science or related field.",
                "3+ years of software development experience.",
            ],
        });

        expect(job.isJobPosting).toBe(true);
        expect(job.title).toBe("Software Developer");
        expect(job.company).toBe("Life Insurance Partners Pty Ltd");
        expect(job.requirements).toHaveLength(5);
        expect(job.requirements[0].requirement).toBe("Proficiency in Python and React.");
    });

    it("rejects incomplete Agentic job data", () => {
        const job = agenticStructuredDataToJob({ job_title: "Software Developer" });
        expect(job.isJobPosting).toBe(false);
        expect(job.requirements).toHaveLength(0);
    });
});