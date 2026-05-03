"use client";

import { Container, Center, Stack, Text, Loader, Paper, Transition } from '@mantine/core';
import { useEffect, useState } from 'react';

export function AuthLoading({ message = '認証処理中...' }: { message?: string }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <Container size="md" h="100vh">
            <Center h="100%">
                <Transition mounted={mounted} transition="pop" duration={400} timingFunction="ease">
                    {(styles) => (
                        <Paper
                            style={{
                                ...styles,
                                background: 'var(--mantine-color-body)',
                                border: '1px solid var(--mantine-color-default-border)',
                                backdropFilter: 'blur(10px)',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            }}
                            shadow="xl"
                            radius="lg"
                            p="xl"
                            w={320}
                        >
                            <Stack align="center" gap="lg">
                                <div style={{ position: 'relative' }}>
                                    <Loader size="xl" type="bars" color="dark" />
                                </div>
                                <Text fw={800} size="lg" ta="center" c="var(--mantine-color-text)">
                                    {message}
                                </Text>
                                <Text c="dimmed" size="xs" ta="center">
                                    Securely connecting to your account
                                </Text>
                            </Stack>
                        </Paper>
                    )}
                </Transition>
            </Center>
        </Container>
    );
}
