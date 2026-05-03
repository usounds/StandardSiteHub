import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Add other Next.js config here if needed
    allowedDevOrigins: ['192.168.11.7', 'integdev.usounds.work'],
    serverExternalPackages: [
        '@atcute/client',
        '@atcute/tid',
        '@atcute/lexicons',
        '@atcute/time-ms',
        '@atcute/util-text',
        '@atcute/atproto',
        '@atcute/bluesky',
        '@atcute/identity-resolver'
    ],
    experimental: {
        // reactCompiler: true, // Optional
        serverActions: {
            bodySizeLimit: '5mb',
        },
    },
    
    images: {
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

export default withNextIntl(nextConfig);
