import { Container, Title, Text, SimpleGrid, Card, Center, Badge, Tooltip, Button, Group, Image, Box } from '@mantine/core';
import NextImage from 'next/image';
import { IconWorld } from '@tabler/icons-react';
import classes from './ListCard.module.css';
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


interface ResolvedDidDoc {
    did: string;
    handle: string;
    pds: string;
    signing_key: string;
}

async function resolvePds(did: string): Promise<string> {
    try {
        const res = await fetch(`https://slingshot.microcosm.blue/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${did}`, {
            next: { revalidate: 3600 }, // Cache resolution for 1 hour
            signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
            const data = await res.json() as ResolvedDidDoc;
            return data.pds;
        }
    } catch (e) {
        console.error('Failed to resolve PDS for', did, e);
    }
    return 'https://bsky.social'; // Fallback
}

function getBlobUrl(pds: string, did: string, cid: string): string {
    return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

async function verifyPublication(siteUrl: string, atUri: string): Promise<{ verified: boolean, reason?: string }> {
    try {
        const wellKnownUrl = getWellKnownUrl(siteUrl);
        const res = await fetch(wellKnownUrl, {
            headers: { 'User-Agent': 'StandardSiteIntegration/1.0 (bot)' },
            signal: AbortSignal.timeout(5000),
            next: { revalidate: 60 },
        });
        if (!res.ok) return { verified: false, reason: 'unverified_reason_network' };
        const body = await res.text();
        if (body.trim() === atUri) {
            return { verified: true };
        } else {
            return { verified: false, reason: 'unverified_reason_mismatch' };
        }
    } catch {
        return { verified: false, reason: 'unverified_reason_network' };
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
    const [verificationResults, pdsResults] = await Promise.all([
        Promise.allSettled(
            records.map(async (rec) => {
                const atUri = `at://${rec.did}/${rec.collection}/${rec.rkey}`;
                if (!rec.record.url) return { atUri, verified: false, reason: 'unverified_reason_no_url' };
                const result = await verifyPublication(rec.record.url, atUri);
                return { atUri, ...result };
            })
        ),
        Promise.allSettled(records.map(rec => resolvePds(rec.did)))
    ]);

    const verificationMap: Record<string, { verified: boolean, reason?: string }> = {};
    verificationResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            verificationMap[records[index].did + '/' + records[index].rkey] = {
                verified: result.value.verified,
                reason: result.value.reason
            };
        }
    });

    const pdsMap: Record<string, string> = {};
    pdsResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            pdsMap[records[index].did] = result.value;
        } else {
            pdsMap[records[index].did] = 'https://bsky.social';
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
                        const verification = verificationMap[key] ?? { verified: false, reason: 'unverified_reason_network' };
                        const isVerified = verification.verified;
                        const iconRef = rec.record.icon?.ref?.$link;
                        const atUri = `at://${rec.did}/${rec.collection}/${rec.rkey}`;

                        return (
                            <Card key={key} shadow="sm" padding="lg" radius="lg" withBorder component="a" href={rec.record.url || '#'} target="_blank" rel="noopener noreferrer" className={classes.card}>
                                <Box mx="calc(var(--card-padding) * -1)" mt="calc(var(--card-padding) * -1)">
                                    {iconRef ? (
                                        <Box h={160} w="100%" pos="relative" bg="gray.1" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                                            <NextImage
                                                src={getBlobUrl(pdsMap[rec.did], rec.did, iconRef)}
                                                alt={rec.record.name}
                                                fill
                                                unoptimized
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        </Box>
                                    ) : (
                                        <Center h={160} bg="gray.1" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                                            <Text c="dimmed">{t('icon')}</Text>
                                        </Center>
                                    )}
                                </Box>

                                <Box mt="md" mb="xs" style={{ flex: 1 }}>
                                    {rec.record.url && (
                                        <Group gap="xs" mb={8} wrap="nowrap">
                                            <IconWorld size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                                            <Text size="xs" c="dimmed" lineClamp={1}>
                                                {(() => {
                                                    try {
                                                        return new URL(rec.record.url).hostname;
                                                    } catch {
                                                        return rec.record.url;
                                                    }
                                                })()}
                                            </Text>
                                        </Group>
                                    )}

                                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                                        <Text fw={600} size="lg" lineClamp={2} style={{ flex: 1, lineHeight: 1.3 }}>
                                            {rec.record.name}
                                        </Text>
                                        {isVerified ? (
                                            <Tooltip label={t('verified_tooltip')}>
                                                <Badge color="green" variant="light" size="sm" leftSection="✓" style={{ flexShrink: 0 }}>
                                                    {t('verified')}
                                                </Badge>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip label={verification.reason ? t(verification.reason) : t('unverified_tooltip')}>
                                                <Badge color="gray" variant="light" size="sm" style={{ flexShrink: 0 }}>
                                                    {t('unverified')}
                                                </Badge>
                                            </Tooltip>
                                        )}
                                    </Group>

                                    <Text size="sm" c="dimmed" lineClamp={3} mt="sm">
                                        {rec.record.description}
                                    </Text>
                                </Box>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}
        </Container>
    );
}
