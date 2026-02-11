"use client";

import { useState, useEffect } from 'react';
import { Container, Center, Loader, Text } from '@mantine/core';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import type { SiteStandardPublication } from '@/lib/lexicons/site-standard-publication';
import type { SiteStandardDocument } from '@/lib/lexicons/site-standard-document';
import { ArticleForm, FormValues } from '@/components/sites/ArticleForm';

// Define BlobRef locally to match the generated Lexicon types and API response
interface BlobRef {
    $type: 'blob';
    ref: { $link: string };
    mimeType: string;
    size: number;
}

export default function EditArticlePage() {
    const t = useTranslations('EditArticle');
    const { agent, session, isLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pubRkey = params.rkey as string;
    const articleRkey = params.articleRkey as string;

    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [publication, setPublication] = useState<{ uri: string, value: SiteStandardPublication } | null>(null);
    const [originalDoc, setOriginalDoc] = useState<SiteStandardDocument | null>(null);
    const [initialValues, setInitialValues] = useState<FormValues | null>(null);

    useEffect(() => {
        if (isLoading) return;
        if (!session || !agent) {
            setLoading(false);
            return;
        }

        async function init() {
            try {
                // Fetch Publication
                const pubRes = await agent!.get('com.atproto.repo.getRecord', {
                    params: {
                        repo: session!.info.sub,
                        collection: 'site.standard.publication',
                        rkey: pubRkey,
                    }
                });

                if (!pubRes.ok) throw new Error('Failed to fetch publication');
                if (!pubRes.data) throw new Error('No data in publication response');

                const pubValue = (pubRes.data as any).value as SiteStandardPublication;
                const pubUri = (pubRes.data as any).uri;
                setPublication({ uri: pubUri, value: pubValue });

                // Fetch Document
                const docRes = await agent!.get('com.atproto.repo.getRecord', {
                    params: {
                        repo: session!.info.sub,
                        collection: 'site.standard.document',
                        rkey: articleRkey,
                    }
                });

                if (!docRes.ok) throw new Error('Failed to fetch document');
                if (!docRes.data) throw new Error('No data in document response');

                const docValue = (docRes.data as any).value as SiteStandardDocument;
                setOriginalDoc(docValue);

                // Populate form
                setInitialValues({
                    siteUrl: pubValue.url ? `${pubValue.url}${docValue.path}` : '',
                    rkey: articleRkey,
                    title: docValue.title,
                    description: docValue.description || '',
                    path: docValue.path || '',
                    content: (docValue.content as any)?.textContent || '',
                    tags: docValue.tags || [],
                    coverImage: null, // Don't preload file input
                });

            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [agent, session, isLoading, pubRkey, articleRkey]);

    const handleSubmit = async (values: FormValues) => {
        if (!agent || !session || !publication || !originalDoc) return;
        setSubmitting(true);
        try {
            let coverImageBlob = originalDoc.coverImage;

            if (values.coverImage) {
                const res = await agent.post('com.atproto.repo.uploadBlob', {
                    body: values.coverImage,
                    headers: {
                        'Content-Type': values.coverImage.type,
                    }
                });

                if (!res.ok) throw new Error('Failed to upload blob');

                const data = res.data;
                if (data && typeof data === 'object' && 'blob' in data) {
                    coverImageBlob = (data as { blob: BlobRef }).blob as any; // Cast as any if Types mismatch slightly
                }
            }

            const putRes = await agent.post('com.atproto.repo.putRecord', {
                input: {
                    repo: session.info.sub,
                    collection: 'site.standard.document',
                    rkey: articleRkey,
                    record: {
                        $type: 'site.standard.document',
                        site: publication.uri, // Ensure we use AT-URI
                        path: values.path,
                        title: values.title,
                        description: values.description,
                        content: {
                            $type: 'site.standard.content.text',
                            textContent: values.content
                        },
                        tags: values.tags,
                        coverImage: coverImageBlob,
                        publishedAt: originalDoc.publishedAt, // Preserve publishedAt
                        updatedAt: new Date().toISOString(),
                    }
                }
            });

            if (!putRes.ok) throw new Error('Failed to update record');

            notifications.show({
                title: t('update_success'),
                message: t('update_success_message'),
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            router.push(`/sites/${pubRkey}`);
        } catch (err) {
            console.error(err);
            notifications.show({
                title: t('update_error'),
                message: t('update_error_message'),
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading || loading) {
        return <Center h="50vh"><Loader /></Center>;
    }

    if (!publication || !originalDoc || !initialValues) {
        return <Container><Text>Not Found</Text></Container>;
    }

    return (
        <Container size="sm" py="xl">
            <ArticleForm
                initialValues={initialValues}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                submitLabel={t('update')}
                mode="edit"
                titleLabel={t('title')}
            />
        </Container>
    );
}
