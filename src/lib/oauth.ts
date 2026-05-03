"use client";

import { configureOAuth } from '@atcute/oauth-browser-client';
import { identityResolver } from '@/lib/resolvers';

let configuredOrigin: string | undefined;

export function configureAtprotoOAuth(origin = window.location.origin) {
    if (configuredOrigin === origin) return;

    configureOAuth({
        metadata: {
            client_id: `${origin}/client-metadata.json`,
            redirect_uri: `${origin}/oauth/callback`,
        },
        identityResolver,
    });

    configuredOrigin = origin;
}
