"use client";

import { useState } from 'react';
import { Container, Title, TextInput, Textarea, Button, Stack, FileInput, Loader, Switch, Group, Image, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import { fetchOGP, fetchIconAsBase64 } from '@/app/actions/ogp';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function NewSitePage() {
    const t = useTranslations('NewSite');
    const { agent, session } = useAuth();
    const router = useRouter();
    const [loadingOGP, setLoadingOGP] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            url: '',
            rkey: '',
            name: '',
            description: '',
            icon: null as File | null,
            showInDiscover: true,
        },
        validate: {
            url: (value) => {
                if (!value) return t('validation_required');
                try {
                    const url = new URL(value);
                    if (url.pathname !== '/' && url.pathname !== '') return t('validation_url_path');
                } catch { return t('validation_url'); }
                return null;
            },
            rkey: (value) => {
                if (!value) return t('validation_required');
                if (value.length > 15) return t('validation_rkey_max');
                if (!/^[a-z0-9]+$/.test(value)) return t('validation_rkey_format');
                return null;
            },
            name: (value) => {
                if (!value) return t('validation_required');
                if (value.length > 5000) return t('validation_name_max');
                return null;
            },
            description: (value) => {
                if (value && value.length > 30000) return t('validation_description_max');
                return null;
            },
            icon: (value) => {
                if (value) {
                    if (value.size > 1_000_000) return t('validation_icon_size');
                    if (!value.type.startsWith('image/')) return t('validation_icon_type');
                }
                return null;
            },
        },
    });

    const [ogpIconPreview, setOgpIconPreview] = useState<string | null>(null);

    const handleFetchOGP = async () => {
        let url = form.values.url;
        if (!url) return;

        // Simple normalization: prepend https:// if it looks like a domain without protocol
        if (!/^https?:\/\//i.test(url) && url.includes('.')) {
            url = `https://${url}`;
            form.setFieldValue('url', url);
        }

        setLoadingOGP(true);
        try {
            const ogp = await fetchOGP(url);
            if (ogp && (ogp.title || ogp.description || ogp.icon || ogp.image)) {
                if (ogp.title) form.setFieldValue('name', ogp.title);
                if (ogp.description) form.setFieldValue('description', ogp.description);

                // Try to fetch icon as File
                const iconUrl = ogp.icon || ogp.image;
                if (iconUrl) {
                    setOgpIconPreview(iconUrl);
                    const iconData = await fetchIconAsBase64(iconUrl);
                    if (iconData) {
                        const byteString = atob(iconData.base64);
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        const blob = new Blob([ab], { type: iconData.mimeType });
                        const ext = iconData.mimeType.split('/')[1] || 'png';
                        const file = new File([blob], `icon.${ext}`, { type: iconData.mimeType });
                        form.setFieldValue('icon', file);
                    }
                }
            } else {
                notifications.show({
                    title: t('fetch_ogp_failed'),
                    message: t('fetch_ogp_failed_message'),
                    color: 'yellow',
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingOGP(false);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        if (!agent || !session) return;
        setSubmitting(true);
        try {
            let iconBlobRef = undefined;
            if (values.icon) {
                const uploaded = await agent.post('com.atproto.repo.uploadBlob', {
                    input: values.icon,
                    headers: {
                        'Content-Type': values.icon.type,
                    }
                });
                iconBlobRef = (uploaded.data as any).blob;
            }

            await agent.post('com.atproto.repo.applyWrites' as any, {
                input: {
                    repo: session.info.sub,
                    writes: [{
                        $type: 'com.atproto.repo.applyWrites#create',
                        collection: 'site.standard.publication',
                        rkey: values.rkey,
                        value: {
                            $type: 'site.standard.publication',
                            url: values.url,
                            name: values.name,
                            description: values.description,
                            icon: iconBlobRef,
                            preferences: { showInDiscover: values.showInDiscover },
                            createdAt: new Date().toISOString(),
                        }
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
        <Container size="sm" py="xl">
            <Title mb="lg">{t('title')}</Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <TextInput
                        label={t('site_url')}
                        placeholder="https://mysite.com"
                        required
                        {...form.getInputProps('url')}
                        onChange={(event) => {
                            const value = event.currentTarget.value;
                            form.setFieldValue('url', value);
                            try {
                                const url = new URL(value);
                                const hostname = url.hostname;
                                const firstPart = hostname.split('.')[0];
                                const sanitized = firstPart.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
                                if (sanitized) {
                                    form.setFieldValue('rkey', sanitized);
                                }
                            } catch { }
                        }}
                    />
                    <Button
                        variant="light"
                        onClick={handleFetchOGP}
                        loading={loadingOGP}
                        disabled={!form.values.url}
                    >
                        {t('fetch_ogp')}
                    </Button>

                    <TextInput
                        label={t('rkey')}
                        description={t('rkey_description')}
                        placeholder="myblog"
                        required
                        maxLength={15}
                        {...form.getInputProps('rkey')}
                    />

                    <TextInput
                        label={t('name')}
                        required
                        maxLength={5000}
                        {...form.getInputProps('name')}
                    />

                    <Textarea
                        label={t('description')}
                        maxLength={30000}
                        {...form.getInputProps('description')}
                    />

                    <FileInput
                        label={t('icon')}
                        accept="image/*"
                        {...form.getInputProps('icon')}
                    />
                    {ogpIconPreview && (
                        <Group>
                            <Image src={ogpIconPreview} w={64} h={64} radius="sm" alt="OGP Icon" />
                            <Text size="xs" c="dimmed">{t('ogp_icon_fetched')}</Text>
                        </Group>
                    )}

                    <Switch
                        label={t('show_in_discover')}
                        description={t('show_in_discover_description')}
                        {...form.getInputProps('showInDiscover', { type: 'checkbox' })}
                    />

                    <Button type="submit" loading={submitting}>{t('create')}</Button>
                </Stack>
            </form>
        </Container>
    );
}
