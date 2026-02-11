"use client";

import { useState } from 'react';
import { Title, TextInput, Textarea, Button, Stack, Group, TagsInput, FileInput, Text, Collapse } from '@mantine/core';
import { createDocumentFormSchema } from '@/lib/validation/document';
import { useForm } from '@mantine/form';
import { verifyDocument } from '@/app/actions/verify';
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

export function ArticleForm({ initialValues, onSubmit, isSubmitting, submitLabel, mode, titleLabel }: ArticleFormProps) {
    const t = useTranslations('NewArticle'); // Reuse NewArticle translations for common labels
    const tVal = useTranslations('Validation');
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [showSteps, setShowSteps] = useState(false);

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
                    form.setFieldValue('path', url.pathname);
                } catch { }

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
                            {t('partially_verified_note') || 'ページ情報の取得に成功しましたが、SSHプロトコルの検証は未完了です。このまま作成できます。'}
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
                                                <Text size="xs" fw={500}>{step.name}</Text>
                                                {step.message && <Text size="xs" c="dimmed">{step.message}</Text>}
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
