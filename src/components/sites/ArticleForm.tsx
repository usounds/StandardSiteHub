"use client";

import { useState } from 'react';
import { Title, TextInput, Textarea, Button, Stack, Group, TagsInput, FileInput, Text, Collapse, Image as MantineImage } from '@mantine/core';
import { createDocumentFormSchema } from '@/lib/validation/document';
import { useForm } from '@mantine/form';
import { verifyDocument } from '@/app/actions/verify';
import { fetchImageAsBase64 } from '@/app/actions/ogp';
import { useTranslations } from 'next-intl';
import * as TID from '@atcute/tid';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconLoader2, IconCircleCheck, IconCircleX, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { VerificationResult } from '@/app/actions/verify';

export interface FormValues {
    siteUrl: string;
    rkey: string;
    title: string;
    description: string;
    path: string;
    content: string;
    tags: string[];
    coverImage: File | null;
}

interface ArticleFormProps {
    initialValues: FormValues;
    onSubmit: (values: FormValues) => Promise<void>;
    isSubmitting: boolean;
    submitLabel: string;
    mode: 'create' | 'edit';
    titleLabel?: string;
}

/**
 * Resize an image using browser canvas to fit within maxSizeBytes.
 * Converts to JPEG with progressively lower quality.
 */
async function resizeImageToFit(base64: string, mimeType: string, maxSizeBytes: number): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Scale down if needed (try multiple quality levels first, then scale)
            const tryEncode = (scale: number, quality: number): Blob | null => {
                canvas.width = Math.round(width * scale);
                canvas.height = Math.round(height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) return null;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Use toBlob synchronously via toDataURL
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const binaryStr = atob(dataUrl.split(',')[1]);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                return new Blob([bytes], { type: 'image/jpeg' });
            };

            // Try different quality/scale combinations
            const attempts: [number, number][] = [
                [1.0, 0.85], [1.0, 0.7], [1.0, 0.5],
                [0.75, 0.85], [0.75, 0.7], [0.75, 0.5],
                [0.5, 0.85], [0.5, 0.7], [0.5, 0.5],
            ];

            for (const [scale, quality] of attempts) {
                const blob = tryEncode(scale, quality);
                if (blob && blob.size <= maxSizeBytes) {
                    resolve(new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
                    return;
                }
            }

            // Last resort: smallest attempt
            const lastBlob = tryEncode(0.5, 0.3);
            if (lastBlob) {
                resolve(new File([lastBlob], 'cover.jpg', { type: 'image/jpeg' }));
            } else {
                reject(new Error('Failed to resize image'));
            }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = `data:${mimeType};base64,${base64}`;
    });
}

export function ArticleForm({ initialValues, onSubmit, isSubmitting, submitLabel, mode, titleLabel }: ArticleFormProps) {
    const t = useTranslations(mode === 'create' ? 'NewArticle' : 'EditArticle');
    const tVal = useTranslations('Validation');
    const tStep = useTranslations('SiteDetail');

    const translateStepName = (key: string) => {
        const tKey = `step_${key}` as any;
        try { return tStep(tKey); } catch { return key; }
    };
    const translateStepMessage = (key: string, status: string, params?: Record<string, string>) => {
        const tKey = `step_${key}_${status}` as any;
        try { return tStep(tKey, params); } catch { return params ? Object.values(params).join(', ') : ''; }
    };
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [showSteps, setShowSteps] = useState(false);
    const [ogpImagePreview, setOgpImagePreview] = useState<string | null>(null);

    // Simple Zod resolver for Mantine
    const validate = (values: FormValues) => {
        const schema = createDocumentFormSchema((key) => tVal(key));
        const result = schema.safeParse(values);
        if (result.success) return {};

        // Transform Zod errors to Mantine errors
        const errors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
            const path = issue.path.join('.');
            errors[path] = issue.message;
        });
        return errors;
    };

    const form = useForm<FormValues>({
        initialValues,
        validate,
    });

    const handleVerify = async () => {
        if (!form.values.siteUrl) return;
        setVerifying(true);
        setVerificationResult(null);
        setShowSteps(true);
        try {
            const res = await verifyDocument(form.values.siteUrl);
            setVerificationResult(res);

            if (res.success) {
                // Only update rkey in create mode
                if (mode === 'create') {
                    if (res.rkey) {
                        form.setFieldValue('rkey', res.rkey);
                    } else {
                        form.setFieldValue('rkey', TID.now());
                    }
                }

                if (res.title) form.setFieldValue('title', res.title);
                if (res.description) form.setFieldValue('description', res.description);

                try {
                    const url = new URL(form.values.siteUrl);
                    form.setFieldValue('path', url.pathname + url.search + url.hash);
                } catch { }

                // Fetch OGP image for cover image
                if (res.image) {
                    try {
                        const imageData = await fetchImageAsBase64(res.image);
                        if (imageData) {
                            setOgpImagePreview(`data:${imageData.mimeType};base64,${imageData.base64}`);

                            if (imageData.needsResize) {
                                // Resize on client using canvas
                                const resizedFile = await resizeImageToFit(imageData.base64, imageData.mimeType, 900_000);
                                form.setFieldValue('coverImage', resizedFile);
                            } else {
                                // Use original directly
                                const byteString = atob(imageData.base64);
                                const ab = new ArrayBuffer(byteString.length);
                                const ia = new Uint8Array(ab);
                                for (let i = 0; i < byteString.length; i++) {
                                    ia[i] = byteString.charCodeAt(i);
                                }
                                const blob = new Blob([ab], { type: imageData.mimeType });
                                const file = new File([blob], `cover.${imageData.mimeType.split('/')[1] || 'jpg'}`, { type: imageData.mimeType });
                                form.setFieldValue('coverImage', file);
                            }
                        }
                    } catch (imgErr) {
                        console.error('Failed to fetch OGP image:', imgErr);
                    }
                }

                notifications.show({
                    title: t('verify_success'),
                    message: t('verify_success_message'),
                    color: 'green',
                    icon: <IconCheck size={16} />,
                });
                setShowSteps(false); // Hide on success
            } else {
                notifications.show({
                    title: t('verify_error'),
                    message: t('verify_error_message'),
                    color: 'red',
                    icon: <IconX size={16} />,
                });
                setShowSteps(true); // Keep open on failure
            }
        } catch (e) {
            console.error(e);
            notifications.show({
                title: t('verify_error'),
                message: t('verify_error_message'),
                color: 'red',
                icon: <IconX size={16} />,
            });
            setShowSteps(true);
        } finally {
            setVerifying(false);
        }
    };

    return (
        <>
            {titleLabel && <Title mb="lg">{titleLabel}</Title>}
            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack>
                    <Group align="end">
                        <TextInput
                            label={t('article_url')}
                            placeholder="https://mysite.com/post/1"
                            style={{ flex: 1 }}
                            readOnly={mode === 'edit'}
                            {...form.getInputProps('siteUrl')}
                        />
                        <Button onClick={handleVerify} loading={verifying} variant="light">{t('verify')}</Button>
                    </Group>

                    {verificationResult?.success && !verificationResult?.fullyVerified && (
                        <Text size="xs" c="orange" fw={500}>
                            {t('partially_verified_note') || 'ページ情報の取得に成功しましたが、記事の検証は未完了です。このまま作成できます。'}
                        </Text>
                    )}

                    {verificationResult?.steps && (
                        <Stack gap="xs">
                            <Group justify="space-between" onClick={() => setShowSteps(!showSteps)} style={{ cursor: 'pointer' }}>
                                <Text size="sm" fw={500} c="dimmed">
                                    {verificationResult.fullyVerified ? 'Protocol Verification Status' : 'Verification & Metadata Status'}
                                </Text>
                                {showSteps ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                            </Group>
                            <Collapse in={showSteps}>
                                <Stack gap="xs" pl="sm">
                                    {verificationResult.steps.map((step, idx) => (
                                        <Group key={idx} gap="xs">
                                            {step.status === 'success' ? (
                                                <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
                                            ) : step.status === 'failure' ? (
                                                <IconCircleX size={16} color="var(--mantine-color-red-6)" />
                                            ) : (
                                                <IconLoader2 size={16} className="animate-spin" />
                                            )}
                                            <Stack gap={0}>
                                                <Text size="xs" fw={500}>{translateStepName(step.key)}</Text>
                                                <Text size="xs" c="dimmed">{translateStepMessage(step.key, step.status, step.params)}</Text>
                                            </Stack>
                                        </Group>
                                    ))}
                                </Stack>
                            </Collapse>
                        </Stack>
                    )}

                    <TextInput
                        label={t('rkey')}
                        description={t('rkey_description')}
                        readOnly
                        {...form.getInputProps('rkey')}
                    />

                    <TextInput
                        label={t('path')}
                        placeholder="/post/1"
                        readOnly={mode === 'edit'}
                        {...form.getInputProps('path')}
                    />

                    <TextInput
                        label={t('article_title')}
                        {...form.getInputProps('title')}
                    />

                    <Textarea
                        label={t('article_description')}
                        {...form.getInputProps('description')}
                    />

                    <TagsInput
                        label={t('tags')}
                        placeholder={t('tags_placeholder')}
                        {...form.getInputProps('tags')}
                    />

                    <FileInput
                        label={t('cover_image')}
                        placeholder={t('cover_image_placeholder')}
                        accept="image/*"
                        clearable
                        {...form.getInputProps('coverImage')}
                    />

                    {ogpImagePreview && (
                        <Group>
                            <MantineImage src={ogpImagePreview} w={200} h={120} radius="sm" fit="cover" alt="OGP Cover" />
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">OGP Image</Text>
                                {form.values.coverImage && (
                                    <Text size="xs" c="green">{`${(form.values.coverImage.size / 1024).toFixed(0)} KB`}</Text>
                                )}
                            </Stack>
                        </Group>
                    )}
                    <Textarea
                        label={t('content')}
                        minRows={4}
                        {...form.getInputProps('content')}
                    />

                    <Button
                        type="submit"
                        loading={isSubmitting}
                        disabled={mode === 'create' && !verificationResult?.success}
                    >
                        {submitLabel}
                    </Button>
                </Stack>
            </form>
        </>
    );
}
