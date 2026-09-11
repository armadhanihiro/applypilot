import { NextRequest, NextResponse } from "next/server";

import { getJobSource } from "@/lib/agents/job-source";
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

        const source = await getJobSource(url);
        const normalized = normalizeJobSource(source);
        const job = normalized.structuredData ? agenticStructuredDataToJob(normalized.structuredData) : null;

        return NextResponse.json({
            success: true,
            source: {
                url,
                strategy:
                source.strategy,
            },
            hasStructuredData: Boolean(normalized.structuredData),
            job,
        });
    } catch (error) {
        console.error("ApplyPilot normalizer test error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}