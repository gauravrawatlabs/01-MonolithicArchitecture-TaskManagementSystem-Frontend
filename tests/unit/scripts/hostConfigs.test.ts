import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  azureStaticWebAppsConfig,
  CACHE,
  iisWebConfig,
  netlifyHeaders,
  netlifyRedirects,
  nginxHeaders,
  securityHeaders,
  vercelConfig,
} from '../../../scripts/host-configs.mjs';

/**
 * Every hosting option gets its configuration from ONE file (deploy/security-headers.json). These tests prove
 * each generated format carries every header, the SPA fallback and the cache rules, so the hosts can't drift.
 */
const API = 'https://api.example.com';
const source = JSON.parse(readFileSync('deploy/security-headers.json', 'utf8')) as Record<
  string,
  string
>;
const names = Object.keys(source).filter((name) => !name.startsWith('_'));

describe('host configuration generator', () => {
  it('fills the API origin into the CSP (and keeps a placeholder for the container)', () => {
    expect(securityHeaders(API)['Content-Security-Policy']).toContain(`connect-src 'self' ${API};`);
    expect(nginxHeaders()).toContain("connect-src 'self' ${API_ORIGIN};");
  });

  it('nginx: every header, always sent (also on errors)', () => {
    const out = nginxHeaders(API);
    for (const name of names)
      expect(out).toMatch(new RegExp(`^add_header ${name} ".+" always;$`, 'm'));
  });

  it('IIS / App Service: SPA rewrite, every header (XML-escaped), cache rules, no X-Powered-By', () => {
    const out = iisWebConfig(API);
    expect(out).toContain('<action type="Rewrite" url="/index.html" />');
    expect(out).toContain('<remove name="X-Powered-By" />');
    for (const name of names) expect(out).toContain(`<add name="${name}" value="`);
    expect(out).not.toMatch(/value="[^"]*<[^"]*"/); // nothing unescaped inside attribute values
    expect(out).toContain(`<location path="assets">`);
    expect(out).toContain(`value="${CACHE.assets}"`);
    expect(out).toContain(`<location path="config.js">`);
  });

  it('Azure Static Web Apps: fallback that excludes real files, global headers, cache routes', () => {
    const config = JSON.parse(azureStaticWebAppsConfig(API)) as {
      navigationFallback: { rewrite: string; exclude: string[] };
      globalHeaders: Record<string, string>;
      routes: { route: string; headers: Record<string, string> }[];
    };
    expect(config.navigationFallback.rewrite).toBe('/index.html');
    expect(config.navigationFallback.exclude).toEqual(
      expect.arrayContaining(['/assets/*', '/config.js']),
    );
    expect(Object.keys(config.globalHeaders).sort()).toEqual([...names].sort());
    expect(config.routes).toContainEqual({
      route: '/assets/*',
      headers: { 'Cache-Control': CACHE.assets },
    });
    expect(config.routes).toContainEqual({
      route: '/config.js',
      headers: { 'Cache-Control': CACHE.config },
    });
  });

  it('Netlify: every header on all paths, cache rules, and a 200 rewrite to index.html', () => {
    const out = netlifyHeaders(API);
    for (const name of names) expect(out).toMatch(new RegExp(`^  ${name}: `, 'm'));
    expect(out).toContain(`/assets/*\n  Cache-Control: ${CACHE.assets}`);
    expect(netlifyRedirects()).toMatch(/^\/\*\s+\/index\.html\s+200$/m);
  });

  it('Vercel: rewrite to index.html and every header on all paths', () => {
    const config = JSON.parse(vercelConfig(API)) as {
      rewrites: { source: string; destination: string }[];
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
    const all = config.headers.find((h) => h.source === '/(.*)')?.headers.map((h) => h.key) ?? [];
    expect(all).toEqual(expect.arrayContaining(names));
  });
});
