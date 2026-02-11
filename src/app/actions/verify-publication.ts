"use server";

export interface PublicationVerificationResult {
    verified: boolean;
    expectedUri: string;
    actualUri?: string;
    error?: string;
}

/**
 * Verify that a domain has the correct /.well-known/site.standard.publication file
 * that returns the AT-URI of the publication record.
 */
export async function verifyPublicationOwnership(
    siteUrl: string,
    expectedAtUri: string
): Promise<PublicationVerificationResult> {
    try {
        // Extract the origin (protocol + domain) from the site URL
        const url = new URL(siteUrl);
        const wellKnownUrl = `${url.origin}/.well-known/site.standard.publication`;

        const response = await fetch(wellKnownUrl, {
            headers: { 'User-Agent': 'StandardSiteIntegration/1.0 (bot)' },
            next: { revalidate: 0 },
            signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
            return {
                verified: false,
                expectedUri: expectedAtUri,
                error: `HTTP ${response.status}`,
            };
        }

        const body = await response.text();
        const actualUri = body.trim();

        return {
            verified: actualUri === expectedAtUri,
            expectedUri: expectedAtUri,
            actualUri,
        };
    } catch (err: any) {
        return {
            verified: false,
            expectedUri: expectedAtUri,
            error: err?.message || 'Unknown error',
        };
    }
}
