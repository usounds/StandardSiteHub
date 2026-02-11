"use client";

import { AppShell, Burger, Group, Title, Menu, ActionIcon, useMantineColorScheme, useComputedColorScheme, Anchor, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { IconSun, IconMoon, IconLanguage } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Footer } from './footer/Footer';

export function Shell({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const t = useTranslations('Shell');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const switchLocale = (newLocale: 'en' | 'ja') => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened, desktop: true }, // Collapsed on desktop for now as requested just header
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Title order={3}>{t('app_title')}</Title>
                    <Group ml="auto" visibleFrom="sm" gap="xl">
                        <Group gap="md">
                            <Anchor component={Link} href="/" underline="hover" fw={500} size="sm" c="dimmed">
                                {t('home')}
                            </Anchor>
                            <Anchor component={Link} href="/sites" underline="hover" fw={500} size="sm" c="dimmed">
                                {t('publications')}
                            </Anchor>
                        </Group>

                        <Group gap="xs">
                            <ActionIcon
                                onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
                                variant="default"
                                size="lg"
                                aria-label={t('toggle_theme')}
                            >
                                {mounted ? (
                                    computedColorScheme === 'light' ? <IconMoon size={20} stroke={1.5} /> : <IconSun size={20} stroke={1.5} />
                                ) : (
                                    <div style={{ width: 20, height: 20 }} />
                                )}
                            </ActionIcon>

                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <ActionIcon variant="default" size="lg" aria-label={t('toggle_theme')}>
                                        <IconLanguage size={20} stroke={1.5} />
                                    </ActionIcon>
                                </Menu.Target>

                                <Menu.Dropdown>
                                    <Menu.Item
                                        onClick={() => switchLocale('en')}
                                        fw={locale === 'en' ? 700 : 400}
                                    >
                                        English
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={() => switchLocale('ja')}
                                        fw={locale === 'ja' ? 700 : 400}
                                    >
                                        日本語
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    </Group>

                    <Group hiddenFrom="sm" ml="auto" gap="xs">
                        <ActionIcon
                            onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
                            variant="default"
                            size="lg"
                            aria-label={t('toggle_theme')}
                        >
                            {mounted ? (
                                computedColorScheme === 'light' ? <IconMoon size={20} stroke={1.5} /> : <IconSun size={20} stroke={1.5} />
                            ) : (
                                <div style={{ width: 20, height: 20 }} />
                            )}
                        </ActionIcon>

                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="default" size="lg" aria-label={t('toggle_theme')}>
                                    <IconLanguage size={20} stroke={1.5} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item onClick={() => switchLocale('en')}>English</Menu.Item>
                                <Menu.Item onClick={() => switchLocale('ja')}>日本語</Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <Button component={Link} href="/" variant="subtle" fullWidth justify="flex-start" onClick={toggle}>{t('home')}</Button>
                <Button component={Link} href="/sites" variant="subtle" fullWidth justify="flex-start" onClick={toggle}>{t('publications')}</Button>
            </AppShell.Navbar>

            <AppShell.Main>
                {children}
                <Footer />
            </AppShell.Main>
        </AppShell>
    );
}
