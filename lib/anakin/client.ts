const ANAKIN_BASE_URL = "https://api.anakin.io/v1";

function getApiKey() {
    const apiKey = process.env.ANAKIN_API_KEY;

    if (!apiKey) {
        throw new Error("ANAKIN_API_KEY is not configured");
    }

    return apiKey;
}

export async function submitUrlScrape(url: string) {
    const useBrowser = url.includes("seek.com") || url.includes("linkedin.com");
    const response = await fetch(
        `${ANAKIN_BASE_URL}/url-scraper`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": getApiKey(),
            },
            body: JSON.stringify({
                url,
                country: "au",
                formats: ["markdown"],
                useBrowser,
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();

        throw new Error(
            `Anakin scrape failed (${response.status}): ${error}`
        );
    }

    return response.json();
}

export async function getUrlScrapeJob(jobId: string) {
    const response = await fetch(
        `${ANAKIN_BASE_URL}/url-scraper/${jobId}`,
        {
            headers: {
                "X-API-Key": getApiKey(),
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anakin job fetch failed (${response.status}): ${error}`);
    }

    return response.json();
}

export async function searchWeb(prompt: string, limit = 5) {
    const response = await fetch(
        `${ANAKIN_BASE_URL}/search`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": getApiKey(),
            },
            body: JSON.stringify({
                prompt,
                limit,
            }),
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anakin search failed (${response.status}): ${error}`);
    }

    return response.json();
}

export async function submitAgenticSearch(prompt: string) {
    const response = await fetch(
        `${ANAKIN_BASE_URL}/agentic-search`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": getApiKey(),
            },
            body: JSON.stringify({
                prompt,
            }),
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anakin agentic search failed (${response.status}): ${error}`);
    }

    return response.json();
}

export async function getAgenticSearchJob(jobId: string) {
    const response = await fetch(
        `${ANAKIN_BASE_URL}/agentic-search/${jobId}`,
        {
            headers: {
                "X-API-Key": getApiKey(),
            },
            cache: "no-store",
        }
    );

    if (!response.ok && response.status !== 202) {
        const error = await response.text();
        throw new Error(`Anakin agentic search fetch failed (${response.status}): ${error}`);
    }

    return response.json();
}