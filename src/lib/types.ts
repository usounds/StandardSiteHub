export interface AtpClient {
    get(name: string, options?: unknown): Promise<{ ok?: boolean; data: Record<string, unknown> }>;
    post(name: string, options?: unknown): Promise<{ ok?: boolean; data: Record<string, unknown> }>;
}
export type Did = `did:${string}:${string}`;

export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
    return error instanceof Error ? error.message : fallback;
}
