import {
    CompositeHandleResolver,
    DohJsonHandleResolver,
    WellKnownHandleResolver,
} from '@atcute/identity-resolver';
import {
    CompositeDidDocumentResolver,
    PlcDidDocumentResolver,
    WebDidDocumentResolver,
} from '@atcute/identity-resolver';
import { LocalActorResolver } from '@atcute/identity-resolver';

export const handleResolver = new CompositeHandleResolver({
    methods: {
        dns: new DohJsonHandleResolver({ dohUrl: 'https://dns.google/resolve' }),
        http: new WellKnownHandleResolver(),
    },
});

export const didDocumentResolver = new CompositeDidDocumentResolver({
    methods: {
        plc: new PlcDidDocumentResolver(),
        web: new WebDidDocumentResolver(),
    },
});

export const identityResolver = new LocalActorResolver({
    handleResolver,
    didDocumentResolver,
});
