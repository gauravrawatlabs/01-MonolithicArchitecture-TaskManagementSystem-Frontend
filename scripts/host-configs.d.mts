// Types for scripts/host-configs.mjs (plain JavaScript run by Node), used by its unit tests.
export declare const CACHE: { assets: string; config: string; page: string };
export declare function securityHeaders(apiOrigin: string): Record<string, string>;
export declare function nginxHeaders(apiOrigin?: string): string;
export declare function iisWebConfig(apiOrigin: string): string;
export declare function azureStaticWebAppsConfig(apiOrigin: string): string;
export declare function netlifyHeaders(apiOrigin: string): string;
export declare function netlifyRedirects(): string;
export declare function vercelConfig(apiOrigin: string): string;
export declare function writeStaticHostFiles(apiOrigin: string, outDir: string): string[];
