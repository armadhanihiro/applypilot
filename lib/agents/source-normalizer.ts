import type { JobSourceResult } from "@/lib/agents/job-source";
import type { ExtractedJob } from "@/lib/agents/reader";

import type { JobRequirement, RequirementImportance } from "@/types/application";

interface AgenticStructuredData {
    employer?: string;
    employment_type?: string;
    job_id?: string;
    job_title?: string;
    location?: string;
    qualifications?: string[];
    requirements?: string[];
    responsibilities?: string[];
    source_url?: string;
    technologies?: string[];
}

interface AgenticSearchPayload {
    structured_data?: AgenticStructuredData;
    summary?: string;
}

function toRequirement(requirement: string, index: number, importance: RequirementImportance = "required"): JobRequirement {
    return {
        id: `req-${index + 1}`,
        requirement,
        importance,
    };
}

function deduplicateRequirements(values: string[]) {
    return Array.from(
        new Set(values.map((value) => value.trim()).filter(Boolean))
    );
}

export function normalizeJobSource(source: JobSourceResult) {
    if (source.strategy !== "agentic_search") {
        return {
            content: source.content,
            structuredData: null,
        };
    }

    try {
        const parsed = JSON.parse(source.content) as AgenticSearchPayload;

        return {
            content: source.content,
            structuredData: parsed.structured_data ?? null,
        };
    } catch {
        return {
            content: source.content,
            structuredData: null,
        };
    }
}

export function agenticStructuredDataToJob(data: AgenticStructuredData): ExtractedJob {
    const rawRequirements = deduplicateRequirements([...(data.requirements ?? []), ...(data.qualifications ?? [])]);
    const requirements = rawRequirements.map((requirement, index) => toRequirement(requirement,index));
    const hasCoreJobData = Boolean(data.job_title?.trim()) && Boolean(data.employer?.trim()) && requirements.length > 0;

    if (!hasCoreJobData) {
        return {
            isJobPosting: false,
            title: data.job_title ?? "",
            company: data.employer ?? "",
            requirements: [],
            rejectionReason: "Agentic Search did not return enough verified job information.",
        };
    }

    return {
        isJobPosting: true,
        title: data.job_title!.trim(),
        company: data.employer!.trim(),
        requirements,
    };
}