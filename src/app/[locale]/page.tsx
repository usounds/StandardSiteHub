"use client";

import { Container, Title, Text, Button, Group, Stack, TextInput, Paper, Center, ThemeIcon, rem } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { Link } from '@/i18n/routing';

export default function Home() {
  const t = useTranslations('Index');
  const { login, logout, session, handle, isLoading } = useAuth();
  const [loginHandle, setLoginHandle] = useState('');
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
    } finally {
      setIsLoginLoading(false);
    }
  };

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

        <Paper withBorder shadow="md" p={30} radius="md" mt="xl" w="100%" maw={400}>
          {session ? (
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
          ) : (
            <Stack>
              <Text size="lg" fw={500} ta="center">
                Welcome Back
              </Text>
              <Text c="dimmed" size="sm" ta="center" mb="xs">
                {t('login_message')}
              </Text>
              <TextInput
                label={t('handle_label')}
                placeholder={t('handle_placeholder')}
                value={loginHandle}
                onChange={(e) => setLoginHandle(e.currentTarget.value)}
                size="md"
              />
              <Button onClick={handleLogin} fullWidth mt="md" size="md" variant="filled" color="blue" loading={isLoginLoading}>
                {t('login')}
              </Button>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
