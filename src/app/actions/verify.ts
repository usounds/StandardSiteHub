"use server";

import * as cheerio from 'cheerio';

export interface VerificationResult {
    success: boolean;
    rkey?: string;
    did?: string;
    collection?: string;
    title?: string;
    description?: string;
    image?: string;
    steps?: {
        name: string;
        status: 'success' | 'failure' | 'pending';
        message?: string;
    }[];
}

export async function verifyDocument(targetUrl: string): Promise<VerificationResult> {
    const steps: NonNullable<VerificationResult['steps']> = [];
    const addStep = (name: string, status: 'success' | 'failure', message?: string) => {
        steps.push({ name, status, message });
    };

    try {
        // 1. Fetch document page
        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'StandardSiteIntegration/1.0 (bot)' },
            next: { revalidate: 0 },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) throw new Error('Fetch failed');
        addStep('Fetch document page', 'success', 'Successfully fetched the document page');

        const html = await response.text();
        const $ = cheerio.load(html);

        // 2. Extract and Parse AT-URI
        const link = $('link[rel="site.standard.document"]').attr('href');
        if (!link || !link.startsWith('at://')) {
            throw new Error('Missing or invalid AT-URI link');
        }
        addStep('Extract document AT URI', 'success', `Found document AT URI: ${link}`);

        const atUriParts = link.replace('at://', '').split('/');
        if (atUriParts.length < 3) {
            throw new Error('AT-URI is malformed');
        }
        const did = atUriParts[0];
        const collection = atUriParts[1];
        const rkey = atUriParts[2];
        addStep('Parse document AT URI', 'success', 'AT URI is well-formed');

        if (collection !== 'site.standard.document') {
            throw new Error('Not a site.standard.document');
        }
        addStep('Verify document collection', 'success', 'AT URI references site.standard.document collection');

        // 3. Resolve PDS (Simple PLC/Web resolve)
        let pds: string | undefined;
        try {
            const didRes = await fetch(`https://plc.directory/${did}`, { signal: AbortSignal.timeout(5000) });
            if (didRes.ok) {
                const didDoc = await didRes.json();
                const service = didDoc.service?.find((s: any) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer');
                pds = service?.serviceEndpoint;
            }
        } catch (e) { }

        if (!pds) {
            throw new Error('Could not resolve PDS');
        }
        addStep('Resolve document PDS', 'success', `Resolved to PDS: ${pds}`);

        // 4. Fetch document record
        const recordRes = await fetch(`${pds}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${collection}&rkey=${rkey}`, {
            signal: AbortSignal.timeout(5000)
        });
        if (!recordRes.ok) throw new Error('Failed to fetch document record');
        const recordData = await recordRes.json();
        const document = recordData.value;
        addStep('Fetch document record', 'success', 'Successfully fetched document record');

        // 5. Extract Publication and Verify .well-known
        const pubUri = document.site;
        if (!pubUri || !pubUri.startsWith('at://')) {
            throw new Error('Document record missing publication site link');
        }
        addStep('Parse publication AT URI', 'success', `Publication AT-URI: ${pubUri}`);

        // Extract domain from targetUrl for .well-known check
        const targetUrlObj = new URL(targetUrl);
        const wellKnownUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}/.well-known/site.standard.publication`;

        const wkRes = await fetch(wellKnownUrl, { signal: AbortSignal.timeout(5000) });
        if (!wkRes.ok) throw new Error('Failed to fetch .well-known');
        const wkContent = (await wkRes.text()).trim();
        addStep('Fetch .well-known', 'success', `Successfully fetched ${wellKnownUrl}`);

        if (wkContent !== pubUri) {
            throw new Error(`.well-known content mismatch: expected ${pubUri}, got ${wkContent}`);
        }
        addStep('Validate .well-known content', 'success', 'Publication AT URI matches .well-known endpoint');

        // Final Metadata extraction for auto-fill
        const title = $('meta[property="og:title"]').attr('content') || $('title').text();
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        const image = $('meta[property="og:image"]').attr('content');

        return {
            success: true,
            rkey,
            did,
            collection,
            title,
            description,
            image,
            steps
        };
    } catch (err: any) {
        addStep('Verification Error', 'failure', err.message || 'Unknown error');
        return { success: false, steps };
    }
}
