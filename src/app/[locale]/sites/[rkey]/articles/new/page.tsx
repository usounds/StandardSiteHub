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
import { ArticleForm, FormValues } from '@/components/sites/ArticleForm';
import { AuthGuard } from '@/components/auth/AuthGuard';

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
            let coverImageBlob: SiteStandardDocument['coverImage'] = undefined;
            if (values.coverImage) {
                const res = await agent.post('com.atproto.repo.uploadBlob', {
                    input: values.coverImage,
                    headers: {
                        'Content-Type': values.coverImage.type,
                    }
                });

                if (!res.ok || !res.data) throw new Error('Failed to upload blob');
                coverImageBlob = res.data.blob;
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

            if (!pubRes.data) {
                throw new Error('No data in response');
            }

            const record = pubRes.data.value;
            if (!record || typeof record !== 'object' || !('$type' in record) || record.$type !== 'site.standard.publication') {
                throw new Error('Invalid publication record');
            }

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
        <AuthGuard>
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
        </AuthGuard>
    );
}
