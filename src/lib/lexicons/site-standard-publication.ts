import { z } from 'zod';

// Minimal definition for BlobRef from @atproto/lexicon context, 
// strictly speaking we should import it if available, but for now we'll define a compatible schema.
const blobRefSchema = z.object({
    $type: z.literal('blob'),
    ref: z.any(), // cid
    mimeType: z.string(),
    size: z.number()
});

export const siteStandardPublicationSchema = z.object({
    $type: z.literal('site.standard.publication').default('site.standard.publication'),
    url: z.string().url(),
    icon: blobRefSchema.optional(), // Can be optional in input form, but required in lexicon.
    name: z.string().max(5000),
    description: z.string().max(30000).optional(),
    preferences: z.object({
        showInDiscover: z.boolean().optional(),
    }).optional(),
    createdAt: z.string().datetime(),
});

export type SiteStandardPublication = z.infer<typeof siteStandardPublicationSchema>;
