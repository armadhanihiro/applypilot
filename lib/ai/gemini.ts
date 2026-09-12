import { GoogleGenAI } from "@google/genai";

function getGeminiApiKey() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    return apiKey;
}

export const gemini = new GoogleGenAI({ apiKey: getGeminiApiKey() });

function sleep(ms: number) {
    return new Promise((resolve) =>
        setTimeout(resolve, ms)
    );
}

function isRetryableGeminiError(error: unknown) {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    const status = "status" in error ? Number((error as { status?: unknown }).status) : undefined;

    return (status === 408 || status === 429 || (status !== undefined && status >= 500));
}

export async function withGeminiRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const retryable = isRetryableGeminiError(error);

            if (!retryable || attempt === maxAttempts) {
                throw error;
            }

            const baseDelay = 1000 * Math.pow(2, attempt - 1);
            const jitter = Math.floor(Math.random() * 500);
            const delay = baseDelay + jitter;
            console.warn(`[ApplyPilot] Gemini transient error. Retry ${attempt}/${maxAttempts} in ${delay}ms`);

            await sleep(delay);
        }
    }

    throw lastError;
}