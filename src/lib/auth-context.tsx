"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
    createAuthorizationUrl,
    getSession,
    listStoredSessions,
    deleteStoredSession,
    OAuthUserAgent,
    type Session
} from '@atcute/oauth-browser-client';
import { Client } from '@atcute/client';
import type { ActorIdentifier } from '@atcute/lexicons';
import type { AtpClient, Did } from './types';
import { configureAtprotoOAuth } from './oauth';

interface AuthContextType {
    session: Session | undefined;
    agent: AtpClient | undefined;
    handle: string | undefined;
    isLoading: boolean;
    login: (handle: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_RESTORE_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);

        promise
            .then(resolve, reject)
            .finally(() => window.clearTimeout(timeout));
    });
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | undefined>(undefined);
    const [agent, setAgent] = useState<AtpClient | undefined>(undefined);
    const [handle, setHandle] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            configureAtprotoOAuth();
        } catch (err) {
            console.error('Failed to configure OAuth', err);
        } finally {
            queueMicrotask(() => setIsConfigured(true));
        }
    }, []);

    const fetchHandle = useCallback(async (did: string) => {
        try {
            const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${did}`);
            if (response.ok) {
                const data = await response.json() as { handle?: string };
                setHandle(data.handle);
            }
        } catch (err) {
            console.error('Failed to fetch handle', err);
        }
    }, []);

    const restoreSession = useCallback(async () => {
        try {
            const stored = listStoredSessions();
            let did = localStorage.getItem('last_active_did');

            if (!did && stored.length > 0) {
                did = stored[0];
            }

            if (did && stored.includes(did as Did)) {
                const sess = await withTimeout(
                    getSession(did as Did),
                    SESSION_RESTORE_TIMEOUT_MS,
                    'Timed out while restoring OAuth session.',
                );
                setSession(sess);

                const newAgent = new Client({
                    handler: new OAuthUserAgent(sess),
                }) as unknown as AtpClient;
                setAgent(newAgent);

                // Fetch handle before finishing loading
                await withTimeout(
                    fetchHandle(sess.info.sub),
                    SESSION_RESTORE_TIMEOUT_MS,
                    'Timed out while fetching profile handle.',
                );
            }
        } catch (err) {
            console.error('Failed to restore session', err);
        } finally {
            setIsLoading(false);
        }
    }, [fetchHandle]);

    useEffect(() => {
        if (isConfigured) {
            queueMicrotask(() => void restoreSession());
        }
    }, [isConfigured, restoreSession]);

    const login = async (handle: string) => {
        configureAtprotoOAuth();

        const url = await createAuthorizationUrl({
            target: { type: 'account', identifier: handle as ActorIdentifier },
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
