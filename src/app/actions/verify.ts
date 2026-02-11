"use server";

import * as cheerio from 'cheerio';

export interface VerificationResult {
    success: boolean;
    fullyVerified?: boolean;
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
    const addStep = (name: string, status: 'success' | 'failure' | 'pending', message?: string) => {
        steps.push({ name, status, message });
    };

    let title: string | undefined;
    let description: string | undefined;
    let image: string | undefined;
    let rkey: string | undefined;
    let did: string | undefined;
    let collection: string | undefined;
    let fullyVerified = false;

    try {
        // 1. Fetch document page
        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'StandardSiteIntegration/1.0 (bot)' },
            next: { revalidate: 0 },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            addStep('Fetch document page', 'failure', `Failed to fetch page: ${response.status} ${response.statusText}`);
            return { success: false, steps };
        }
        addStep('Fetch document page', 'success', 'Successfully fetched the document page');

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract Metadata for auto-fill as early as possible
        title = $('meta[property="og:title"]').attr('content') || $('title').text();
        description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        image = $('meta[property="og:image"]').attr('content');

        // Resolve relative image URL
        if (image && !/^https?:\/\//i.test(image)) {
            try {
                image = new URL(image, targetUrl).toString();
            } catch { }
        }

        addStep('Extract basic metadata', 'success', 'Extracted title and description from page');

        try {
            // 2. Extract and Parse AT-URI
            const link = $('link[rel="site.standard.document"]').attr('href');
            if (!link || !link.startsWith('at://')) {
                addStep('Extract document AT URI', 'failure', 'Missing or invalid AT-URI link tag');
            } else {
                addStep('Extract document AT URI', 'success', `Found document AT URI: ${link}`);

                const atUriParts = link.replace('at://', '').split('/');
                if (atUriParts.length < 3) {
                    addStep('Parse document AT URI', 'failure', 'AT-URI is malformed');
                } else {
                    did = atUriParts[0];
                    collection = atUriParts[1];
                    rkey = atUriParts[2];
                    addStep('Parse document AT URI', 'success', 'AT URI is well-formed');

                    if (collection !== 'site.standard.document') {
                        addStep('Verify document collection', 'failure', 'Not a site.standard.document');
                    } else {
                        addStep('Verify document collection', 'success', 'AT URI references site.standard.document collection');

                        // 3. Resolve PDS
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
                            addStep('Resolve document PDS', 'failure', 'Could not resolve PDS endpoint');
                        } else {
                            addStep('Resolve document PDS', 'success', `Resolved to PDS: ${pds}`);

                            // 4. Fetch document record
                            const recordRes = await fetch(`${pds}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${collection}&rkey=${rkey}`, {
                                signal: AbortSignal.timeout(5000)
                            });

                            if (!recordRes.ok) {
                                addStep('Fetch document record', 'failure', `Record not found on PDS (${recordRes.status})`);
                            } else {
                                const recordData = await recordRes.json();
                                const document = recordData.value;
                                addStep('Fetch document record', 'success', 'Successfully fetched document record');

                                // 5. Extract Publication and Verify .well-known
                                const pubUri = document.site;
                                if (!pubUri || !pubUri.startsWith('at://')) {
                                    addStep('Parse publication AT URI', 'failure', 'Document record missing publication site link');
                                } else {
                                    addStep('Parse publication AT URI', 'success', `Publication AT-URI: ${pubUri}`);

                                    // Extract domain from targetUrl for .well-known check
                                    const targetUrlObj = new URL(targetUrl);
                                    const wellKnownUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}/.well-known/site.standard.publication`;

                                    try {
                                        const wkRes = await fetch(wellKnownUrl, { signal: AbortSignal.timeout(5000) });
                                        if (!wkRes.ok) {
                                            addStep('Fetch .well-known', 'failure', `Failed to fetch ${wellKnownUrl}`);
                                        } else {
                                            const wkContent = (await wkRes.text()).trim();
                                            addStep('Fetch .well-known', 'success', `Successfully fetched .well-known`);

                                            if (wkContent !== pubUri) {
                                                addStep('Validate .well-known content', 'failure', `.well-known content mismatch: expected ${pubUri}`);
                                            } else {
                                                addStep('Validate .well-known content', 'success', 'Publication AT URI matches .well-known endpoint');
                                                fullyVerified = true;
                                            }
                                        }
                                    } catch (e) {
                                        addStep('Fetch .well-known', 'failure', 'Network error while fetching .well-known');
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (protocolErr: any) {
            addStep('Protocol Verification Status', 'failure', protocolErr.message || 'Error durante el proceso de verificación del protocolo');
        }

        return {
            success: true,
            fullyVerified,
            rkey,
            did,
            collection,
            title: title?.trim(),
            description: description?.trim(),
            image,
            steps
        };
    } catch (err: any) {
        addStep('Verification Error', 'failure', err.message || 'Unknown error');
        return { success: false, steps };
    }
}
