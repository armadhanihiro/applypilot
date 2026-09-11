import {
    getAgenticSearchJob,
    getUrlScrapeJob,
    searchWeb,
    submitAgenticSearch,
    submitUrlScrape,
} from "@/lib/anakin/client";

export interface AnakinSearchResult {
    title?: string;
    url?: string;
    snippet?: string;
    content?: string;
    date?: string;
    last_updated?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type SourceStrategy =
    | "direct_scrape"
    | "search_fallback"
    | "agentic_search";

export interface JobSourceResult {
    content: string;
    strategy: SourceStrategy;
    anakinJobId?: string;
    sources?: {
        title?: string;
        url?: string;
    }[];
}

async function tryDirectScrape(url: string): Promise<JobSourceResult> {
    const submitted = await submitUrlScrape(url);

    if (!submitted.jobId) {
        throw new Error("Anakin did not return a jobId");
    }

    for (let attempt = 0; attempt < 40; attempt++) {
        const job = await getUrlScrapeJob(submitted.jobId);

        if (job.status === "completed") {
            if (!job.markdown) {
                throw new Error("Anakin returned no markdown");
            }

            return {
                content: job.markdown,
                strategy: "direct_scrape",
                anakinJobId: submitted.jobId,
            };
        }

        if (job.status === "failed") {
            throw new Error(job.error ?? "Direct scrape failed");
        }

        await sleep(3000);
    }

    throw new Error("Timed out waiting for direct scrape");
}

export function getSourceName(hostname: string) {
    const cleaned = hostname
        .replace(/^www\./, "")
        .replace(/^au\./, "")
        .replace(/^jobs\./, "")
        .replace(/^careers\./, "")
        .replace(/^boards\./, "");

    const parts = cleaned.split(".");

    if (parts.length >= 2) {
        return parts[parts.length - 2];
    }

    return parts[0];
}

function buildFallbackQueries(url: string) {
    try {
        const parsed = new URL(url);
        const pathParts = parsed.pathname.split("/").filter(Boolean);
        const jobId = pathParts.at(-1) ?? "";
        const hostname = parsed.hostname.replace(/^www\./, "");
        const sourceName = getSourceName(parsed.hostname);
        const queries: string[] = [];

        if (jobId) {
            queries.push(`"${jobId}" "${sourceName}" job`);
            queries.push(`"${jobId}" "${hostname}"`);
            queries.push(`"${jobId}" job`);
        }

        queries.push(`"${url}" job`);

        return Array.from(new Set(queries));
    } catch {
        return [url];
    }
}

export function extractJobId(url: string) {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);

        return parts.at(-1) ?? "";
    } catch {
        return "";
    }
}

export function isRelevantSearchResult(item: AnakinSearchResult, jobId: string, sourceName: string) {
    const searchableText =
        normalizeText(
            [
                item.title,
                item.url,
                item.snippet,
                item.content,
            ].filter(Boolean).join(" ")
        );

    const normalizedJobId = normalizeText(jobId);
    const normalizedSource = normalizeText(sourceName);
    const sourceMatched = normalizedSource.length > 0 && searchableText.includes(normalizedSource);

    /*
    * Examples treated as identifiers:
    *
    * 94352688
    * R0015524
    * JR12345
    *
    * But NOT:
    *
    * software-engineer
    * junior-software-developer
    */
    const isOpaqueJobId = /\d/.test(jobId) && !jobId.includes("-");
    const exactJobIdMatched = isOpaqueJobId && normalizedJobId.length > 0 && searchableText.includes(normalizedJobId);
    const jobTokens = tokenize(jobId);
    const tokenMatches = jobTokens.filter((token) => searchableText.includes(token)).length;
    const slugMatched = jobTokens.length >= 2 && tokenMatches / jobTokens.length >= 0.8;

    return (
        exactJobIdMatched || (sourceMatched && slugMatched)
    );
}

async function fallbackSearch(url: string): Promise<JobSourceResult> {
    const queries = buildFallbackQueries(url);

    for (const query of queries) {
        console.log(`[ApplyPilot] Trying fallback query: ${query}`);
        
        const result = await searchWeb(query, 10);
        console.log("[ApplyPilot] Search fallback raw result:", JSON.stringify(result, null, 2));
        
        const rawResults: AnakinSearchResult[] = Array.isArray(result.results) ? result.results : [];
        const jobId = extractJobId(url);
        const sourceName = getSourceName(new URL(url).hostname);
        const results = rawResults.filter((item) => isRelevantSearchResult(item, jobId, sourceName));

        console.log(`[ApplyPilot] Relevant fallback results: ${results.length}/${rawResults.length}`);

        if (results.length === 0) {
            continue;
        }

        const content = results.map(
            (
                item: {
                    title?: string;
                    url?: string;
                    snippet?: string;
                    content?: string;
                },
                index: number
            ) => `
                SOURCE ${index + 1}
                TITLE: ${item.title ?? ""}
                URL: ${item.url ?? ""}
                CONTENT: ${item.content ?? item.snippet ?? ""}
            `
        ).join("\n\n");

        return {
            content,
            strategy: "search_fallback",
            sources: results.map(
                (item: {
                    title?: string;
                    url?: string;
                }) => ({
                    title: item.title,
                    url: item.url,
                })
            ),
        };
    }

    throw new Error("No fallback search results were found after trying multiple queries");
}

async function fallbackAgenticSearch(url: string): Promise<JobSourceResult> {
    const jobId = extractJobId(url);

    const prompt = `
        Find the exact job posting associated with this URL:

        ${url}

        The job identifier is:
        ${jobId}

        Research the web for the SAME job posting.

        Find reliable evidence for:
        - job title
        - employer
        - responsibilities
        - requirements
        - qualifications
        - technologies
        - location
        - employment type

        IMPORTANT:
        - Do not substitute a different job.
        - Do not return generic SEEK pages.
        - Do not infer missing information.
        - Prefer the employer's official careers page or a reputable mirror.
        - The result must clearly correspond to job ID ${jobId}.
    `;

    console.log("[ApplyPilot] Starting agentic fallback");

    const submitted = await submitAgenticSearch(prompt);
    const agenticJobId = submitted.job_id ?? submitted.id;

    if (!agenticJobId) {
        throw new Error("Anakin Agentic Search did not return a job ID");
    }

    console.log(`[ApplyPilot] Agentic job ID: ${agenticJobId}`);

    for (let attempt = 0; attempt < 30; attempt++) {
        const result = await getAgenticSearchJob(agenticJobId);

        console.log(`[ApplyPilot] Agentic attempt=${attempt + 1} status=${result.status}`);

        if (result.status === "completed") {
            const content = JSON.stringify(result.generatedJson ?? result.result ?? result, null, 2);

            if (!content || content.length < 50) {
                throw new Error("Agentic Search completed but returned no usable content");
            }

            return {
                content,
                strategy: "agentic_search",
                anakinJobId: agenticJobId,
            };
        }

        if (result.status === "failed") {
            throw new Error(result.error ?? "Agentic Search failed");
        }

        await sleep(10000);
    }

    throw new Error("Timed out waiting for Agentic Search");
}

export async function getJobSource(url: string): Promise<JobSourceResult> {
    try {
        return await tryDirectScrape(url);
    } catch (error) {
        console.warn("[ApplyPilot] Direct scrape failed. Activating search fallback.", error instanceof Error ? error.message : error);
    }

    try {
        return await fallbackSearch(url);
    } catch (error) {
        console.warn("[ApplyPilot] Search fallback failed. Activating agentic search.", error instanceof Error ? error.message : error);
    }

    return fallbackAgenticSearch(url);
}

function normalizeText(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
    return normalizeText(value).split(/\s+/).filter((token) => token.length >= 3);
}