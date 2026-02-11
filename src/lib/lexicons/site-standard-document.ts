import { z } from 'zod';

const blobRefSchema = z.object({
    $type: z.literal('blob'),
    ref: z.any(),
    mimeType: z.string(),
    size: z.number()
});

export const siteStandardDocumentSchema = z.object({
    $type: z.literal('site.standard.document').default('site.standard.document'),
    site: z.string().url(),
    path: z.string().startsWith('/'),
    title: z.string().max(5000),
    description: z.string().max(30000).optional(),
    coverImage: blobRefSchema.optional(),
    content: z.union([
        z.object({
            $type: z.literal('app.bsky.feed.post'), // Example reference
            uri: z.string(),
            cid: z.string()
        }),
        z.object({
            textContent: z.string() // As per user request "textContent"
        }).transform(val => ({ $type: 'site.standard.content.text', ...val })),
        z.record(z.string(), z.any()) // Fallback
    ]),
    // User definition says: 
    // textContent: plain text representation...
    // content: open union.
    // We'll adjust as needed.
    tags: z.array(z.string()).optional(),
    publishedAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
});

export type SiteStandardDocument = z.infer<typeof siteStandardDocumentSchema>;
