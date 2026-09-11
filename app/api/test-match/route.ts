import { NextResponse } from "next/server";
import { matchRequirements } from "@/lib/agents/matcher";
import type { JobRequirement } from "@/types/application";

export async function GET() {
  const requirements: JobRequirement[] = [
    {
      id: "req-1",
      requirement: "Experience with Python",
      importance: "required",
    },
    {
      id: "req-2",
      requirement: "Experience with vector search and embeddings",
      importance: "required",
    },
    {
      id: "req-3",
      requirement: "Experience building REST APIs",
      importance: "required",
    },
    {
      id: "req-4",
      requirement: "5 years of Kubernetes production experience",
      importance: "required",
    },
  ];

  const matches = matchRequirements(requirements);

  return NextResponse.json({
    requirements,
    matches,
  });
}