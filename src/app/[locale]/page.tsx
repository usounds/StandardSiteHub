"use client";

import { Container, Title, Text, Button, Stack, Center, rem, Paper } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { Link } from '@/i18n/routing';
import { LoginPanel } from '@/components/auth/LoginPanel';

export default function Home() {
  const t = useTranslations('Index');
  const { logout, session, handle, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Text size="lg">Loading...</Text>
      </Center>
    );
  }

  return (
    <Container size="md" py={120}>
      <Stack gap="xl" align="center">
        <Stack gap="sm" align="center" style={{ textAlign: 'center' }}>
          <Title order={1} size={rem(48)} fw={900} mt="md" c="var(--mantine-color-text)" letterSpacing="-1px">
            {t('title')}
          </Title>
          <Text c="dimmed" size="xl" maw={580} mt="sm" lh={1.6}>
            {t('description')}
          </Text>
        </Stack>

        <Stack w="100%" maw={400} mt="xl">
          {session ? (
            <Paper
              withBorder
              shadow="xl"
              p={40}
              radius="lg"
              w="100%"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Stack align="center" gap="lg">
                <Text fw={600} ta="center" size="xl">{t('welcome', { handle: handle || session.info.sub })}</Text>
                <Button component={Link} href="/sites" fullWidth variant="filled" color="dark" size="lg" radius="md">
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
