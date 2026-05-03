"use server";

import * as cheerio from 'cheerio';
import { getWellKnownUrl } from '@/lib/verification';
import { resolvePds } from '@/lib/pds';
import { getErrorMessage } from '@/lib/types';

export interface VerificationStep {
    key: string;
    status: 'success' | 'failure' | 'pending';
    params?: Record<string, string>;
}

export interface VerificationResult {
    success: boolean;
    fullyVerified?: boolean;
    rkey?: string;
    did?: string;
    collection?: string;
    title?: string;
    description?: string;
    image?: string;
    steps?: VerificationStep[];
}

interface RecordResponse<T> {
    value: T;
}

interface DocumentRecordValue {
    site?: string;
}

interface PublicationRecordValue {
    url?: string;
}

export async function verifyDocument(targetUrl: string): Promise<VerificationResult> {
    const steps: VerificationStep[] = [];
    const addStep = (key: string, status: 'success' | 'failure' | 'pending', params?: Record<string, string>) => {
        steps.push({ key, status, params });
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
            addStep('fetch_page', 'failure', { detail: `${response.status} ${response.statusText}` });
            return { success: false, steps };
        }
        addStep('fetch_page', 'success');

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

        addStep('extract_metadata', 'success');

        try {
            // 2. Extract and Parse AT-URI
            const link = $('link[rel="site.standard.document"]').attr('href');
            if (!link || !link.startsWith('at://')) {
                addStep('extract_aturi', 'failure');
            } else {
                addStep('extract_aturi', 'success', { uri: link });

                const atUriParts = link.replace('at://', '').split('/');
                if (atUriParts.length < 3) {
                    addStep('parse_aturi', 'failure');
                } else {
                    did = atUriParts[0];
                    collection = atUriParts[1];
                    rkey = atUriParts[2];
                    addStep('parse_aturi', 'success');

                    if (collection !== 'site.standard.document') {
                        addStep('verify_collection', 'failure');
                    } else {
                        addStep('verify_collection', 'success');

                        // 3. Resolve PDS
                        const pds = await resolvePds(did);

                        if (!pds) {
                            addStep('resolve_pds', 'failure');
                        } else {
                            addStep('resolve_pds', 'success', { pds });

                            // 4. Fetch document record
                            const recordRes = await fetch(`${pds}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${collection}&rkey=${rkey}`, {
                                signal: AbortSignal.timeout(5000)
                            });

                            if (!recordRes.ok) {
                                addStep('fetch_record', 'failure', { status: String(recordRes.status) });
                            } else {
                                const recordData = await recordRes.json() as RecordResponse<DocumentRecordValue>;
                                const document = recordData.value;
                                addStep('fetch_record', 'success');

                                // 5. Fetch Publication record to get its base URL
                                const pubUri = document.site;
                                if (!pubUri || !pubUri.startsWith('at://')) {
                                    addStep('parse_pub_aturi', 'failure');
                                } else {
                                    addStep('parse_pub_aturi', 'success', { uri: pubUri });

                                    const pubParts = pubUri.replace('at://', '').split('/');
                                    const pubDid = pubParts[0];
                                    const pubCollection = pubParts[1];
                                    const pubRkey = pubParts[2];

                                    // Resolve PDS for publication (might be different repo)
                                    let pubPds = pds; // Optimistic same PDS
                                    if (pubDid !== did) {
                                        pubPds = await resolvePds(pubDid);
                                    }

                                    if (!pubPds) {
                                        addStep('resolve_pub_pds', 'failure');
                                    } else {
                                        addStep('resolve_pub_pds', 'success', { pds: pubPds });
                                        const pubRecordRes = await fetch(`${pubPds}/xrpc/com.atproto.repo.getRecord?repo=${pubDid}&collection=${pubCollection}&rkey=${pubRkey}`, {
                                            signal: AbortSignal.timeout(5000)
                                        });

                                        if (!pubRecordRes.ok) {
                                            addStep('fetch_pub_record', 'failure');
                                        } else {
                                            const pubRecordData = await pubRecordRes.json() as RecordResponse<PublicationRecordValue>;
                                            const publication = pubRecordData.value;
                                            addStep('fetch_pub_record', 'success');
                                            const siteUrl = publication.url;

                                            if (!siteUrl) {
                                                addStep('validate_pub_url', 'failure');
                                            } else {
                                                addStep('validate_pub_url', 'success', { url: siteUrl });

                                                const wellKnownUrl = getWellKnownUrl(siteUrl);

                                                try {
                                                    const wkRes = await fetch(wellKnownUrl, { signal: AbortSignal.timeout(5000) });
                                                    if (!wkRes.ok) {
                                                        addStep('fetch_wellknown', 'failure');
                                                    } else {
                                                        const wkContent = (await wkRes.text()).trim();
                                                        addStep('fetch_wellknown', 'success');

                                                        if (wkContent !== pubUri) {
                                                            addStep('validate_wellknown', 'failure');
                                                        } else {
                                                            addStep('validate_wellknown', 'success');
                                                            fullyVerified = true;
                                                        }
                                                    }
                                                } catch {
                                                    addStep('fetch_wellknown', 'failure');
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (protocolErr) {
            addStep('fetch_page', 'failure', { detail: getErrorMessage(protocolErr, 'Unknown protocol error') });
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
    } catch (err) {
        addStep('fetch_page', 'failure', { detail: getErrorMessage(err) });
        return { success: false, steps };
    }
}
