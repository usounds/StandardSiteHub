"use client";

import { useState } from 'react';
import { Stack, Text, Autocomplete, Button, Group, Avatar, Paper, ComboboxItem } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useDebouncedCallback } from '@mantine/hooks';

export function LoginPanel() {
    const t = useTranslations('Index');
    const { login } = useAuth();
    const [loginHandle, setLoginHandle] = useState('');
    const [suggestions, setSuggestions] = useState<(ComboboxItem & { avatar?: string })[]>([]);
    const [isLoginLoading, setIsLoginLoading] = useState(false);

    const handleLogin = async () => {
        if (!loginHandle) return;
        setIsLoginLoading(true);
        try {
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

    const handleInput = useDebouncedCallback(async (val: string) => {
        if (!val) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(val)}&limit=5`);
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.actors.map((a: any) => ({
                    value: a.handle,
                    label: a.handle,
                    avatar: a.avatar
                })));
            }
        } catch (err) {
            // console.error("searchActorsTypeahead error", err);
        }
    }, 300);

    return (
        <Paper withBorder shadow="md" p={30} radius="md" w="100%" maw={400} mx="auto">
            <Stack>
                <Text size="lg" fw={500} ta="center">
                    Welcome Back
                </Text>
                <Text c="dimmed" size="sm" ta="center" mb="xs">
                    {t('login_message')}
                </Text>
                <Autocomplete
                    label={t('handle_label')}
                    placeholder={t('handle_placeholder')}
                    value={loginHandle}
                    leftSection="@"
                    data={suggestions}
                    onInput={(event) => handleInput(event.currentTarget.value)}
                    onChange={(value) => {
                        setLoginHandle(value);
                        setSuggestions([]);
                    }}
                    renderOption={({ option }: { option: any }) => (
                        <Group gap="sm">
                            <Avatar src={option.avatar} size={24} radius="xl" />
                            <Text size="sm">{option.value}</Text>
                        </Group>
                    )}
                    size="md"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                />
                <Button onClick={handleLogin} fullWidth mt="md" size="md" variant="filled" color="blue" loading={isLoginLoading}>
                    {t('login')}
                </Button>
            </Stack>
        </Paper>
    );
}
