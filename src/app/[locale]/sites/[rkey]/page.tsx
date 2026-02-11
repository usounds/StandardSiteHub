"use client";

import { useEffect, useState } from 'react';
import { Container, Title, Button, Group, Card, Text, SimpleGrid, Loader, Center, Breadcrumbs, Anchor, ActionIcon, Badge, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconCheck, IconExternalLink } from '@tabler/icons-react';
import { useAuth } from '@/lib/auth-context';
import { Link, useRouter } from '@/i18n/routing';
import { SiteStandardPublication } from '@/lib/lexicons/site-standard-publication';
import { SiteStandardDocument } from '@/lib/lexicons/site-standard-document';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { verifySite } from '@/lib/verification';

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

    useEffect(() => {
        if (isLoading) return;
        if (!session || !agent) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            try {
                // 1. Fetch Publication
                // Note: casting method name to string or any to bypass potential strict typing issues
                // if agent is explicitly typed as strict. But we switched to Client<any, any>.
                // However, arguments must match signature.
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

                // Verify site if URL is present
                if (pubData.url) {
                    verifySite(pubData.url, pubUri).then(verified => {
                        setIsVerified(verified);
                    });
                }

                // 2. Fetch All Documents and Filter
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
                {documents.map((doc) => (
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
                        <Button variant="light" color="blue" fullWidth mt="md" radius="md" component={Link} href={`/sites/${rkey}/articles/${doc.uri.split('/').pop()}/edit`}>
                            {t('edit')}
                        </Button>
                    </Card>
                ))}
            </SimpleGrid>
        </Container>
    );
}
