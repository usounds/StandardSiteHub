import { AtPassport } from '@atpassport/client/core';

export type AtPassportLocale = 'en' | 'ja' | 'pt' | 'de' | 'fr' | 'es';

export const ATPASSPORT_STATE_STORAGE_KEY = 'atpassport_state';
export const ATPASSPORT_STATE_COOKIE_KEY = 'atpassport_state';
export const POST_OAUTH_RETURN_TO_STORAGE_KEY = 'post_oauth_return_to';

export function getAtPassportLocale(locale: string): AtPassportLocale {
    if (['en', 'ja', 'pt', 'de', 'fr', 'es'].includes(locale)) {
        return locale as AtPassportLocale;
    }

    return 'en';
}

export function createAtPassportClient(origin: string, locale: string) {
    return new AtPassport({
        callbackUrl: `${origin}/${locale}/atpassport/callback`,
        baseUrl: process.env.NEXT_PUBLIC_ATPASSPORT_URL,
        lang: getAtPassportLocale(locale),
    });
}

export function getCurrentReturnTo() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function setAtPassportState(state: string) {
    sessionStorage.setItem(ATPASSPORT_STATE_STORAGE_KEY, state);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ATPASSPORT_STATE_COOKIE_KEY}=${encodeURIComponent(state)}; path=/; max-age=600; SameSite=Lax${secure}`;
}

export function getAtPassportState() {
    const stored = sessionStorage.getItem(ATPASSPORT_STATE_STORAGE_KEY);
    if (stored) return stored;

    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${ATPASSPORT_STATE_COOKIE_KEY}=`));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : null;
}

export function clearAtPassportState() {
    sessionStorage.removeItem(ATPASSPORT_STATE_STORAGE_KEY);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${ATPASSPORT_STATE_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax${secure}`;
}

export function normalizeReturnTo(value: string | undefined, fallback: string) {
    if (!value || value.startsWith('//')) {
        return fallback;
    }

    try {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin) {
            return fallback;
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return fallback;
    }
}
