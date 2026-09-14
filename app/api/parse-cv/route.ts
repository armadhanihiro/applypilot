import { NextResponse } from "next/server";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

import { extractCandidateProfile } from "@/lib/agents/cv-reader";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    error: "CV file is required",
                },
                {
                    status: 400,
                }
            );
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json(
                {
                    error: "Only PDF files are supported",
                },
                {
                    status: 400,
                }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                {
                    error: "CV file must be smaller than 8 MB",
                },
                {
                    status: 400,
                }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const parser = new PDFParse({
            data: buffer,
        });

        const parsedPdf = await parser.getText();
        const cvText = parsedPdf.text.trim();

        await parser.destroy();

        if (!cvText) {
            return NextResponse.json(
                {
                    error: "No readable text was found in the PDF",
                },
                {
                    status: 400,
                }
            );
        }

        const candidateProfile = await extractCandidateProfile(cvText);

        return NextResponse.json({
            fileName: file.name,
            candidateProfile,
        });
    } catch (error) {
        console.error("CV parsing failed:", error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to parse CV",
            },
            {
                status: 500,
            }
        );
    }
}