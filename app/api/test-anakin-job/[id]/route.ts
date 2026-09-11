import { NextResponse } from "next/server";
import { getUrlScrapeJob } from "@/lib/anakin/client";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const job = await getUrlScrapeJob(id);
        return NextResponse.json(job);
    } catch (error) {
        return NextResponse.json(
            {
                error:
                error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}