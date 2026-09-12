export type ClaimVerificationStatus =
    | "verified"
    | "rejected";

export interface ClaimVerificationInput {
    id: string;
    claim: string;
    evidence: string[];
}

export interface ClaimVerificationResult {
    id: string;
    claim: string;
    status: ClaimVerificationStatus;
    evidence: string[];
    reasoning: string;
    confidence: number;
}

export interface ClaimVerificationBatch {
    results: ClaimVerificationResult[];

    metrics: {
        total: number;
        verified: number;
        rejected: number;
        verificationRate: number;
    };
}