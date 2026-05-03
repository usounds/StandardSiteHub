"use client";

import { useState } from 'react';
import { Stack, Text, Autocomplete, Button, Group, Avatar, Paper, ComboboxItem, Divider, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useDebouncedCallback } from '@mantine/hooks';
import { AtPassportIcon, AtPassportUI } from '@atpassport/client/ui';
import { POST_OAUTH_RETURN_TO_STORAGE_KEY, createAtPassportClient, getCurrentReturnTo, getAtPassportLocale, setAtPassportState } from '@/lib/atpassport';
import { IconAt, IconLogin2 } from '@tabler/icons-react';

interface ActorSuggestion {
    handle: string;
    avatar?: string;
}

interface TypeaheadResponse {
    actors?: ActorSuggestion[];
}

type ActorComboboxItem = ComboboxItem & { avatar?: string };

export function LoginPanel() {
    const t = useTranslations('Index');
    const locale = useLocale();
    const { login } = useAuth();
    const [loginHandle, setLoginHandle] = useState('');
    const [suggestions, setSuggestions] = useState<ActorComboboxItem[]>([]);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isAtPassportLoading, setIsAtPassportLoading] = useState(false);

    const handleLogin = async () => {
        if (!loginHandle) return;
        setIsLoginLoading(true);
        try {
            let returnTo = getCurrentReturnTo();
            if (returnTo === `/${locale}` || returnTo === `/${locale}/`) {
                returnTo = `/${locale}/sites`;
            }
            sessionStorage.setItem(POST_OAUTH_RETURN_TO_STORAGE_KEY, returnTo);
            await login(loginHandle);
        } catch (error) {
            console.error(error);
            notifications.show({
                title: t('login_error_title'),
                message: t('login_error_message'),
                color: 'red',
            });
            setIsLoginLoading(false);
        }
    };

    const handleAtPassportLogin = () => {
        setIsAtPassportLoading(true);
        try {
            let returnTo = getCurrentReturnTo();
            if (returnTo === `/${locale}` || returnTo === `/${locale}/`) {
                returnTo = `/${locale}/sites`;
            }

            const atp = createAtPassportClient(window.location.origin, locale);
            const { url, atpstate } = atp.generateAuthUrl({
                returnTo,
            });

            setAtPassportState(atpstate);
            window.location.href = url;
        } catch (error) {
            console.error(error);
            notifications.show({
                title: t('login_error_title'),
                message: t('login_error_message'),
                color: 'red',
            });
            setIsAtPassportLoading(false);
        }
    };

    const handleInput = useDebouncedCallback(async (val: string) => {
        if (!val) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(val)}&limit=5`);
            if (response.ok) {
                const data = await response.json() as TypeaheadResponse;
                setSuggestions((data.actors ?? []).map((a) => ({
                    value: a.handle,
                    label: a.handle,
                    avatar: a.avatar
                })));
            }
        } catch {
            // console.error("searchActorsTypeahead error", err);
        }
    }, 300);

    return (
        <Paper
            withBorder
            className="app-panel app-login-panel"
            p={{ base: 'lg', sm: 32 }}
            radius="md"
            w="100%"
            maw={390}
            mx="auto"
        >
            <Stack gap="lg">
                <Stack gap="xs" align="center">
                    <ThemeIcon size={46} radius="xl" color="brand" variant="light">
                        <IconLogin2 size={24} />
                    </ThemeIcon>
                    <Text size="xl" fw={850} ta="center" c="var(--mantine-color-text)" lh={1.2}>
                        {t('login_title')}
                    </Text>
                    <Text c="var(--app-text-muted)" size="sm" ta="center" mt={2}>
                        {t('login_message')}
                    </Text>
                </Stack>

                <Button
                    onClick={handleAtPassportLogin}
                    fullWidth
                    size="md"
                    loading={isAtPassportLoading}
                    leftSection={<AtPassportIcon size={22} />}
                >
                    {AtPassportUI[getAtPassportLocale(locale)].title}
                </Button>

                <Divider label={t('login_divider')} labelPosition="center" my={4} />

                <Stack gap="md">
                    <Autocomplete
                        label={t('handle_label')}
                        placeholder={t('handle_placeholder')}
                        value={loginHandle}
                        leftSection={<IconAt size={16} style={{ color: 'var(--app-text-muted)' }} />}
                        data={suggestions}
                        onInput={(event) => handleInput(event.currentTarget.value)}
                        onChange={(value) => {
                            setLoginHandle(value);
                            setSuggestions([]);
                        }}
                        renderOption={({ option }) => {
                            const actor = option as ActorComboboxItem;
                            return (
                                <Group gap="sm">
                                    <Avatar src={actor.avatar} size={24} radius="xl" />
                                    <Text size="sm">{actor.value}</Text>
                                </Group>
                            );
                        }}
                        size="md"
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <Button
                        onClick={handleLogin}
                        fullWidth
                        size="md"
                        variant="default"
                        loading={isLoginLoading}
                        leftSection={<IconAt size={16} />}
                        data-login-secondary
                    >
                        {t('login')}
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
}
