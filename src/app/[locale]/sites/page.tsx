"use client";

import { useEffect, useState, useCallback } from 'react';
import { Container, Title, Button, Group, Card, Text, SimpleGrid, Loader, Center, Badge, Tooltip, ActionIcon, Modal, Code, Stack, Box } from '@mantine/core';
import NextImage from 'next/image';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useAuth } from '@/lib/auth-context';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { SiteStandardPublication } from '@/lib/lexicons/site-standard-publication';
import { verifyPublicationOwnership, PublicationVerificationResult } from '@/app/actions/verify-publication';
import { IconTrash, IconArrowRight } from '@tabler/icons-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { resolvePds } from '@/lib/pds';

import { getWellKnownUrl } from '@/lib/verification';

// Define the record structure returned by listRecords
interface PublicationRecord {
    uri: string;
    cid: string;
    value: SiteStandardPublication;
}

interface ListRecordsResponse {
    records?: PublicationRecord[];
}

function getBlobUrl(pds: string, did: string, cid: string): string {
    return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

export default function PublicationsPage() {
    const t = useTranslations('Publications');
    const { agent, session, isLoading } = useAuth();
    const [publications, setPublications] = useState<PublicationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState<Record<string, PublicationVerificationResult>>({});
    const [verifying, setVerifying] = useState<Record<string, boolean>>({});
    const [selectedPub, setSelectedPub] = useState<PublicationRecord | null>(null);
    const [userPds, setUserPds] = useState<string>('https://bsky.social');
    const [opened, { open, close }] = useDisclosure(false);

    const fetchPublications = useCallback(async () => {
        if (!session || !agent) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const result = await agent.get('com.atproto.repo.listRecords', {
                params: {
                    repo: session.info.sub,
                    collection: 'site.standard.publication',
                }
            });
            const data = result.data as ListRecordsResponse;
            const records = data.records ?? [];
            setPublications(records);

            // Verify all publications in parallel
            const verifyPromises = records.map(async (pub) => {
                if (!pub.value.url) return;
                try {
                    setVerifying(prev => ({ ...prev, [pub.uri]: true }));
                    const result = await verifyPublicationOwnership(pub.value.url, pub.uri);
                    setVerificationStatus(prev => ({ ...prev, [pub.uri]: result }));
                } finally {
                    setVerifying(prev => ({ ...prev, [pub.uri]: false }));
                }
            });
            await Promise.allSettled(verifyPromises);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [agent, session]);

    useEffect(() => {
        if (!session?.info.sub) return;
        resolvePds(session.info.sub).then(setUserPds);
    }, [session?.info.sub]);

    useEffect(() => {
        if (isLoading) return;
        queueMicrotask(() => void fetchPublications());
    }, [isLoading, fetchPublications]);

    const handleDownloadVerificationFile = useCallback((atUri: string) => {
        const blob = new Blob([atUri], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'site.standard.publication';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    const handleDeleteSite = async (uri: string) => {
        if (!window.confirm(t('delete_confirm_message'))) return;
        if (!agent || !session) return;

        const parts = uri.split('/');
        const collection = parts[3];
        const rkey = parts[4];

        try {
            await agent.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: session.info.sub,
                    writes: [{
                        $type: 'com.atproto.repo.applyWrites#delete',
                        collection: collection,
                        rkey: rkey,
                    }]
                }
            });
            setPublications(prev => prev.filter(p => p.uri !== uri));
            notifications.show({
                title: t('delete'),
                message: 'Success',
                color: 'green',
            });
        } catch (err) {
            console.error(err);
            notifications.show({
                title: 'Error',
                message: 'Failed to delete site',
                color: 'red',
            });
        }
    };

    const handleOpenVerification = (pub: PublicationRecord) => {
        setSelectedPub(pub);
        open();
    };

    if (isLoading || loading) {
        return <Center h="50vh"><Loader /><Text ml="md">{t('loading')}</Text></Center>;
    }

    let wellKnownUrl = '';
    if (selectedPub?.value.url) {
        wellKnownUrl = getWellKnownUrl(selectedPub.value.url);
    } else if (selectedPub) {
        wellKnownUrl = '(URL definition missing)';
    }

    return (
        <AuthGuard>
            <Container size="lg" py="xl">
                <Group justify="space-between" mb="lg">
                    <Title>{t('title')}</Title>
                    <Button variant="filled" color="dark" radius="md" component={Link} href="/sites/new">{t('create_new')}</Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                    {publications.map((pub) => {
                        const verification = verificationStatus[pub.uri];
                        const isVerifying = verifying[pub.uri];

                        const iconRef = pub.value.icon?.ref?.$link;
                        const did = pub.uri.split('/')[2]; // at://did:plc:xxx/collection/rkey

                        return (
                            <Card key={pub.uri} shadow="sm" padding="lg" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <Card.Section>
                                    {iconRef && did ? (
                                        <Box h={160} w="100%" pos="relative" bg="gray.1">
                                            <NextImage
                                                src={getBlobUrl(userPds, did, iconRef)}
                                                alt={pub.value.name}
                                                fill
                                                unoptimized
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </Box>
                                    ) : (
                                        <Center h={160} bg="gray.1">
                                            <Text c="dimmed">{t('icon')}</Text>
                                        </Center>
                                    )}
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => handleDeleteSite(pub.uri)}
                                        style={{
                                            position: 'absolute',
                                            top: 10,
                                            right: 10,
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        }}
                                        title={t('delete')}
                                    >
                                        <IconTrash size={18} />
                                    </ActionIcon>
                                </Card.Section>

                                <Group justify="space-between" mt="md" mb="xs" align="flex-start">
                                    <Text fw={700} size="lg" lineClamp={2} style={{ flex: 1 }}>{pub.value.name}</Text>
                                    {isVerifying ? (
                                        <Loader size="xs" />
                                    ) : verification?.verified ? (
                                        <Tooltip label={t('verified_tooltip')}>
                                            <Badge color="green" variant="filled" leftSection="✓">
                                                {t('verified')}
                                            </Badge>
                                        </Tooltip>
                                    ) : verification && !verification.verified ? (
                                        <Tooltip label={t('unverified_tooltip')}>
                                            <Badge color="orange" variant="light">
                                                {t('unverified')}
                                            </Badge>
                                        </Tooltip>
                                    ) : null}
                                </Group>

                                <Text size="sm" c="dimmed" lineClamp={3}>
                                    {pub.value.description}
                                </Text>

                                <Group justify="flex-end" mt="auto" pt="xl" gap="sm">
                                    <Button variant="subtle" color="gray" size="sm" radius="xl" component={Link} href={`/sites/${pub.uri.split('/').pop()}/edit`}>
                                        {t('edit')}
                                    </Button>
                                    {verification?.verified ? (
                                        <Button 
                                            variant="filled" 
                                            color="dark" 
                                            size="sm" 
                                            radius="xl" 
                                            component={Link} 
                                            href={`/sites/${pub.uri.split('/').pop()}`}
                                            rightSection={<IconArrowRight size={16} />}
                                        >
                                            {t('manage_documents')}
                                        </Button>
                                    ) : (
                                        <Button variant="light" color="orange" size="sm" radius="xl" onClick={() => handleOpenVerification(pub)}>
                                            {t('verify_site')}
                                        </Button>
                                    )}
                                </Group>
                            </Card>
                        );
                    })}
                </SimpleGrid>

                <Modal opened={opened} onClose={close} title={<Text fw={700} size="lg">{t('verification_modal_title')}</Text>} size="lg" radius="md" overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}>
                    {selectedPub && (
                        <Stack gap="lg" mt="sm">
                            <Text size="sm" c="dimmed">
                                {t('verification_step_text')}
                            </Text>

                            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-gray-0)">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('verification_request')}</Text>
                                    </Group>
                                    <Code block p="sm" bg="white" style={{ border: '1px solid var(--mantine-color-gray-3)' }}>
                                        GET {wellKnownUrl}
                                    </Code>
                                </Stack>

                                <Stack gap="xs" mt="md">
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('verification_response')}</Text>
                                    <Code block p="sm" bg="white" style={{ border: '1px solid var(--mantine-color-gray-3)' }}>
                                        {selectedPub.uri}
                                    </Code>
                                </Stack>
                            </Paper>

                            <Text size="sm" fw={500}>
                                {t('verification_confirmation_text')}
                            </Text>

                            <Group justify="flex-end" mt="md">
                                <Button
                                    variant="filled"
                                    color="dark"
                                    onClick={() => handleDownloadVerificationFile(selectedPub.uri)}
                                >
                                    {t('download_verification_file')}
                                </Button>
                            </Group>
                        </Stack>
                    )}
                </Modal>
            </Container>
        </AuthGuard>
    );
}
