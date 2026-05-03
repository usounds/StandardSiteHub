"use client";

import { useState } from 'react';
import { Stack, Text, Autocomplete, Button, Group, Avatar, Paper, ComboboxItem, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useDebouncedCallback } from '@mantine/hooks';
import { AtPassportIcon, AtPassportUI } from '@atpassport/client/ui';
import { ATPASSPORT_STATE_STORAGE_KEY, POST_OAUTH_RETURN_TO_STORAGE_KEY, createAtPassportClient, getCurrentReturnTo, getAtPassportLocale } from '@/lib/atpassport';

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

            sessionStorage.setItem(ATPASSPORT_STATE_STORAGE_KEY, atpstate);
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
            shadow="xl"
            p={40}
            radius="lg"
            w="100%"
            maw={420}
            mx="auto"
            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
            }}
        >
            <Stack gap="lg">
                <div>
                    <Text size="xl" fw={800} ta="center" c="var(--mantine-color-text)" letterSpacing="-0.5px">
                        Welcome Back
                    </Text>
                    <Text c="dimmed" size="sm" ta="center" mt="xs">
                        {t('login_message')}
                    </Text>
                </div>

                <Button
                    onClick={handleAtPassportLogin}
                    fullWidth
                    size="md"
                    radius="md"
                    variant="default"
                    loading={isAtPassportLoading}
                    leftSection={<AtPassportIcon size={22} />}
                    style={{ transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: 'var(--mantine-shadow-sm)' } }}
                >
                    {AtPassportUI[getAtPassportLocale(locale)].title}
                </Button>

                <Divider label="または" labelPosition="center" my="sm" />

                <Stack gap="md">
                    <Autocomplete
                        label={t('handle_label')}
                        placeholder={t('handle_placeholder')}
                        value={loginHandle}
                        leftSection={<Text c="dimmed">@</Text>}
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
                        radius="md"
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <Button
                        onClick={handleLogin}
                        fullWidth
                        size="md"
                        radius="md"
                        variant="filled"
                        color="dark"
                        loading={isLoginLoading}
                        style={{ transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: 'var(--mantine-shadow-md)' } }}
                    >
                        {t('login')}
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
}
