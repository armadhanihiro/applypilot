import { NextRequest, NextResponse } from "next/server";

import { getJobSource } from "@/lib/agents/job-source";
import { extractJobFromMarkdown } from "@/lib/agents/reader";
import { reasonAboutRequirements } from "@/lib/agents/evidence-reasoner";
import { verifyEvidenceMatches } from "@/lib/agents/verifier";
import { scoreMatches } from "@/lib/agents/scoring";
import { normalizeJobSource, agenticStructuredDataToJob } from "@/lib/agents/source-normalizer";
import { buildApplicationPackContext } from "@/lib/agents/application-pack";
import { generateApplicationPackCore } from "@/lib/agents/application-pack-generator";
import { verifyApplicationPackClaims } from "@/lib/agents/application-pack-claim-verifier";
import { generateApplicationMaterials } from "@/lib/agents/application-materials-generator";

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

        // READ
        const source = await getJobSource(url);

        // NORMALIZE / EXTRACT
        const normalizedSource = normalizeJobSource(source);

        const job = normalizedSource.structuredData ? agenticStructuredDataToJob(normalizedSource.structuredData)
                    : await extractJobFromMarkdown(normalizedSource.content);

        if (!job.isJobPosting) {
            return NextResponse.json(
                {
                    success: false,
                    sourceStatus: "invalid_job_page",
                    reason: job.rejectionReason ?? "The source is not a valid job posting.",
                },
                { status: 422 }
            );
        }

        // EVIDENCE REASONING
        const reasonedMatches = await reasonAboutRequirements(job.requirements);

        // HARD VERIFICATION
        const matches = verifyEvidenceMatches(reasonedMatches);

        // SCORE
        const scoring = scoreMatches(matches);

        // BUILD GROUNDED CONTEXT
        const context = buildApplicationPackContext({
            title: job.title,
            company: job.company,
            requirements: job.requirements,
            matches,
        });

        // GENERATE APPLICATION STRATEGY
        const applicationPackCore = await generateApplicationPackCore(context, scoring.fitScore);

        // SEMANTIC CLAIM VERIFICATION
        const applicationPack = await verifyApplicationPackClaims(applicationPackCore);

        // ACT: GENERATE GROUNDED APPLICATION MATERIALS
        const applicationMaterials = await generateApplicationMaterials(
            applicationPack,
            {
                title: job.title,
                company: job.company,
            }
        );

        const claimMetrics = applicationPack.sellingPoints.flatMap((point) => point.claims).reduce(
            (acc, claim) => {
                acc.total += 1;
                
                if (claim.verificationStatus === "verified") {
                    acc.verified += 1;
                }

                if (claim.verificationStatus === "rejected") {
                    acc.rejected += 1;
                }

                return acc;
            },
            {
                total: 0,
                verified: 0,
                rejected: 0,
            }
        );

        return NextResponse.json({
            success: true,
            pipelineVersion: "application-pack-v2-semantic-verification",
            source: {
                url,
                sourceStrategy: source.strategy,
                anakinJobId: source.anakinJobId,
                fallbackSources: source.sources ?? [],
            },
            job: {
                title: job.title,
                company: job.company,
                requirementCount: job.requirements.length,
            },
            analysis: {
                fitScore: scoring.fitScore,
                metrics: scoring.metrics,
                claimMetrics,
            },
            applicationPack,
            applicationMaterials,
        });
    } catch (error) {
        console.error("[ApplyPilot] Application Pack error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}