"use client";

import { useAuth } from '@/lib/auth-context';
import { Center, Loader, Text, Container, Stack } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { LoginPanel } from './LoginPanel';
import { ReactNode } from 'react';

interface AuthGuardProps {
    children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const { session, isLoading } = useAuth();
    const t = useTranslations('Publications');

    if (isLoading) {
        return (
            <Center h="50vh">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text size="sm" c="dimmed">{t('loading')}</Text>
                </Stack>
            </Center>
        );
    }

    if (!session) {
        return (
            <Container size="sm" py={80}>
                <Stack align="center" gap="xl">
                    <LoginPanel />
                </Stack>
            </Container>
        );
    }

    return <>{children}</>;
}
