import { NextRequest, NextResponse } from "next/server";
import { getUrlScrapeJob, submitUrlScrape } from "@/lib/anakin/client";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get("url");

        if (!url) {
            return NextResponse.json(
                { error: "Missing ?url=" },
                { status: 400 }
            );
        }

        // 1. Submit scrape job
        const submitted = await submitUrlScrape(url);
        console.log("Anakin submitted:", submitted);
        const jobId = submitted.jobId;

        if (!jobId) {
            return NextResponse.json(
                {
                    error: "Anakin did not return a jobId",
                    submitted,
                },
                { status: 500 }
            );
        }

        // 2. Poll until Anakin finishes
        for (let attempt = 0; attempt < 30; attempt++) {
            const job = await getUrlScrapeJob(jobId);

            console.log(`Anakin attempt ${attempt + 1}:`, job.status);

            if (job.status === "completed") {
                return NextResponse.json({
                    success: true,
                    jobId,
                    result: job,
                });
            }

            if (job.status === "failed") {
                return NextResponse.json(
                    {
                        success: false,
                        jobId,
                        result: job,
                    },
                    { status: 502 }
                );
            }

            await sleep(1000);
        }

        return NextResponse.json(
            {
                error: "Timed out waiting for Anakin",
                jobId,
            },
            { status: 504 }
        );
    } catch (error) {
        console.error("Anakin test error:", error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}