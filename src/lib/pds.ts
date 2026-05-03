const DEFAULT_PDS = 'https://bsky.social';
const RESOLVE_TIMEOUT_MS = 1500;

interface PlcService {
    id?: string;
    type?: string;
    serviceEndpoint?: string;
}

interface PlcDidDocument {
    service?: PlcService[];
}

interface ResolvedMiniDoc {
    pds?: string;
}

const pdsCache = new Map<string, Promise<string>>();

function isTimeoutError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.name === 'AbortError' || error.name === 'TimeoutError';
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = RESOLVE_TIMEOUT_MS): Promise<T | undefined> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            next: { revalidate: 3600 },
        });
        if (!response.ok) return undefined;
        return await response.json() as T;
    } catch (error) {
        if (!isTimeoutError(error)) {
            console.warn('Failed to fetch PDS identity document:', url, error);
        }
        return undefined;
    } finally {
        clearTimeout(timeout);
    }
}

function getPdsFromDidDocument(document: PlcDidDocument | undefined): string | undefined {
    const service = document?.service?.find((item) => {
        return item.id === '#atproto_pds' || item.type === 'AtprotoPersonalDataServer';
    });

    return service?.serviceEndpoint;
}

async function resolvePdsUncached(did: string): Promise<string> {
    const plcDocument = await fetchJsonWithTimeout<PlcDidDocument>(
        `https://plc.directory/${encodeURIComponent(did)}`
    );
    const plcPds = getPdsFromDidDocument(plcDocument);
    if (plcPds) return plcPds;

    const miniDoc = await fetchJsonWithTimeout<ResolvedMiniDoc>(
        `https://slingshot.microcosm.blue/xrpc/blue.microcosm.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`,
        1000
    );

    return miniDoc?.pds || DEFAULT_PDS;
}

export async function resolvePds(did: string): Promise<string> {
    const cached = pdsCache.get(did);
    if (cached) return cached;

    const promise = resolvePdsUncached(did).catch(() => DEFAULT_PDS);
    pdsCache.set(did, promise);
    return promise;
}

export async function resolvePdsMap(dids: string[]): Promise<Record<string, string>> {
    const uniqueDids = Array.from(new Set(dids));
    const entries = await Promise.all(
        uniqueDids.map(async (did) => [did, await resolvePds(did)] as const)
    );

    return Object.fromEntries(entries);
}
