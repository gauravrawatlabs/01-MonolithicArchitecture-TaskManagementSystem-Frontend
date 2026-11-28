// Turns deploy/security-headers.json (the ONE source of the security headers, Phase 16) into the configuration
// format of each hosting option, so the hosts can never drift apart.
//
//   node scripts/host-configs.mjs nginx [--api-origin https://api.example.com]
//
// Without --api-origin the CSP keeps the placeholder ${API_ORIGIN} (substituted at container start-up).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HEADERS_FILE = new URL('../deploy/security-headers.json', import.meta.url);

/** The recommended headers, with {API_ORIGIN} replaced by `apiOrigin`. */
export function securityHeaders(apiOrigin) {
  const raw = JSON.parse(readFileSync(HEADERS_FILE, 'utf8'));
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([name]) => !name.startsWith('_'))
      .map(([name, value]) => [name, value.replace('{API_ORIGIN}', apiOrigin)]),
  );
}

/** nginx: one `add_header … always;` per header (include it in EVERY location that adds headers). */
export function nginxHeaders(apiOrigin = '${API_ORIGIN}') {
  return (
    Object.entries(securityHeaders(apiOrigin))
      .map(([name, value]) => `add_header ${name} "${value.replaceAll('"', '\\"')}" always;`)
      .join('\n') + '\n'
  );
}

const TARGETS = { nginx: nginxHeaders };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [target, flag, value] = process.argv.slice(2);
  const build = TARGETS[target];
  if (!build) {
    console.error(
      `Usage: node scripts/host-configs.mjs <${Object.keys(TARGETS).join('|')}> [--api-origin <origin>]`,
    );
    process.exit(1);
  }
  process.stdout.write(flag === '--api-origin' && value ? build(value) : build());
}
