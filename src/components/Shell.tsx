"use client";

import { AppShell, Burger, Group, Menu, ActionIcon, Anchor, Button, Avatar, UnstyledButton, Text, rem, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { IconLanguage, IconLogout, IconChevronDown, IconHome, IconLayoutGrid, IconWorldSearch } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth-context';
import { Footer } from './footer/Footer';

export function Shell({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const t = useTranslations('Shell');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { session, handle, logout } = useAuth();

    const switchLocale = (newLocale: 'en' | 'ja') => {
        router.replace(pathname, { locale: newLocale });
    };

    const navItems = [
        { href: '/', label: t('home'), icon: IconHome },
        { href: '/sites', label: t('publications'), icon: IconLayoutGrid },
        { href: '/list', label: t('list'), icon: IconWorldSearch },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    return (
        <AppShell
            header={{ height: 64 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened, desktop: true },
            }}
            padding={0}
        >
            <AppShell.Header
                style={{
                    background: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                }}
            >
                <Group h="100%" px="xl" gap="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Anchor component={Link} href="/" underline="never" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <Box
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                display: 'grid',
                                placeItems: 'center',
                                background: 'var(--app-brand)',
                                color: '#07080c',
                                fontWeight: 800,
                                fontSize: 13,
                            }}
                        >
                            SSH
                        </Box>
                        <Box visibleFrom="xs">
                            <Text fw={800} size="sm" lh={1.15}>Standard Site Hub</Text>
                            <Text c="dimmed" size="xs" lh={1.15}>{t('app_title')}</Text>
                        </Box>
                    </Anchor>

                    <Group ml="auto" visibleFrom="sm" gap="lg">
                        <Group gap={4}>
                            {navItems.map((item) => {
                                const active = isActive(item.href);
                                const Icon = item.icon;
                                return (
                                    <Anchor
                                        key={item.href}
                                        component={Link}
                                        href={item.href}
                                        underline="never"
                                        fw={700}
                                        size="sm"
                                        px="sm"
                                        py={7}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            borderRadius: 8,
                                            color: active ? 'var(--foreground)' : 'var(--app-text-muted)',
                                            background: active ? 'light-dark(var(--mantine-color-brand-0), var(--mantine-color-dark-6))' : 'transparent',
                                        }}
                                    >
                                        <Icon size={16} stroke={1.8} />
                                        {item.label}
                                    </Anchor>
                                );
                            })}
                        </Group>

                        <Group gap="xs">
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <ActionIcon variant="default" size="lg" aria-label={t('switch_language')}>
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

                            {session && (
                                <Menu shadow="md" width={200} position="bottom-end">
                                    <Menu.Target>
                                        <UnstyledButton style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Avatar size="sm" color="brand" radius="xl">{handle?.charAt(0).toUpperCase() || 'U'}</Avatar>
                                            <IconChevronDown size={14} stroke={1.5} />
                                        </UnstyledButton>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Account</Menu.Label>
                                        <Menu.Item>
                                            <Text size="sm" fw={500} truncate>{handle || session.info.sub}</Text>
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                            color="red"
                                            leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                                            onClick={() => logout()}
                                        >
                                            Logout
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            )}
                        </Group>
                    </Group>

                    <Group hiddenFrom="sm" ml="auto" gap="xs">
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <ActionIcon variant="default" size="lg" aria-label={t('switch_language')}>
                                    <IconLanguage size={20} stroke={1.5} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item onClick={() => switchLocale('en')}>English</Menu.Item>
                                <Menu.Item onClick={() => switchLocale('ja')}>日本語</Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                        {session && (
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <UnstyledButton style={{ display: 'flex', alignItems: 'center' }}>
                                        <Avatar size="sm" color="brand" radius="xl">{handle?.charAt(0).toUpperCase() || 'U'}</Avatar>
                                    </UnstyledButton>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>Account</Menu.Label>
                                    <Menu.Item>
                                        <Text size="sm" fw={500} truncate>{handle || session.info.sub}</Text>
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                        color="red"
                                        leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                                        onClick={() => logout()}
                                    >
                                        Logout
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Button
                            key={item.href}
                            component={Link}
                            href={item.href}
                            variant={isActive(item.href) ? 'light' : 'subtle'}
                            color={isActive(item.href) ? 'brand' : 'gray'}
                            fullWidth
                            justify="flex-start"
                            leftSection={<Icon size={16} />}
                            onClick={toggle}
                            mb="xs"
                        >
                            {item.label}
                        </Button>
                    );
                })}
            </AppShell.Navbar>

            <AppShell.Main style={{ minHeight: '100vh' }}>
                {children}
                <Footer />
            </AppShell.Main>
        </AppShell>
    );
}
