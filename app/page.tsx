"use client";

import { FormEvent, useState } from "react";

type ClaimStatus =
  | "pending"
  | "verified"
  | "rejected";

interface EvidenceRef {
  requirementId: string;
  requirement: string;
  status:
    | "strong"
    | "partial"
    | "unsupported";
  evidence: string[];
}

interface ApplicationClaim {
  text: string;
  verificationStatus: ClaimStatus;
  evidenceRefs: EvidenceRef[];
  verification: {
    reasoning: string;
    confidence: number;
  };
}

interface SellingPoint {
  title: string;
  description: string;
  claims: ApplicationClaim[];
  evidenceRefs: EvidenceRef[];
}

interface ApplicationGap {
  requirementId: string;
  requirement: string;
  status: "partial" | "unsupported";
  explanation: string;
  doNotClaim: string[];
}

interface AnalyzeResponse {
  success: boolean;
  pipelineVersion: string;
  job: {
    title: string;
    company: string;
    requirementCount: number;
  };

  analysis: {
    fitScore: number;
    metrics: {
      strong: number;
      partial: number;
      unsupported: number;
      total: number;
      groundedEvidenceRate: number;
      unsupportedGeneratedClaims: number;
    };
    
    claimMetrics: {
      total: number;
      verified: number;
      rejected: number;
    };
  };

  applicationPack: {
    fitSummary: {
      headline: string;
      summary: string;
      fitScore: number;
      strongCount: number;
      partialCount: number;
      unsupportedCount: number;
    };

    sellingPoints: SellingPoint[];
    gaps: ApplicationGap[];
  };

  error?: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim()) {
      setError("Enter a job URL first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        "/api/test-application-pack",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url.trim(),
          }),
        }
      );

      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Unable to analyze this job.");
      }

      setResult(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <header className="mb-12">
          <div className="mb-5 inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-400">
            Evidence-first AI job application agent
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            ApplyPilot
          </h1>

          <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">
            Read a live job posting, compare its requirements against
            verified candidate evidence, and
            block unsupported application
            claims before they reach your CV
            or cover letter.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
            <input
              type="url"
              value={url}
              onChange={(event) =>
                setUrl(event.target.value)
              }
              placeholder="Paste a LinkedIn, SEEK, or company job URL..."
              className="min-h-12 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 rounded-xl bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Analyzing..."
                : "Analyze job"}
            </button>
          </form>

          {loading && (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-sm font-medium">
                ApplyPilot is working...
              </p>

              <div className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-4">
                <span>01 · READ</span>
                <span>02 · REASON</span>
                <span>03 · GENERATE</span>
                <span>04 · VERIFY</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
              {error}
            </div>
          )}
        </section>

        {result && (
          <div className="mt-8 space-y-8">
            <section className="grid gap-5 lg:grid-cols-[1.5fr_0.5fr]">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Job analysis
                </p>

                <h2 className="mt-4 text-2xl font-semibold">
                  {result.job.title}
                </h2>

                <p className="mt-1 text-zinc-400">
                  {result.job.company}
                </p>

                <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-300">
                  {result.applicationPack.fitSummary.summary}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Evidence fit
                </p>

                <div className="mt-5 text-6xl font-semibold tracking-tight">
                  {result.analysis.fitScore}
                  <span className="text-2xl text-zinc-500">
                    %
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Evidence-backed alignment
                  against extracted job
                  requirements.
                </p>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Strong"
                value={
                  result.analysis.metrics.strong
                }
                description="Requirements directly supported"
              />

              <MetricCard
                label="Partial"
                value={
                  result.analysis.metrics.partial
                }
                description="Some evidence, but limitations remain"
              />

              <MetricCard
                label="Unsupported"
                value={
                  result.analysis.metrics.unsupported
                }
                description="Claims ApplyPilot will not fabricate"
              />
            </section>

            <section>
              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                    Claim verification
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Evidence trace
                  </h2>
                </div>

                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-400">
                    {
                      result.analysis.claimMetrics.verified
                    }
                    {" "}
                    verified
                  </span>

                  <span className="text-red-400">
                    {
                      result.analysis.claimMetrics.rejected
                    }
                    {" "}
                    blocked
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {result.applicationPack.sellingPoints.map(
                  (point, pointIndex) => (
                    <div
                      key={`${point.title}-${pointIndex}`}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6"
                    >
                      <h3 className="text-lg font-semibold">
                        {point.title}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {point.description}
                      </p>

                      <div className="mt-5 space-y-4">
                        {point.claims.map((claim, claimIndex) => (
                            <ClaimCard
                              key={`${claim.text}-${claimIndex}`}
                              claim={claim}
                            />
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            <section>
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Application risks
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  Gaps ApplyPilot will not
                  hide
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {result.applicationPack.gaps.map(
                  (gap) => (
                    <div
                      key={gap.requirementId}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-medium">
                          {gap.requirement}
                        </h3>

                        <StatusBadge status={gap.status}/>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-zinc-400">
                        {gap.explanation}
                      </p>

                      {gap.doNotClaim.length >
                        0 && (
                          <div className="mt-4 rounded-xl border border-red-950 bg-red-950/20 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                              Do not claim
                            </p>

                            {gap.doNotClaim.map(
                              (item) => (
                                <p key={item} className="mt-2 text-sm text-red-200/80">
                                  {item}
                                </p>
                              )
                            )}
                          </div>
                        )
                      }
                    </div>
                  )
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function MetricCard({label, value, description}: { label: string; value: number; description: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function ClaimCard({ claim }: { claim: ApplicationClaim }) {
  const verified = claim.verificationStatus === "verified";

  return (
    <div
      className={`rounded-xl border p-4 ${
        verified ? "border-emerald-900/70 bg-emerald-950/20" : "border-red-900/70 bg-red-950/20"
      }`}
    >
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <p className="max-w-3xl text-sm font-medium leading-6">
          {claim.text}
        </p>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            verified ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {verified
            ? "VERIFIED"
            : "BLOCKED"}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500">
        {claim.verification.reasoning}
      </p>

      <div className="mt-4 space-y-2">
        {claim.evidenceRefs.flatMap(
          (ref) =>
            ref.evidence.map(
              (evidence) => (
                <div
                  key={`${ref.requirementId}-${evidence}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400"
                >
                  <span className="mr-2 text-zinc-600">
                    Evidence
                  </span>

                  {evidence}
                </div>
              )
            )
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "strong" | "partial" | "unsupported" }) {
  const styles = {
    strong: "bg-emerald-500/10 text-emerald-400",
    partial: "bg-amber-500/10 text-amber-400",
    unsupported: "bg-red-500/10 text-red-400",
  };

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}