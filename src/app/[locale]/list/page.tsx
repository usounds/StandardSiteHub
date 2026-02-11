import { Container, Title, Text, SimpleGrid, Card, Center, Badge, Tooltip, Button, Group, Image, Box } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { getWellKnownUrl } from '@/lib/verification';

export const revalidate = 60;
export const dynamic = 'force-static';


export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

interface PublicationApiRecord {
    did: string;
    collection: string;
    rkey: string;
    record: {
        $type: string;
        name: string;
        description?: string;
        url?: string;
        icon?: {
            $type: string;
            ref: { $link: string };
            mimeType: string;
            size: number;
        };
        preferences?: {
            showInDiscover?: boolean;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    time_us: number;
}

function getBlobUrl(did: string, cid: string): string {
    return `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

async function verifyPublication(siteUrl: string, atUri: string): Promise<boolean> {
    try {
        const wellKnownUrl = getWellKnownUrl(siteUrl);
        const res = await fetch(wellKnownUrl, {
            headers: { 'User-Agent': 'StandardSiteIntegration/1.0 (bot)' },
            signal: AbortSignal.timeout(5000),
            next: { revalidate: 60 },
        });
        if (!res.ok) return false;
        const body = await res.text();
        return body.trim() === atUri;
    } catch {
        return false;
    }
}

export default async function PublicListPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'PublicList' });

    let records: PublicationApiRecord[] = [];
    try {
        const res = await fetch('https://ufos-api.microcosm.blue/records?collection=site.standard.publication', {
            next: { revalidate: 60 },
            signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
            records = (await res.json()).slice(0, 42);
        }
    } catch (err) {
        console.error('Failed to fetch publication records:', err);
    }

    // Build AT URIs and verify in parallel
    const verificationResults = await Promise.allSettled(
        records.map(async (rec) => {
            const atUri = `at://${rec.did}/${rec.collection}/${rec.rkey}`;
            if (!rec.record.url) return { atUri, verified: false };
            const verified = await verifyPublication(rec.record.url, atUri);
            return { atUri, verified };
        })
    );

    const verificationMap: Record<string, boolean> = {};
    verificationResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            verificationMap[records[index].did + '/' + records[index].rkey] = result.value.verified;
        }
    });

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="xs">
                <Title>{t('title')}</Title>
                <Badge variant="light" size="lg">{t('total_sites', { count: records.length })}</Badge>
            </Group>
            <Text size="sm" c="dimmed" mb="lg">{t('description')}</Text>

            {records.length === 0 ? (
                <Center h="200">
                    <Text c="dimmed">{t('no_sites')}</Text>
                </Center>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                    {records.map((rec) => {
                        const key = rec.did + '/' + rec.rkey;
                        const isVerified = verificationMap[key] ?? false;
                        const iconRef = rec.record.icon?.ref?.$link;
                        const atUri = `at://${rec.did}/${rec.collection}/${rec.rkey}`;

                        return (
                            <Card key={key} shadow="sm" padding="lg" radius="md" withBorder>
                                <Box mx="calc(var(--card-padding) * -1)" mt="calc(var(--card-padding) * -1)">
                                    {iconRef ? (
                                        <Image
                                            src={getBlobUrl(rec.did, iconRef)}
                                            h={160}
                                            alt={rec.record.name}
                                            fallbackSrc=""
                                        />
                                    ) : (
                                        <Center h={160} bg="gray.1">
                                            <Text c="dimmed">{t('icon')}</Text>
                                        </Center>
                                    )}
                                </Box>

                                <Group justify="space-between" mt="md" mb="xs">
                                    <Text fw={500} lineClamp={1} style={{ flex: 1 }}>{rec.record.name}</Text>
                                    {isVerified ? (
                                        <Tooltip label={t('verified_tooltip')}>
                                            <Badge color="green" variant="filled" leftSection="✓">
                                                {t('verified')}
                                            </Badge>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip label={t('unverified_tooltip')}>
                                            <Badge color="orange" variant="light">
                                                {t('unverified')}
                                            </Badge>
                                        </Tooltip>
                                    )}
                                </Group>

                                <Text size="sm" c="dimmed" lineClamp={3} h={60}>
                                    {rec.record.description}
                                </Text>

                                {rec.record.url && (
                                    <Button
                                        component="a"
                                        href={rec.record.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="light"
                                        color="blue"
                                        fullWidth
                                        mt="md"
                                        radius="md"
                                        rightSection={<IconExternalLink size={14} />}
                                    >
                                        {t('visit_site')}
                                    </Button>
                                )}
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}
        </Container>
    );
}
