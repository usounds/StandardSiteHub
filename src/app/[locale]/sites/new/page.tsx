"use client";

import { useState } from 'react';
import { Container } from '@mantine/core';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/routing';
import { SiteForm, SiteFormValues } from '@/components/sites/SiteForm';
import { SiteStandardPublication } from '@/lib/lexicons/site-standard-publication';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function NewSitePage() {
    const { agent, session } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (values: SiteFormValues) => {
        if (!agent || !session) return;
        setSubmitting(true);
        try {
            let iconBlobRef: SiteStandardPublication['icon'] = undefined;
            if (values.icon) {
                const uploaded = await agent.post('com.atproto.repo.uploadBlob', {
                    input: values.icon,
                    headers: {
                        'Content-Type': values.icon.type,
                    }
                });
                if (!uploaded.ok || !uploaded.data) throw new Error('Failed to upload blob');
                iconBlobRef = uploaded.data.blob as SiteStandardPublication['icon'];
            }

            const record: SiteStandardPublication = {
                $type: 'site.standard.publication',
                url: values.url as `${string}:${string}`,
                name: values.name,
                description: values.description || undefined,
                icon: iconBlobRef,
                preferences: {
                    showInDiscover: values.showInDiscover
                },
                createdAt: new Date().toISOString(),
            };

            await agent.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: session.info.sub,
                    writes: [{
                        $type: 'com.atproto.repo.applyWrites#create',
                        collection: 'site.standard.publication',
                        rkey: values.rkey,
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

    return (
        <AuthGuard>
            <Container size="sm" py={{ base: 'lg', sm: 'xl' }} className="app-page">
                <SiteForm
                    initialValues={{
                        url: '',
                        rkey: '',
                        name: '',
                        description: '',
                        icon: null,
                        showInDiscover: true,
                    }}
                    onSubmit={handleSubmit}
                    isSubmitting={submitting}
                    mode="create"
                />
            </Container>
        </AuthGuard>
    );
}
