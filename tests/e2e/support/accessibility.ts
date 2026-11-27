import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Runs axe (WCAG 2.x A/AA rules, including colour contrast) and fails with readable details. */
export async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  // Colours may still be animating (e.g. right after switching theme: transition-colors). axe would then
  // measure a halfway colour and report a contrast failure that no user ever sees at rest.
  // Only FINITE ones: spinners and skeleton pulses loop forever and must not block the scan.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (animation) =>
          animation.playState !== 'running' ||
          animation.effect?.getComputedTiming().iterations === Infinity,
      ),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.nodes.length} node(s), e.g. ${
        violation.nodes[0]?.target.join(' ') ?? ''
      }`,
  );
  expect(summary).toEqual([]);
}
