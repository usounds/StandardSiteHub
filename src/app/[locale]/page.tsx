"use client";

import { Container, Title, Text, Button, Group, Stack, Center, rem, Paper } from '@mantine/core';
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
    <Container size="md" py={80}>
      <Stack gap="xl" align="center">
        <Stack gap="xs" align="center" style={{ textAlign: 'center' }}>
          <Title order={1} size={rem(32)} fw={900} mt="md">
            {t('title')}
          </Title>
          <Text c="dimmed" size="lg" maw={580} mt="sm">
            {t('description')}
          </Text>
        </Stack>

        <Stack w="100%" maw={400}>
          {session ? (
            <Paper withBorder shadow="md" p={30} radius="md" mt="xl" w="100%">
              <Stack>
                <Text fw={500} ta="center" size="lg">{t('welcome', { handle: handle || session.info.sub })}</Text>
                <Stack gap="md" mt="md">
                  <Button component={Link} href="/sites" fullWidth variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="md">
                    {t('manage_publications')}
                  </Button>
                  <Button onClick={() => logout()} variant="light" color="red" fullWidth size="md">
                    {t('logout')}
                  </Button>
                </Stack>
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
