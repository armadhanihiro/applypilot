import { GoogleGenAI } from "@google/genai";

function getGeminiApiKey() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    return apiKey;
}

let geminiClient: GoogleGenAI | null = null;

export function getGemini() {
    if (!geminiClient) {
        geminiClient = new GoogleGenAI({
            apiKey: getGeminiApiKey(),
        });
    }

    return geminiClient;
}

function sleep(ms: number) {
    return new Promise((resolve) =>
        setTimeout(resolve, ms)
    );
}

function getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null || !("status" in error)) {
        return undefined;
    }

    const status = Number((error as { status?: unknown }).status);

    return Number.isFinite(status) ? status : undefined;
}

export async function withGeminiRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            const status = getErrorStatus(error);
            const retryable = status === 408 || status === 503 || (status !== undefined && status >= 500);

            if (!retryable || attempt === maxAttempts) {
                throw error;
            }

            const delay = 1000 * Math.pow(2, attempt - 1) + Math.floor( Math.random() * 500);
            console.warn(`[ApplyPilot] Gemini transient error. Retry ${attempt}/${maxAttempts} in ${delay}ms`);
            await sleep(delay);
        }
    }

    throw lastError;
}