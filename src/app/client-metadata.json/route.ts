export async function GET() {
    return Response.json({
        client_id: process.env.NEXT_PUBLIC_URL
            ? `${process.env.NEXT_PUBLIC_URL}/client-metadata.json`
            : 'http://localhost:3000/client-metadata.json',
        client_name: 'Standard Site Integration',
        client_uri: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
        logo_uri: process.env.NEXT_PUBLIC_URL
            ? `${process.env.NEXT_PUBLIC_URL}/logo.png`
            : 'http://localhost:3000/logo.png',
        redirect_uris: [
            process.env.NEXT_PUBLIC_URL
                ? `${process.env.NEXT_PUBLIC_URL}/oauth/callback`
                : 'http://localhost:3000/oauth/callback'
        ],
        scope: 'atproto include:site.standard.authFull blob:*/*',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        application_type: 'web',
        dpop_bound_access_tokens: true
    });
}
