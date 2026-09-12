import { verifyClaims } from "@/lib/agents/claim-verifier";
import type { ApplicationPackCore } from "@/lib/agents/application-pack-generator";

import type { ClaimVerificationInput, ClaimVerificationResult } from "@/types/claim-verification";
import type { VerifiedApplicationClaim } from "@/types/application-pack";

function buildClaimId(sellingPointIndex: number, claimIndex: number) {
    return `selling-${sellingPointIndex}-claim-${claimIndex}`;
}

function getClaimEvidence(evidenceRefs: ApplicationPackCore["sellingPoints"][number]["claims"][number]["evidenceRefs"]) {
    return Array.from(new Set(evidenceRefs.flatMap((ref) => ref.evidence)));
}

export function buildApplicationPackClaimInputs(applicationPack: ApplicationPackCore): ClaimVerificationInput[] {
    return applicationPack.sellingPoints.flatMap((sellingPoint, sellingPointIndex) =>
        sellingPoint.claims.map((claim, claimIndex) => ({
            id: buildClaimId(sellingPointIndex, claimIndex),
            claim: claim.text,
            evidence: getClaimEvidence(claim.evidenceRefs),
        }))
    );
}

export function applyApplicationPackClaimVerification(applicationPack: ApplicationPackCore, verificationResults: ClaimVerificationResult[]): ApplicationPackCore {
    const resultMap = new Map(verificationResults.map((result) => [result.id, result]));

    const sellingPoints = applicationPack.sellingPoints.map((sellingPoint, sellingPointIndex) => ({
        ...sellingPoint,

        claims: sellingPoint.claims.map((claim, claimIndex) => {
            const id = buildClaimId(sellingPointIndex, claimIndex);
            const verification = resultMap.get(id);

            // Fail closed.
            if (!verification) {
                return {
                    ...claim,
                    verificationStatus: "rejected" as const,
                    verification: {
                        reasoning: "No semantic verification result was returned.",
                        confidence: 1,
                    },
                };
            }

            return {
                ...claim,
                verificationStatus: verification.status,
                verification: {
                    reasoning: verification.reasoning,
                    confidence: verification.confidence,
                },
            };
        }),
    }));

    return {
        ...applicationPack,
        sellingPoints,
    };
}

export async function verifyApplicationPackClaims(applicationPack: ApplicationPackCore): Promise<ApplicationPackCore> {
    const claims = buildApplicationPackClaimInputs(applicationPack);
    const verification = await verifyClaims(claims);

    return applyApplicationPackClaimVerification(applicationPack, verification.results);
}

export function getVerifiedApplicationClaims(applicationPack: ApplicationPackCore): VerifiedApplicationClaim[] {
    return applicationPack.sellingPoints.flatMap((sellingPoint) =>
        sellingPoint.claims
    ).filter((claim): claim is VerifiedApplicationClaim => claim.verificationStatus === "verified");
}