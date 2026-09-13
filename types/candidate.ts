export interface CandidateProfile {
    name: string;
    education: Array<{
        degree: string;
        institution: string;
        achievement?: string;
    }>;
    experience: Array<{
        organization: string;
        role: string;
        evidence: string[];
    }>;
    projects: Array<{
        name: string;
        evidence: string[];
    }>;
    skills: string[];
}