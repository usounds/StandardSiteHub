"use client";

import { useState, useEffect } from 'react';
import { Container, Center, Loader, Text } from '@mantine/core';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import { SiteStandardPublication } from '@/lib/lexicons/site-standard-publication';
import { SiteStandardDocument } from '@/lib/lexicons/site-standard-document';
import { ArticleForm, FormValues } from '@/components/sites/ArticleForm';
import { AuthGuard } from '@/components/auth/AuthGuard';

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
            queueMicrotask(() => setLoading(false));
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

                if (!pubRes.ok || !pubRes.data) throw new Error('Failed to fetch publication');

                const pubValue = pubRes.data.value as SiteStandardPublication;
                const pubUri = String(pubRes.data.uri);
                setPublication({ uri: pubUri, value: pubValue });

                // Fetch Document
                const docRes = await agent!.get('com.atproto.repo.getRecord', {
                    params: {
                        repo: session!.info.sub,
                        collection: 'site.standard.document',
                        rkey: articleRkey,
                    }
                });

                if (!docRes.ok || !docRes.data) throw new Error('Failed to fetch document');

                const docValue = docRes.data.value as SiteStandardDocument;
                setOriginalDoc(docValue);

                // Extract textContent
                const textContent = docValue.textContent || '';

                // Populate form
                setInitialValues({
                    siteUrl: pubValue.url ? `${pubValue.url}${docValue.path}` : '',
                    rkey: articleRkey,
                    title: docValue.title,
                    description: docValue.description || '',
                    path: docValue.path || '',
                    content: textContent,
                    tags: docValue.tags || [],
                    coverImage: null,
                });

            } catch (err) {
                console.error('Failed to fetch data', err);
            } finally {
                setLoading(false);
            }
        }
        queueMicrotask(() => void init());
    }, [agent, session, isLoading, pubRkey, articleRkey]);

    const handleSubmit = async (values: FormValues) => {
        if (!agent || !session || !publication || !originalDoc) return;
        setSubmitting(true);
        try {
            let coverImageBlob = originalDoc.coverImage;

            if (values.coverImage) {
                const res = await agent.post('com.atproto.repo.uploadBlob', {
                    input: values.coverImage,
                    headers: {
                        'Content-Type': values.coverImage.type,
                    }
                });

                if (!res.ok || !res.data) throw new Error('Failed to upload blob');
                coverImageBlob = res.data.blob as SiteStandardDocument['coverImage'];
            }

            const documentRecord: SiteStandardDocument = {
                $type: 'site.standard.document',
                site: publication.uri as `${string}:${string}`,
                path: values.path,
                title: values.title,
                description: values.description || undefined,
                textContent: values.content,
                tags: values.tags.length > 0 ? values.tags : undefined,
                coverImage: coverImageBlob,
                publishedAt: originalDoc.publishedAt,
                updatedAt: new Date().toISOString(),
            };

            await agent.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: session.info.sub,
                    writes: [{
                        $type: 'com.atproto.repo.applyWrites#update',
                        collection: 'site.standard.document',
                        rkey: articleRkey,
                        value: documentRecord
                    }]
                }
            });

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
        <AuthGuard>
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
        </AuthGuard>
    );
}
