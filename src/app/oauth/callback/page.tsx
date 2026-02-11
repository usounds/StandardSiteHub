"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { configureOAuth, finalizeAuthorization } from '@atcute/oauth-browser-client';
import { Text, Container, Loader, Center, Stack, Button } from '@mantine/core';
import { identityResolver } from '@/lib/resolvers';

export default function OAuthCallback() {
    const router = useRouter();
    const processed = useRef(false);
    const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        async function handleCallback() {
            try {
                // コールバックページでも configureOAuth を呼ぶ
                // （AuthProviderのuseEffectより先にfinalizeAuthorizationが呼ばれる場合があるため）
                const origin = window.location.origin;
                configureOAuth({
                    metadata: {
                        client_id: `${origin}/client-metadata.json`,
                        redirect_uri: `${origin}/oauth/callback`,
                    },
                    identityResolver: identityResolver,
                });

                // OAuthレスポンスはハッシュフラグメント(#)またはクエリパラメータ(?)で返される
                const hash = window.location.hash.substring(1);
                const search = window.location.search.substring(1);
                const paramString = hash || search;
                const params = new URLSearchParams(paramString);

                // ユーザーが認証を拒否した場合
                const error = params.get('error');
                if (error) {
                    const errorDescription = params.get('error_description') || 'Authentication was cancelled.';
                    console.warn('OAuth error:', error, errorDescription);
                    setErrorState({
                        title: '認証キャンセル',
                        message: `${error}: ${errorDescription}`
                    });
                    return;
                }

                const { session } = await finalizeAuthorization(params);

                // アクティブセッションとして保存
                localStorage.setItem('last_active_did', session.info.sub);

                // ホームにリダイレクト
                router.push('/');
            } catch (err: any) {
                console.error('OAuth Callback Error:', err);
                setErrorState({
                    title: '認証エラー',
                    message: err.message || '認証処理中に予期せぬエラーが発生しました。'
                });
            }
        }

        handleCallback();
    }, [router]);

    if (errorState) {
        return (
            <Container size="md" h="100vh">
                <Center h="100%">
                    <Stack align="center" gap="md" style={{ maxWidth: 600 }}>
                        <Text c="red" fw={700} size="xl">{errorState.title}</Text>
                        <Text c="dimmed">{errorState.message}</Text>
                        <Button onClick={() => router.push('/')} variant="light" color="gray">
                            ホームに戻る
                        </Button>
                    </Stack>
                </Center>
            </Container>
        );
    }

    return (
        <Container size="md" h="100vh">
            <Center h="100%">
                <Stack align="center" gap="md">
                    <Loader size="xl" />
                    <Text>認証処理中...</Text>
                </Stack>
            </Center>
        </Container>
    );
}
