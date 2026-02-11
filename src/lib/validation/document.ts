
import { z } from 'zod';

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter("ja", { granularity: "grapheme" }) : null;

// Helper to count graphemes
const countGraphemes = (str: string) => {
    if (!segmenter) return str.length; // Fallback to char length if Intl.Segmenter is missing
    return [...segmenter.segment(str)].length;
};

// Custom Zod refinement for graphemes
const maxGraphemes = (limit: number) => (val: string) => countGraphemes(val) <= limit;

export const createDocumentFormSchema = (t: (key: string) => string) => z.object({
    siteUrl: z.string().url(t('url_invalid')),
    rkey: z.string().min(1, t('required')),
    path: z.string()
        .min(1, t('required'))
        .startsWith('/', t('path_start')),
    title: z.string()
        .min(1, t('required'))
        .max(5000, t('title_max'))
        .refine(maxGraphemes(500), t('title_max_graphemes')),
    description: z.string()
        .max(30000, t('description_max'))
        .refine(maxGraphemes(3000), t('description_max_graphemes'))
        .optional(),
    content: z.string().optional(), // Content is textContent
    coverImage: z.custom<File>((val) => {
        if (!val) return true;
        return val instanceof File;
    }).refine((file) => {
        if (!file) return true;
        return file.size <= 1024 * 1024; // 1MB
    }, t('image_size'))
        .refine((file) => {
            if (!file) return true;
            return file.type.startsWith('image/');
        }, t('image_type'))
        .nullable().optional(),
    tags: z.array(
        z.string()
            .max(1280, t('tag_max'))
            .refine(maxGraphemes(128), t('tag_max_graphemes'))
            .regex(/^[^#]/, t('tag_format'))
    ).max(64, t('tags_max_count')).optional()
});

export type DocumentFormValues = z.infer<ReturnType<typeof createDocumentFormSchema>>;
