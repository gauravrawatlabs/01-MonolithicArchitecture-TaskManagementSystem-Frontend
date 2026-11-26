import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { expect } from '@playwright/test';

/**
 * The backend (Development) "sends" emails by writing .html files into its pickup directory
 * (PickupDirectoryEmailSender). Default: the sibling backend repository's emails/ folder.
 * Override with E2E_EMAIL_DIR if the backend lives elsewhere.
 */
const EMAIL_DIR =
  process.env.E2E_EMAIL_DIR ??
  path.resolve(
    import.meta.dirname,
    '../../../../01-MonolithicArchitecture-TaskManagementSystem/src/TaskManagementSystem/emails',
  );

/** Waits for the newest email to `to` whose link contains `linkPath`, and returns that link. */
export async function readEmailLink(
  to: string,
  linkPath: '/confirm-email' | '/reset-password',
): Promise<string> {
  let link: string | undefined;

  await expect
    .poll(
      async () => {
        const files = await readdir(EMAIL_DIR).catch(() => [] as string[]);
        const withTimes = await Promise.all(
          files
            .filter((file) => file.endsWith('.html'))
            .map(async (file) => ({
              file,
              time: (await stat(path.join(EMAIL_DIR, file))).mtimeMs,
            })),
        );
        for (const { file } of withTimes.sort((a, b) => b.time - a.time)) {
          const html = await readFile(path.join(EMAIL_DIR, file), 'utf8');
          if (!html.includes(to)) continue;
          const match = new RegExp(`href="([^"]*${linkPath}[^"]*)"`).exec(html);
          if (match?.[1]) {
            link = match[1].replaceAll('&amp;', '&');
            return true;
          }
        }
        return false;
      },
      { message: `email with ${linkPath} link for ${to} in ${EMAIL_DIR}`, timeout: 15_000 },
    )
    .toBe(true);

  if (!link) throw new Error('unreachable');
  return link;
}
