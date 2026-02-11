"use client";

import { useEffect, useState } from 'react';
import { Container, Title, Button, Group, Card, Text, SimpleGrid, Loader, Center, Breadcrumbs, Anchor, ActionIcon, Badge, Tooltip, Modal, Stack, ThemeIcon, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconCheck, IconX, IconCircleCheck, IconCircleX, IconClock } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth-context';
import { Link, useRouter } from '@/i18n/routing';
import { SiteStandardPublication } from '@/lib/lexicons/site-standard-publication';
import { SiteStandardDocument } from '@/lib/lexicons/site-standard-document';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { verifySite } from '@/lib/verification';
import { verifyDocument, VerificationResult } from '@/app/actions/verify';
import { AuthGuard } from '@/components/auth/AuthGuard';

interface DocumentRecord {
    uri: string;
    cid: string;
    value: SiteStandardDocument;
}

export default function PublicationDocumentsPage() {
    const t = useTranslations('SiteDetail');
    const { agent, session, isLoading } = useAuth();
    const params = useParams();
    const rkey = params.rkey as string;

    const [publication, setPublication] = useState<SiteStandardPublication | null>(null);
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isVerified, setIsVerified] = useState(false);
    const [verifyingDocUri, setVerifyingDocUri] = useState<string | null>(null);
    const [docVerifyResults, setDocVerifyResults] = useState<Record<string, VerificationResult>>({});

    // Modal state
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const [modalResult, setModalResult] = useState<VerificationResult | null>(null);
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        if (isLoading) return;
        if (!session || !agent) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            try {
                const pubRes = await agent!.get('com.atproto.repo.getRecord', {
                    params: {
                        repo: session!.info.sub,
                        collection: 'site.standard.publication',
                        rkey: rkey,
                    }
                });
                const pubData = (pubRes.data as any).value as unknown as SiteStandardPublication;
                const pubUri = (pubRes.data as any).uri;
                setPublication(pubData);

                if (pubData.url) {
                    verifySite(pubData.url, pubUri).then(verified => {
                        setIsVerified(verified);
                    });
                }

                let cursor: string | undefined;
                let allDocs: DocumentRecord[] = [];

                do {
                    const docRes = await agent!.get('com.atproto.repo.listRecords', {
                        params: {
                            repo: session!.info.sub,
                            collection: 'site.standard.document',
                            cursor,
                            limit: 100,
                        }
                    });

                    const records = (docRes.data as any).records as unknown as DocumentRecord[];
                    allDocs = [...allDocs, ...records];
                    cursor = (docRes.data as any).cursor;
                } while (cursor);

                const validDocs = allDocs.filter(doc => {
                    return doc.value.site === pubUri || (pubData.url && doc.value.site === pubData.url);
                });
                setDocuments(validDocs);
            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [agent, session, isLoading, rkey]);

    const handleVerifyDocument = async (doc: DocumentRecord) => {
        const articleUrl = publication?.url && doc.value.path
            ? `${publication.url.replace(/\/$/, '')}${doc.value.path}`
            : null;

        if (!articleUrl) {
            notifications.show({
                title: t('verify_error'),
                message: t('verify_error_message'),
                color: 'red',
            });
            return;
        }

        setVerifyingDocUri(doc.uri);
        try {
            const res = await verifyDocument(articleUrl);
            setDocVerifyResults(prev => ({ ...prev, [doc.uri]: res }));

            // Show result in modal
            setModalResult(res);
            setModalTitle(doc.value.title || doc.value.path || '');
            openModal();
        } catch (err) {
            console.error('Verify document error:', err);
            notifications.show({
                title: t('verify_error'),
                message: t('verify_error_message'),
                color: 'red',
            });
        } finally {
            setVerifyingDocUri(null);
        }
    };

    const handleDeleteDocument = async (uri: string) => {
        if (!window.confirm(t('delete_article_confirm_message'))) return;
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
            setDocuments(prev => prev.filter(p => p.uri !== uri));
            notifications.show({
                title: t('delete_article'),
                message: 'Success',
                color: 'green',
            });
        } catch (err) {
            console.error(err);
            notifications.show({
                title: 'Error',
                message: 'Failed to delete article',
                color: 'red',
            });
        }
    };

    const translateStepName = (key: string) => {
        const tKey = `step_${key}` as any;
        try { return t(tKey); } catch { return key; }
    };
    const translateStepMessage = (key: string, status: string, params?: Record<string, string>) => {
        const tKey = `step_${key}_${status}` as any;
        try { return t(tKey, params); } catch { return params ? Object.values(params).join(', ') : ''; }
    };

    const getStepIcon = (status: 'success' | 'failure' | 'pending') => {
        switch (status) {
            case 'success':
                return <ThemeIcon color="green" size="sm" radius="xl"><IconCircleCheck size={14} /></ThemeIcon>;
            case 'failure':
                return <ThemeIcon color="red" size="sm" radius="xl"><IconCircleX size={14} /></ThemeIcon>;
            case 'pending':
                return <ThemeIcon color="gray" size="sm" radius="xl"><IconClock size={14} /></ThemeIcon>;
        }
    };

    if (isLoading || loading) {
        return <Center h="50vh"><Loader /></Center>;
    }

    if (!publication) {
        return <Container><Text>{t('not_found')}</Text></Container>;
    }

    const items = [
        { title: t('breadcrumb_sites'), href: '/sites' },
        { title: publication.name, href: '#' },
    ].map((item, index) => (
        <Anchor component={Link} href={item.href} key={index}>
            {item.title}
        </Anchor>
    ));

    return (
        <AuthGuard>
            <Container size="lg" py="xl">
                <Breadcrumbs mb="lg">{items}</Breadcrumbs>

                <Group justify="space-between" mb="lg">
                    <Group>
                        <Title order={2}>{t('articles_for', { name: publication.name })}</Title>
                        {isVerified && (
                            <Tooltip label={t('verified_site_tooltip') || "Verified Site"}>
                                <Badge color="green" leftSection={<IconCheck size={12} />}>
                                    {t('verified') || "Verified"}
                                </Badge>
                            </Tooltip>
                        )}
                    </Group>
                    <Button component={Link} href={`/sites/${rkey}/articles/new`}>{t('add_article')}</Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                    {documents.map((doc) => {
                        const verifyResult = docVerifyResults[doc.uri];
                        return (
                            <Card key={doc.uri} shadow="sm" padding="lg" radius="md" withBorder style={{ position: 'relative' }}>
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() => handleDeleteDocument(doc.uri)}
                                    style={{
                                        position: 'absolute',
                                        top: 10,
                                        right: 10,
                                        zIndex: 1,
                                    }}
                                    title={t('delete_article')}
                                >
                                    <IconTrash size={18} />
                                </ActionIcon>
                                <Text fw={500} pr={30}>{doc.value.title}</Text>
                                <Text size="sm" c="dimmed" lineClamp={3}>
                                    {doc.value.description}
                                </Text>
                                <Text size="xs" mt="xs" c="dimmed">
                                    {doc.value.path}
                                </Text>
                                {verifyResult && (
                                    <Badge
                                        mt="xs"
                                        color={verifyResult.success ? (verifyResult.fullyVerified ? 'green' : 'yellow') : 'red'}
                                        variant="light"
                                        leftSection={verifyResult.success ? <IconCheck size={12} /> : <IconX size={12} />}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setModalResult(verifyResult);
                                            setModalTitle(doc.value.title || doc.value.path || '');
                                            openModal();
                                        }}
                                    >
                                        {verifyResult.success
                                            ? (verifyResult.fullyVerified ? t('verified') : t('verify_partial'))
                                            : t('verify_error')
                                        }
                                    </Badge>
                                )}
                                <Group mt="md" grow>
                                    <Button variant="light" color="blue" radius="md" component={Link} href={`/sites/${rkey}/articles/${doc.uri.split('/').pop()}/edit`}>
                                        {t('edit')}
                                    </Button>
                                    <Button
                                        variant="light"
                                        color="teal"
                                        radius="md"
                                        loading={verifyingDocUri === doc.uri}
                                        onClick={() => handleVerifyDocument(doc)}
                                    >
                                        {t('verify_button')}
                                    </Button>
                                </Group>
                            </Card>
                        );
                    })}
                </SimpleGrid>

                {/* Verification Result Modal */}
                <Modal
                    opened={modalOpened}
                    onClose={closeModal}
                    title={
                        <Group gap="xs">
                            <Text fw={600}>{t('verify_modal_title')}</Text>
                            {modalResult && (
                                <Badge
                                    size="sm"
                                    color={modalResult.fullyVerified ? 'green' : modalResult.success ? 'yellow' : 'red'}
                                >
                                    {modalResult.fullyVerified ? t('verified') : modalResult.success ? t('verify_partial') : t('verify_error')}
                                </Badge>
                            )}
                        </Group>
                    }
                    size="lg"
                >
                    {modalTitle && (
                        <Text size="sm" c="dimmed" mb="md">{modalTitle}</Text>
                    )}
                    <Stack gap="xs">
                        {modalResult?.steps?.map((step, index) => (
                            <Box key={index}>
                                <Group gap="xs" wrap="nowrap">
                                    {getStepIcon(step.status)}
                                    <Text size="sm" fw={500}>{translateStepName(step.key)}</Text>
                                </Group>
                                <Text size="xs" c="dimmed" ml={28} style={{ wordBreak: 'break-all' }}>
                                    {translateStepMessage(step.key, step.status, step.params)}
                                </Text>
                            </Box>
                        ))}
                    </Stack>
                </Modal>
            </Container>
        </AuthGuard>
    );
}
