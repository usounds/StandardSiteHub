export async function verifySite(url: string, expectedAtUri: string): Promise<boolean> {
    try {
        // Ensure URL has protocol
        const baseUrl = url.startsWith('http') ? url : `https://${url}`;
        const wellKnownUrl = new URL('/.well-known/site.standard.publication', baseUrl).toString();

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
