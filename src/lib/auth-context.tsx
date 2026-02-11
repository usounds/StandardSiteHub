"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
    configureOAuth,
    createAuthorizationUrl,
    getSession,
    listStoredSessions,
    deleteStoredSession,
    OAuthUserAgent,
    type Session
} from '@atcute/oauth-browser-client';
import { Client } from '@atcute/client';
import { identityResolver } from './resolvers';

interface AuthContextType {
    session: Session | undefined;
    agent: Client<any, any> | undefined;
    handle: string | undefined;
    isLoading: boolean;
    login: (handle: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [agent, setAgent] = useState<Client<any, any> | undefined>(undefined);
    const [handle, setHandle] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        const fetchHandle = async () => {
            if (session) {
                try {
                    const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${session.info.sub}`);
                    if (response.ok) {
                        const data = await response.json();
                        setHandle(data.handle);
                    }
                } catch (err) {
                    console.error('Failed to fetch handle', err);
                }
            } else {
                setHandle(undefined);
            }
        };

        fetchHandle();
    }, [session]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const origin = window.location.origin;
        configureOAuth({
            metadata: {
                client_id: `${origin}/client-metadata.json`,
                redirect_uri: `${origin}/oauth/callback`,
            },
            identityResolver: identityResolver,
        });
        setIsConfigured(true);
    }, []);

    const restoreSession = useCallback(async () => {
        try {
            const stored = listStoredSessions();
            let did = localStorage.getItem('last_active_did');

            if (!did && stored.length > 0) {
                did = stored[0];
            }

            if (did && stored.includes(did as any)) {
                const sess = await getSession(did as any);
                setSession(sess);

                const newAgent = new Client<any, any>({
                    handler: new OAuthUserAgent(sess),
                });
                setAgent(newAgent);
            }
        } catch (err) {
            console.error('Failed to restore session', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isConfigured) {
            restoreSession();
        }
    }, [isConfigured, restoreSession]);

    const login = async (handle: string) => {
        const url = await createAuthorizationUrl({
            target: { type: 'account', identifier: handle as any },
            scope: 'atproto include:site.standard.authFull blob:*/*',
        });

        window.location.href = url.toString();
    };

    const logout = async () => {
        if (session) {
            try {
                deleteStoredSession(session.info.sub);
                localStorage.removeItem('last_active_did');
            } catch (err) {
                console.error(err);
            }
        }
        setSession(undefined);
        setAgent(undefined);
    };

    return (
        <AuthContext.Provider value={{ session, agent, handle, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
