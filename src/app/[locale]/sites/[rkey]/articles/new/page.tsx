"use client";

import { useState } from 'react';
import { Container } from '@mantine/core';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as TID from '@atcute/tid';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

import type { Main as SiteStandardDocument } from '@/lib/lexicons/types/site/standard/document';
import type { Main as SiteStandardPublication } from '@/lib/lexicons/types/site/standard/publication';
import { ArticleForm, FormValues } from '@/components/sites/ArticleForm';

// Define BlobRef locally to match the generated Lexicon types and API response
interface BlobRef {
    $type: 'blob';
    ref: { $link: string };
    mimeType: string;
    size: number;
}

export default function NewArticlePage() {
    const t = useTranslations('NewArticle');
    const { agent, session } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pubRkey = params.rkey as string;

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (values: FormValues) => {
        if (!agent || !session) return;

        setSubmitting(true);
        try {
            let coverImageBlob: BlobRef | undefined = undefined;
            if (values.coverImage) {
                const res = await agent.post('com.atproto.repo.uploadBlob', {
                    body: values.coverImage,
                    headers: {
                        'Content-Type': values.coverImage.type,
                    }
                });

                if (!res.ok) {
                    throw new Error('Failed to upload blob');
                }

                // Ensure the response data matches BlobRef structure
                const data = res.data;
                if (data && typeof data === 'object' && 'blob' in data) {
                    coverImageBlob = (data as { blob: BlobRef }).blob;
                }
            }

            const pubRes = await agent.get('com.atproto.repo.getRecord', {
                params: {
                    repo: session.info.sub,
                    collection: 'site.standard.publication',
                    rkey: pubRkey,
                }
            });

            if (!pubRes.ok) {
                throw new Error('Failed to fetch publication record');
            }

            // TypeScript might still complain about data being null if inference is weak
            if (!pubRes.data) {
                throw new Error('No data in response');
            }

            // Validate that we got a publication record
            const record = pubRes.data.value;
            if (!record || typeof record !== 'object' || !('$type' in record) || record.$type !== 'site.standard.publication') {
                throw new Error('Invalid publication record');
            }

            // pubUri is available on the top level response data for getRecord
            const pubUri = pubRes.data.uri;

            const documentRecord: SiteStandardDocument = {
                $type: 'site.standard.document',
                site: pubUri,
                path: values.path,
                title: values.title,
                description: values.description || undefined,
                content: {
                    $type: 'site.standard.content.text',
                    textContent: values.content
                },
                tags: values.tags.length > 0 ? values.tags : undefined,
                coverImage: coverImageBlob,
                publishedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const writeRes = await agent.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: session.info.sub,
                    writes: [{
                        $type: 'com.atproto.repo.applyWrites#create',
                        collection: 'site.standard.document',
                        rkey: values.rkey || TID.now(),
                        value: documentRecord
                    }]
                }
            });

            if (!writeRes.ok) {
                throw new Error('Failed to create article');
            }

            notifications.show({
                title: t('create_success'),
                message: t('create_success_message'),
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            router.push(`/sites/${pubRkey}`);
        } catch (err) {
            console.error(err);
            notifications.show({
                title: t('create_error'),
                message: t('create_error_message'),
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container size="sm" py="xl">
            <ArticleForm
                initialValues={{
                    siteUrl: '',
                    rkey: '',
                    title: '',
                    description: '',
                    path: '',
                    content: '',
                    tags: [],
                    coverImage: null,
                }}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
                submitLabel={t('create')}
                mode="create"
                titleLabel={t('title')}
            />
        </Container>
    );
}
