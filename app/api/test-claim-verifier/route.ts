import { NextRequest, NextResponse } from "next/server";

import { verifyClaims } from "@/lib/agents/claim-verifier";

import type { ClaimVerificationInput } from "@/types/claim-verification";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const claims = body.claims as ClaimVerificationInput[];

        if (!Array.isArray(claims)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "claims must be an array",
                },
                { status: 400 }
            );
        }

        const result = await verifyClaims(claims);

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error) {
        console.error("[ApplyPilot] Claim verifier test error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}