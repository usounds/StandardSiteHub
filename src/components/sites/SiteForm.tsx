"use client";

import { useState } from 'react';
import { TextInput, Textarea, Button, Stack, FileInput, Group, Image, Text, Switch } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslations } from 'next-intl';
import { fetchOGP, fetchIconAsBase64 } from '@/app/actions/ogp';
import { notifications } from '@mantine/notifications';

export interface SiteFormValues {
    url: string;
    rkey: string;
    name: string;
    description: string;
    icon: File | null;
    showInDiscover: boolean;
}

interface SiteFormProps {
    initialValues: SiteFormValues;
    onSubmit: (values: SiteFormValues) => Promise<void>;
    isSubmitting: boolean;
    mode: 'create' | 'edit';
    existingIcon?: any;
}

export function SiteForm({ initialValues, onSubmit, isSubmitting, mode, existingIcon }: SiteFormProps) {
    const t = useTranslations(mode === 'create' ? 'NewSite' : 'EditSite');
    const [loadingOGP, setLoadingOGP] = useState(false);
    const [ogpIconPreview, setOgpIconPreview] = useState<string | null>(null);

    const form = useForm<SiteFormValues>({
        initialValues,
        validate: {
            url: (value) => {
                if (!value) return t('validation_required');
                try {
                    const url = new URL(value);
                    if (mode === 'create' && url.pathname !== '/' && url.pathname !== '') return t('validation_url_path');
                } catch { return t('validation_url'); }
                return null;
            },
            rkey: (value) => {
                if (mode === 'create') {
                    if (!value) return t('validation_required');
                    if (value.length > 15) return t('validation_rkey_max');
                    if (!/^[a-z0-9]+$/.test(value)) return t('validation_rkey_format');
                }
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

    const handleFetchOGP = async () => {
        let url = form.values.url;
        if (!url) return;

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

    return (
        <form onSubmit={form.onSubmit(onSubmit)}>
            <Stack>
                <Group align="end">
                    <TextInput
                        label={t('site_url')}
                        placeholder="https://mysite.com"
                        required
                        style={{ flex: 1 }}
                        readOnly={mode === 'edit'}
                        {...form.getInputProps('url')}
                        onChange={(event) => {
                            const value = event.currentTarget.value;
                            form.setFieldValue('url', value);
                            if (mode === 'create') {
                                try {
                                    const url = new URL(value);
                                    const hostname = url.hostname;
                                    const firstPart = hostname.split('.')[0];
                                    const sanitized = firstPart.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
                                    if (sanitized) {
                                        form.setFieldValue('rkey', sanitized);
                                    }
                                } catch { }
                            }
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
                </Group>

                {mode === 'create' && (
                    <TextInput
                        label={t('rkey')}
                        description={t('rkey_description')}
                        placeholder="myblog"
                        required
                        maxLength={15}
                        {...form.getInputProps('rkey')}
                    />
                )}

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
                    description={mode === 'edit' && existingIcon ? t('icon_exists') : undefined}
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

                <Button type="submit" loading={isSubmitting}>
                    {mode === 'create' ? t('create') : t('save')}
                </Button>
            </Stack>
        </form>
    );
}
