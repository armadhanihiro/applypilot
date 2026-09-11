import { NextRequest, NextResponse } from "next/server";

import { getJobSource } from "@/lib/agents/job-source";
import { extractJobFromMarkdown } from "@/lib/agents/reader";
import { reasonAboutRequirements } from "@/lib/agents/evidence-reasoner";
import { verifyEvidenceMatches } from "@/lib/agents/verifier";
import { scoreMatches } from "@/lib/agents/scoring";
import { agenticStructuredDataToJob, normalizeJobSource } from "@/lib/agents/source-normalizer";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const url = body.url;

        if (!url || typeof url !== "string") {
            return NextResponse.json(
                {
                    success: false,
                    error: "A job URL is required",
                },
                { status: 400 }
            );
        }

        // 1. READ
        const source = await getJobSource(url);

        // 2. NORMALIZE
        const normalizedSource = normalizeJobSource(source);

        // 3. EXTRACT
        // Agentic Search already gives structured job data,
        // so, skip the Gemini reader in that path.
        const job = normalizedSource.structuredData ? agenticStructuredDataToJob(normalizedSource.structuredData) : await extractJobFromMarkdown(normalizedSource.content);

        // 4. VALIDATE JOB SOURCE
        if (!job.isJobPosting) {
            return NextResponse.json(
                {
                    success: false,
                    source: {
                        url,
                        anakinJobId:
                        source.anakinJobId,
                        sourceStrategy:
                        source.strategy,
                        fallbackSources:
                        source.sources ?? [],
                    },
                    sourceStatus: "invalid_job_page",
                    reason: job.rejectionReason ?? "The source is not a valid job posting.",
                },
                { status: 422 }
            );
        }

        // 5. REASON AGAINST CANDIDATE EVIDENCE
        const reasonedMatches = await reasonAboutRequirements(job.requirements);

        // 6. HARD VERIFY
        const matches = verifyEvidenceMatches(reasonedMatches);

        // 7. SCORE
        const scoring = scoreMatches(matches);

        console.log(
            "[ApplyPilot] AI evidence reasoning completed",
            {
                sourceStrategy: source.strategy,
                title: job.title,
                company: job.company,
                requirements: job.requirements.length,
            }
        );

        return NextResponse.json({
            success: true,
            pipelineVersion: "ai-reasoner-v2",
            source: {
                url,
                anakinJobId:
                source.anakinJobId,
                sourceStrategy:
                source.strategy,
                fallbackSources:
                source.sources ?? [],
            },
            job,
            matches,
            fitScore: scoring.fitScore,
            metrics: scoring.metrics,
        });
    } catch (error) {
        console.error("ApplyPilot analysis error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}