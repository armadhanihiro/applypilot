import { NextRequest, NextResponse } from "next/server";

import { getJobSource } from "@/lib/agents/job-source";

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

        return NextResponse.json({
            success: true,
            source: {
                url,
                strategy: source.strategy,
                anakinJobId: source.anakinJobId,
                fallbackSources: source.sources ?? [],
            },
            preview: source.content.slice(0, 3000),
            contentLength: source.content.length,
        });
    } catch (error) {
        console.error("ApplyPilot source test error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}