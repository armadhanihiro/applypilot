import { candidateProfile } from "@/data/candidate";
import type { EvidenceMatch } from "@/types/application";

function getAllowedEvidence(): Set<string> {
    const evidence = [
        ...candidateProfile.skills,
        ...candidateProfile.experience.flatMap((item) => item.evidence),
        ...candidateProfile.projects.flatMap((item) => item.evidence),
        ...candidateProfile.education.flatMap((item) => [
            item.degree,
            item.institution,
            item.achievement,
        ]),
    ];

    return new Set(evidence);
}

export function verifyEvidenceMatches(matches: EvidenceMatch[]) {
    const allowedEvidence = getAllowedEvidence();

    return matches.map((match) => {
        const verifiedEvidence = match.evidence.filter((evidence) => allowedEvidence.has(evidence));
        const removedEvidence = match.evidence.filter((evidence) => !allowedEvidence.has(evidence));

        let status = match.status;

        // AI claimed support but none of its evidence is actually valid.
        if (status !== "unsupported" && verifiedEvidence.length === 0) {
            status = "unsupported";
        }

        return {
            ...match,
            status,
            evidence: verifiedEvidence,

            verification: {
                verified: removedEvidence.length === 0,
                removedUnsupportedEvidence: removedEvidence,
            },
        };
    });
}