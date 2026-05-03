import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
    // Match only HTML navigations that need locale handling.
    matcher: [
        {
            source: '/',
            missing: [
                { type: 'header', key: 'rsc' },
                { type: 'header', key: 'next-router-state-tree' },
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'next-router-segment-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
        {
            source: '/(ja|en)/:path*',
            missing: [
                { type: 'header', key: 'rsc' },
                { type: 'header', key: 'next-router-state-tree' },
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'next-router-segment-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
    ],
};
