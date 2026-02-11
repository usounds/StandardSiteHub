"use client";

import { useEffect, useState } from 'react';
import { Container, Title, TextInput, Textarea, Button, Stack, FileInput, Loader, Center, Text, Switch, Group, Image } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useForm } from '@mantine/form';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SiteStandardPublication } from '@/lib/lexicons/site-standard-publication';
import { fetchOGP, fetchIconAsBase64 } from '@/app/actions/ogp';

export default function EditSitePage() {
    const t = useTranslations('EditSite');
    const { agent, session, isLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const rkey = params.rkey as string;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [existingIcon, setExistingIcon] = useState<any>(null);
    const [loadingOGP, setLoadingOGP] = useState(false);
    const [ogpIconPreview, setOgpIconPreview] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            url: '',
            name: '',
            description: '',
            icon: null as File | null,
            showInDiscover: true,
        },
        validate: {
            url: (value) => {
                if (!value) return t('validation_required');
                try { new URL(value); } catch { return t('validation_url'); }
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
                const data = (res.data as any).value as unknown as SiteStandardPublication;
                form.setValues({
                    url: data.url || '',
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
            let iconBlobRef = existingIcon;
            if (values.icon) {
                const uploaded = await agent.post('com.atproto.repo.uploadBlob', {
                    input: values.icon,
                    headers: {
                        'Content-Type': values.icon.type,
                    }
                });
                iconBlobRef = (uploaded.data as any).blob;
            }

            await agent.post('com.atproto.repo.putRecord' as any, {
                input: {
                    repo: session.info.sub,
                    collection: 'site.standard.publication',
                    rkey: rkey,
                    record: {
                        $type: 'site.standard.publication',
                        url: values.url,
                        name: values.name,
                        description: values.description,
                        icon: iconBlobRef,
                        preferences: { showInDiscover: values.showInDiscover },
                        createdAt: new Date().toISOString(),
                    }
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

    if (!session) {
        return <Container><Text>{t('please_login')}</Text></Container>;
    }

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
                        description={existingIcon ? t('icon_exists') : undefined}
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

                    <Button type="submit" loading={submitting}>{t('save')}</Button>
                </Stack>
            </form>
        </Container>
    );
}
