import { defineLexiconConfig } from '@atcute/lex-cli';

export default defineLexiconConfig({
    files: ['lexicons/**/*.json'],
    outdir: 'src/lib/lexicons/',
    pull: {
        outdir: 'lexicons/',
        sources: [
            {
                type: 'atproto',
                mode: 'authority',
                authority: 'did:plc:re3ebnp5v7ffagz6rb6xfei4',
                pattern: ['site.standard.*'],
            },
        ],
    },

    mappings: [
        {
            nsid: ['com.atproto.*'],
            imports: (nsid) => {
                const specifier = nsid.slice('com.atproto.'.length).replaceAll('.', '/');
                return { type: 'namespace', from: `@atcute/atproto/types/${specifier}` };
            },
        },
    ]
});
