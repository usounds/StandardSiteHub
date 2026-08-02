"use client";

import { Container, Title, Text, Button, Stack, Paper, Group, ThemeIcon } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { Link } from '@/i18n/routing';
import { LoginPanel } from '@/components/auth/LoginPanel';
import { IconArrowRight, IconChecks, IconWorldCog } from '@tabler/icons-react';

export default function Home() {
  const t = useTranslations('Index');
  const { session, handle } = useAuth();

  return (
    <Container size="lg" className="app-hero">
      <Stack gap={24}>
        <Stack gap="md" align="center" style={{ textAlign: 'center' }}>
          <Group gap="xs" justify="center" className="app-muted-panel app-hero-kicker" px="sm" py={7} style={{ borderRadius: 999 }}>
            <ThemeIcon size={38} radius="md" color="brand" variant="light">
              <IconWorldCog size={20} />
            </ThemeIcon>
            <Text fw={800} c="var(--app-brand-strong)" size="sm">AT Protocol Standard Site</Text>
          </Group>
          <Stack gap="sm" align="center">
            <Title order={1} className="app-hero-title" maw={900}>
              {t('title')}
            </Title>
            <Text c="var(--app-text-muted)" size="xl" maw={680} lh={1.55} fw={500}>
              {t('description')}
            </Text>
          </Stack>
        </Stack>

        <Stack w="100%" maw={410} mx="auto">
          {session ? (
            <Paper
              withBorder
              className="app-panel"
              p={{ base: 'xl', sm: 40 }}
              radius="md"
              w="100%"
            >
              <Stack align="center" gap="lg">
                <ThemeIcon size={48} radius="xl" color="green" variant="light">
                  <IconChecks size={26} />
                </ThemeIcon>
                <Stack gap={4} align="center">
                  <Text fw={800} ta="center" size="lg">{t('welcome', { handle: handle || session.info.sub })}</Text>
                  <Text c="dimmed" ta="center" size="sm">{t('login_message')}</Text>
                </Stack>
                <Button component={Link} href="/sites" fullWidth size="lg" rightSection={<IconArrowRight size={18} />}>
                  {t('manage_publications')}
                </Button>
              </Stack>
            </Paper>
          ) : (
            <LoginPanel />
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
