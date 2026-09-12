import type { MatchStatus } from "@/types/application";

export interface ApplicationPackEvidenceRef {
    requirementId: string;
    requirement: string;
    status: MatchStatus;
    evidence: string[];
}

export interface FitSummary {
    headline: string;
    summary: string;
    fitScore: number;
    strongCount: number;
    partialCount: number;
    unsupportedCount: number;
}

export interface SellingPoint {
    title: string;
    description: string;
    evidenceRefs: ApplicationPackEvidenceRef[];
}

export interface ApplicationGap {
    requirementId: string;
    requirement: string;
    status: "partial" | "unsupported";
    explanation: string;
    doNotClaim: string[];
}

export interface ResumeSuggestion {
    section:
        | "summary"
        | "skills"
        | "experience"
        | "projects";

    action:
        | "add"
        | "rewrite"
        | "emphasize"
        | "remove";

    currentEvidence: string[];
    suggestion: string;
    evidenceRefs: ApplicationPackEvidenceRef[];
}

export interface CoverLetterClaim {
    text: string;
    evidenceRefs: ApplicationPackEvidenceRef[];
}

export interface CoverLetterDraft {
    opening: string;
    bodyParagraphs: Array<{
        text: string;
        claims: CoverLetterClaim[];
    }>;
    closing: string;
}

export interface ScreeningAnswerDraft {
    question: string;
    answer: string;
    evidenceRefs: ApplicationPackEvidenceRef[];
}

export interface InterviewTalkingPoint {
    topic: string;
    talkingPoint: string;
    evidenceRefs: ApplicationPackEvidenceRef[];
}

export interface ApplicationPack {
    fitSummary: FitSummary;
    sellingPoints: SellingPoint[];
    gaps: ApplicationGap[];
    resumeSuggestions: ResumeSuggestion[];
    coverLetter: CoverLetterDraft;
    screeningAnswers: ScreeningAnswerDraft[];
    interviewTalkingPoints: InterviewTalkingPoint[];
    metadata: {
        generatedAt: string;
        jobTitle: string;
        company: string;
        fitScore: number;
        groundedClaimsOnly: true;
    };
}