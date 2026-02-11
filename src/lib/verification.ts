export function getWellKnownUrl(siteUrl: string): string {
    try {
        const url = new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`);
        const origin = url.origin;
        // Remove leading and trailing slashes from path
        const path = url.pathname.replace(/^\/|\/$/g, '');

        if (!path) {
            return `${origin}/.well-known/site.standard.publication`;
        }

        return `${origin}/.well-known/site.standard.publication/${path}`;
    } catch (err) {
        console.error('Invalid URL for well-known construction:', siteUrl);
        return siteUrl; // Fallback
    }
}

export async function verifySite(url: string, expectedAtUri: string): Promise<boolean> {
    try {
        const wellKnownUrl = getWellKnownUrl(url);

        const res = await fetch(wellKnownUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/plain',
            },
            // fast timeout to avoid blocking UI for too long
            signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) {
            return false;
        }

        const text = await res.text();
        return text.trim() === expectedAtUri;
    } catch (err) {
        console.error('Site verification failed:', err);
        return false;
    }
}
