"use client";

import { useEffect, useState } from 'react';
import { Container, Title, Loader, Center, Text } from '@mantine/core';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Main as SiteStandardPublication } from '@/lib/lexicons/types/site/standard/publication';
import { SiteForm, SiteFormValues } from '@/components/sites/SiteForm';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function EditSitePage() {
    const t = useTranslations('EditSite');
    const { agent, session, isLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const rkey = params.rkey as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [existingIcon, setExistingIcon] = useState<SiteStandardPublication['icon']>(undefined);
    const [initialValues, setInitialValues] = useState<SiteFormValues | null>(null);

    useEffect(() => {
        if (isLoading) return;
        if (!session || !agent) {
            setLoading(false);
            return;
        }

        async function fetchSite() {
            try {
                const res = await agent!.get('com.atproto.repo.getRecord', {
                    params: {
                        repo: session!.info.sub,
                        collection: 'site.standard.publication',
                        rkey: rkey,
                    }
                });

                if (!res.ok || !res.data) throw new Error('Failed to fetch site');

                const data = res.data.value as SiteStandardPublication;
                setInitialValues({
                    url: data.url || '',
                    rkey: rkey,
                    name: data.name || '',
                    description: data.description || '',
                    icon: null,
                    showInDiscover: data.preferences?.showInDiscover ?? true,
                });
                if (data.icon) {
                    setExistingIcon(data.icon);
                }
            } catch (err) {
                console.error('Failed to fetch site', err);
            } finally {
                setLoading(false);
            }
        }
        fetchSite();
    }, [agent, session, isLoading, rkey]);

    const handleSubmit = async (values: SiteFormValues) => {
        if (!agent || !session) return;
        setSubmitting(true);
        try {
            let iconBlobRef = existingIcon;
            if (values.icon) {
                const uploaded = await agent.post('com.atproto.repo.uploadBlob', {
                    input: values.icon,
                    headers: {
                        'Content-Type': values.icon.type,
                    }
                });
                if (!uploaded.ok || !uploaded.data) throw new Error('Failed to upload blob');
                iconBlobRef = uploaded.data.blob;
            }

            const record: SiteStandardPublication = {
                $type: 'site.standard.publication',
                url: values.url as `${string}:${string}`,
                name: values.name,
                description: values.description || undefined,
                icon: iconBlobRef,
                preferences: {
                    $type: 'site.standard.publication#preferences',
                    showInDiscover: values.showInDiscover
                },
            };

            await agent.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: session.info.sub,
                    writes: [{
                        $type: 'com.atproto.repo.applyWrites#update',
                        collection: 'site.standard.publication',
                        rkey: rkey,
                        value: record
                    }]
                }
            });

            router.push('/sites');
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading || loading) {
        return <Center h="50vh"><Loader /><Text ml="sm">{t('loading')}</Text></Center>;
    }

    if (!initialValues) {
        return <Container><Text>Not Found</Text></Container>;
    }

    return (
        <AuthGuard>
            <Container size="sm" py="xl">
                <Title mb="lg">{t('title')}</Title>
                <SiteForm
                    initialValues={initialValues}
                    onSubmit={handleSubmit}
                    isSubmitting={submitting}
                    mode="edit"
                    existingIcon={existingIcon}
                />
            </Container>
        </AuthGuard>
    );
}
