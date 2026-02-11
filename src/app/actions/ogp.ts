"use server";

import * as cheerio from 'cheerio';

export interface OGPResult {
    title?: string;
    description?: string;
    image?: string;
    icon?: string;
}

export interface IconData {
    base64: string;
    mimeType: string;
}

const VALID_URL_REGEX = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/.*)?$/i;

function normalizeUrl(url: string): string | null {
    if (!url) return null;
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
        target = `https://${target}`;
    }
    try {
        new URL(target);
        return target;
    } catch {
        return null;
    }
}

export async function fetchOGP(targetUrl: string): Promise<OGPResult> {
    const normalizedUrl = normalizeUrl(targetUrl);
    if (!normalizedUrl) {
        return {};
    }

    try {
        const response = await fetch(normalizedUrl, {
            headers: {
                'User-Agent': 'StandardSiteIntegration/1.0 (bot)',
            },
            next: { revalidate: 3600 }
        });

        if (!response.ok) {
            // Log as warning rather than error for invalid responses
            console.warn(`OGP Fetch failed for ${normalizedUrl}: ${response.status}`);
            return {};
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('meta[property="og:title"]').attr('content') || $('title').text();
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        const image = $('meta[property="og:image"]').attr('content');
        const icon = $('link[rel="apple-touch-icon"]').attr('href')
            || $('link[rel="icon"]').attr('href')
            || $('link[rel="shortcut icon"]').attr('href');

        // Resolve relative URLs
        const resolveUrl = (rel: string | undefined) => {
            if (!rel) return undefined;
            try {
                return new URL(rel, normalizedUrl).toString();
            } catch {
                return undefined;
            }
        };

        return {
            title: title?.trim(),
            description: description?.trim(),
            image: resolveUrl(image),
            icon: resolveUrl(icon),
        };
    } catch (error) {
        // Only log actual system/network errors, not user input errors
        if (error instanceof TypeError && error.message.includes('URL')) {
            return {};
        }
        console.error('OGP Fetch Error:', error);
        return {};
    }
}

/**
 * Fetch an image from a URL and return it as base64 data.
 * This is used to convert OGP icon URLs into data that can be set as a File input.
 */
export async function fetchIconAsBase64(iconUrl: string): Promise<IconData | null> {
    const normalizedUrl = normalizeUrl(iconUrl);
    if (!normalizedUrl) return null;

    try {
        const response = await fetch(normalizedUrl, {
            headers: {
                'User-Agent': 'StandardSiteIntegration/1.0 (bot)',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return null;

        const contentType = response.headers.get('content-type') || 'image/png';
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        return {
            base64,
            mimeType: contentType.split(';')[0].trim(),
        };
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('URL')) {
            return null;
        }
        console.error('Icon Fetch Error:', error);
        return null;
    }
}

