"use client";

import { useEffect, useRef, useState } from 'react';
import { Center, Container, Stack, Text, Button } from '@mantine/core';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { AuthLoading } from '@/components/auth/AuthLoading';
import { useAuth } from '@/lib/auth-context';
import {
    ATPASSPORT_STATE_STORAGE_KEY,
    POST_OAUTH_RETURN_TO_STORAGE_KEY,
    createAtPassportClient,
    normalizeReturnTo,
} from '@/lib/atpassport';
import { getErrorMessage } from '@/lib/types';

export default function AtPassportCallbackPage() {
    const locale = useLocale();
    const router = useRouter();
    const { login } = useAuth();
    const t = useTranslations('Index');
    const processed = useRef(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        async function handleCallback() {
            try {
                const expectedState = sessionStorage.getItem(ATPASSPORT_STATE_STORAGE_KEY);
                if (!expectedState) {
                    throw new Error('Missing stored AtPassport state.');
                }

                const atp = createAtPassportClient(window.location.origin, locale);
                const parsed = atp.parseCallback(window.location.href, expectedState);
                sessionStorage.removeItem(ATPASSPORT_STATE_STORAGE_KEY);

                if (!parsed.handle) {
                    throw new Error('AtPassport callback did not include a handle.');
                }

                const returnTo = normalizeReturnTo(parsed.customParams.returnTo, `/${locale}`);
                sessionStorage.setItem(POST_OAUTH_RETURN_TO_STORAGE_KEY, returnTo);

                await login(parsed.handle);
            } catch (err) {
                console.error('AtPassport callback error:', err);
                sessionStorage.removeItem(ATPASSPORT_STATE_STORAGE_KEY);
                setErrorMessage(getErrorMessage(err, t('login_error_message')));
            }
        }

        handleCallback();
    }, [locale, login, t]);

    if (errorMessage) {
        return (
            <Container size="md" h="100vh">
                <Center h="100%">
                    <Stack align="center" gap="md" style={{ maxWidth: 600 }}>
                        <Text c="red" fw={700} size="xl">{t('login_error_title')}</Text>
                        <Text c="dimmed" ta="center">{errorMessage}</Text>
                        <Button onClick={() => router.replace('/')} variant="light" color="gray">
                            {t('back_home')}
                        </Button>
                    </Stack>
                </Center>
            </Container>
        );
    }

    return <AuthLoading message={t('authenticating')} />;
}
