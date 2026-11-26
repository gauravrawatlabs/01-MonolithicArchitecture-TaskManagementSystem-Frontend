# Phase 4 — Design System and Common Components

> Status: **✅ Verified — approved 2026-11-26**. Builds on [Phase 3 — Project Setup](03-Phase3-Project-Setup.md).
> Try it: `npm run dev` → http://localhost:3000 shows the **component library** (the living style guide).

## 1. What a design system is, in simple words

A design system is a **shared vocabulary** for the UI: a fixed set of colours, sizes and components that every
screen is built from. Instead of each page choosing "some purple" or writing its own modal, every page uses
`bg-primary` and `<Modal>`. This gives three things:

1. **Consistency.** All 23 pages look like one product.
2. **Speed.** Features in Phases 6–13 assemble existing pieces instead of styling from scratch.
3. **Quality in one place.** Accessibility, dark mode and focus handling are solved once, inside the component,
   so no feature can forget them.

```
 Design tokens (CSS variables)  ──►  Tailwind utilities  ──►  Components  ──►  Feature pages
 --primary: #6d4aff                  bg-primary              <Button>          TasksPage
 .dark { --primary-text: … }         text-primary-text       <Badge>           ProjectDetailsPage
```

## 2. Design tokens and theming

### 2.1 How a colour gets from token to screen
```
 src/styles/themes.css          src/styles/index.css                    component
 :root  { --surface: #fff }  ─► @theme inline {                    ─►  className="bg-surface"
 .dark  { --surface: #171923 }     --color-surface: var(--surface) }    (Tailwind generates
                                                                         background-color: var(--color-surface))
```
- **`themes.css`** holds the actual values, once for light (`:root`) and once for dark (`.dark`).
- **`@theme inline`** tells Tailwind v4 to create utilities (`bg-surface`, `text-muted-foreground`, `border-border`…)
  that *reference* the variables. Because they reference variables, toggling the `.dark` class on `<html>`
  re-themes everything instantly, with no second set of classes.
- **`@custom-variant dark`** makes Tailwind's `dark:` prefix follow that same `.dark` class (Tailwind's default is
  the OS setting only, but we also let the user choose).

### 2.2 Token catalogue

| Group | Tokens | Purpose |
|---|---|---|
| Surfaces | `background`, `surface`, `surface-muted`, `border`, `sidebar`, `overlay` | page, cards, inputs, dividers, modal backdrop |
| Text | `foreground`, `muted-foreground` | primary and secondary text |
| Brand | `primary`, `primary-hover`, `primary-foreground`, `primary-text`, `primary-soft`, `primary-soft-foreground`, `ring` | buttons, links, selected states, focus ring |
| Feedback | `success`, `warning`, `danger`, `info` + `-soft` backgrounds, `danger-hover` | badges, banners, toasts, destructive buttons |

**Why separate `primary` and `primary-text`?** In dark mode, white text on a *lighter* violet fails contrast,
so the button background stays `#6d4aff` while links on dark surfaces use a lighter `#a78bfa`. One token per job
avoids "fixing" one place and breaking another.

Task status and priority colours live in **`src/constants/taskMeta.ts`** (label + icon + badge classes per value),
typed as `Record<TaskItemStatus, …>`. If the backend adds a status and the types are regenerated, the build
fails until it gets a label and colour.

### 2.3 Dark mode without a white flash
```
 1. Browser parses index.html ─► tiny inline <script> reads localStorage "tms.theme" (+ OS setting)
                                  └─ adds class="dark" to <html>  ← BEFORE anything is painted
 2. CSS loads                  ─► page is painted in the right theme from the first frame
 3. React starts               ─► ThemeProvider reads the same preference, keeps <html> in sync,
                                  follows live OS changes while preference = "system"
```
Without step 1, a dark-mode user would see a white page for a moment on every load. The E2E test proves step 1
works by **blocking the app bundle** and checking that `<html>` is already dark.

Preference values: `light` · `dark` · `system`. They're stored by `services/preferencesStorage.ts`, which never
throws, because storage can be blocked in privacy mode.

## 3. Component design principles (how every component is built)

| Principle | What it means | Example |
|---|---|---|
| **Accessible by default** | Roles, names, focus and keyboard support are inside the component | `IconButton` *requires* `label`; `Switch` has `role="switch"` + `aria-checked` |
| **Native first** | Use the HTML element when it already does the job | `Select` is a styled native `<select>`; `Checkbox` is a real checkbox |
| **Headless for hard widgets** | Radix provides behaviour, we provide styling | `Modal`, `DropdownMenu`, `Tooltip`, `Tabs`, toasts |
| **Variants, not one-offs** | Visual options are a closed list | `Button variant="primary \| secondary \| ghost \| danger"` |
| **Pass-through** | Components accept native props and `className` (merged with `cn()`) | `<Button type="submit" className="w-full">` |
| **Presentational** | Shared components never fetch data or know features | `DataTable` *reports* sort clicks; the page decides what to fetch |
| **Composition** | Small parts instead of many boolean props | `<Card><CardHeader/><CardContent/></Card>` |

### 3.1 Three React patterns used here

**`ref` is a normal prop (React 19).** Earlier React needed `forwardRef` to let a parent reach the DOM node.
Now `function Input(props: ComponentProps<'input'>)` already accepts `ref`, so `<Input ref={nameRef} />` works.

**Render prop (`FormField`).** `FormField` generates ids and hands them to its child as a function argument:
```tsx
<FormField label="Email" error={errors.email?.message} required>
  {(control) => <Input {...control} {...register('email')} />}
</FormField>
```
`control` contains `id`, `aria-describedby` (hint + error), `aria-invalid` and `aria-required`. The label, hint
and error can therefore never be disconnected from the input. Without the wiring, a screen reader user hears
"Email, edit text" and never hears the error.

**Style function (`buttonVariants`).** Button classes are a function in `Button.styles.ts`, so a router `<Link>`
can look like a button without a second component: `<Link className={buttonVariants({ variant: 'secondary' })}>`.

### 3.2 Headless UI: why Radix
A dropdown menu needs: open on Enter/Space/↓, arrow-key movement, typeahead, Escape to close, focus return,
`role="menu"`/`menuitem`, positioning that avoids screen edges, and closing on outside click. That's hundreds of
lines with many edge cases. Radix implements this behaviour **without any styling**, and we add Tailwind classes.

**Decision recorded in this phase:** Radix **Select** was removed from the dependencies. A styled native `<select>`
is more accessible on mobile (it opens the OS picker) and works with React Hook Form's `register()` directly.
A custom picker (Popover-based) will be built only if a feature needs rich options, such as avatars in an assignee picker.

## 4. Component catalogue

### 4.1 `src/components/common/` (primitives)

| Component | Key props | Accessibility built in |
|---|---|---|
| `Button` (+ `Button.styles.ts`) | `variant`, `size`, `isLoading`, `leftIcon` | `type="button"` default; loading = disabled + `aria-busy` (no double submits) |
| `IconButton` | `label` (required), `icon`, `variant`, `size` | `aria-label` from `label`; icon hidden from screen readers |
| `Spinner` | `label` (`null` when a parent announces) | `role="status"` + visually hidden text |
| `Input`, `Textarea`, `Select` | native props; `Select`: `options`, `placeholder` | invalid styling driven by `aria-invalid` |
| `Checkbox` | `label`, `description` | clickable label, description via `aria-describedby` |
| `Switch` | `checked`, `onCheckedChange` | `role="switch"` + `aria-checked`, Space/Enter |
| `Badge` | `variant` (neutral/primary/success/warning/danger/info) | always contains text |
| `Avatar`, `AvatarGroup` | `name`, `size`; `names`, `max` | `role="img"` + full name; "+N more" |
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | `title`, `description`, `action`, `headingLevel` | correct heading level for page outline |
| `Skeleton`, `SkeletonText` | `className`, `lines` | `aria-hidden` (the container announces loading once) |
| `ProgressBar` | `value` (clamped 0–100), `label`, `showValue` | `role="progressbar"`, `aria-valuenow`, `aria-valuetext` |
| `Modal` | `open`, `onOpenChange`, `title`, `description`, `footer`, `size`, `role`, `dismissible`, `initialFocusRef` | focus trap, Escape, **focus return**, labelled + described; full-screen on phones |
| `DropdownMenu` (+ Trigger, Content, Item, Label, Separator) | `variant="danger"` items | menu roles, arrows, typeahead, focus return |
| `Tooltip` | `content`, `side` | shows on hover **and** keyboard focus |
| `Tabs` (+ List, Trigger, Content) | Radix props | tablist/tab/tabpanel, arrow keys, Home/End |
| `ThemeToggle` | `showLabels` | toggle buttons with `aria-pressed` in a labelled group |

### 4.2 `src/components/forms/`
| Component | Purpose |
|---|---|
| `FormField` | label + control + hint + error, wired with ids/ARIA (render prop) |
| `PasswordInput` | show/hide button (`aria-pressed`, `type="button"`, never submits) |

### 4.3 `src/components/feedback/`
| Component | Use it for |
|---|---|
| `EmptyState` | a list with no items: what happened + the next step |
| `ErrorState` | content that failed to load: message, **Try again**, correlation id (`role="alert"`) |
| `Banner` | persistent in-page messages (verify email, session expired) |
| `ConfirmDialog` | destructive confirmations: busy while the async action runs, closes on success, **stays open on failure** |
| `ErrorBoundary` | contains render crashes to one widget (class component, because React has no hook for this) |
| `PageLoader` | full-area loading (route changes, session check) |

### 4.4 `src/components/tables/`
| Component | Purpose |
|---|---|
| `DataTable<TRow>` | generic table: typed columns, sortable headers (`aria-sort`, backend `Asc`/`Desc`), skeleton rows, empty state, columns hidden on small screens |
| `Pagination` | matches the backend `PagedResult`: "Showing 21–40 of 148", page buttons with ellipses, page size (≤ 100), `aria-current="page"` |

### 4.5 App-wide contexts (`src/contexts/`)
| Context | API | Notes |
|---|---|---|
| `theme/` | `ThemeProvider`, `useTheme()` → `{ preference, resolvedTheme, setPreference }` | split into context / provider / hook files so React Fast Refresh works |
| `toast/` | `ToastProvider`, `useToast()` → `success / error / info / show` | Radix Toast: announced, paused on hover, swipe to dismiss, F8 shortcut; max 4; errors last 8 s and show the correlation id |

### 4.6 Other files

| File | Responsibility |
|---|---|
| `src/styles/themes.css`, `src/styles/index.css` | tokens; Tailwind theme mapping; base styles (focus ring, reduced motion) |
| `index.html` | inline no-flash theme script |
| `src/services/preferencesStorage.ts` | safe read/write of the theme preference |
| `src/utils/cn.ts`, `avatar.ts`, `pagination.ts` | class merging; initials + stable colours; page buttons and ranges |
| `src/types/api.ts` | first aliases over generated DTOs: `TaskItemStatus`, `TaskPriority`, `SortDirection` |
| `src/constants/taskMeta.ts` | labels/icons/colours for statuses and priorities, workflow order |
| `src/features/tasks/components/StatusBadge.tsx`, `PriorityBadge.tsx`, `features/tasks/index.ts` | task badges; they know what a task is, so they live in the feature and are exported through its public API |
| `src/features/design-system/` | the showcase page (moves to a dev-only `/design-system` route in Phase 5) |
| `src/app/providers/AppProviders.tsx` | Theme + Toast providers (Query and Auth join in Phase 7) |

## 5. Problems found and fixed in this phase

Tests and tools found real defects. Each one shows why a check exists:

| # | Found by | Problem | Fix | Lesson |
|---|---|---|---|---|
| 1 | Unit test | **Modal didn't return focus** after closing: Radix only returns focus to its own `Dialog.Trigger`, and our modals are opened from app state | Modal records the focused element in a layout effect (runs before Radix moves focus) and restores it in `onCloseAutoFocus` | Test keyboard behaviour, not just rendering |
| 2 | axe (E2E) | Light `--danger` `#dc2626` on `#fee2e2` = **3.9:1** (WCAG AA needs 4.5:1) | `--danger: #b91c1c` (5.4:1) | Check every text/background *pair*, not each colour alone |
| 3 | axe (E2E) | Banner body text with `opacity-90` dropped warning text to **3.8:1** | Removed opacity on text | Opacity on text silently lowers contrast |
| 4 | ESLint | Suggested `disabled ?? isLoading`, but `false ?? true` is `false`, so a loading button would stay clickable | `(disabled ?? false) \|\| isLoading` | Understand an auto-fix before accepting it |
| 5 | ESLint (jsx-a11y) | `autoFocus` in a modal | `initialFocusRef` prop using Radix's `onOpenAutoFocus` | Let the focus manager own focus |
| 6 | Review | Theme switch used `role="radiogroup"` without arrow-key support | `role="group"` + `aria-pressed` toggle buttons | ARIA roles are promises about keyboard behaviour |
| 7 | Review | `animate-in` classes from a plugin we don't have | Removed | Unused classes fail silently |

Test-code mistakes I made and corrected:
- A theme test that asserted on a fake function (it could never fail). It was replaced with a real check that `useTheme` throws outside its provider.
- An ErrorBoundary test that "reset" by changing a plain variable. A reset only helps when the *cause* changes through state.
- An assertion on "the alert" on a page that has several.

## 6. Tests

| Level | File(s) | Count | What they prove |
|---|---|---|---|
| Unit | `utils/cn` (3), `utils/avatar` (9), `utils/pagination` (8), `services/preferencesStorage` (4) | 24 | class merging, initials/colours, page items (incl. exhaustive "no duplicates" check), safe storage |
| Unit | `constants/env` (from Phase 3) | 8 | environment validation |
| Unit | `features/tasks/taskMeta` | 12 | workflow order, priority ranks, every status/priority renders a text label |
| Unit | `components/common/Button` (6), `controls` (9), `overlays` (6) | 21 | loading/disabled, accessible names, Select/Checkbox/Switch keyboard, Avatar, ProgressBar clamping, **Modal focus & Escape & non-dismissible**, menu keyboard, tab arrows |
| Unit | `components/forms/FormField` | 5 | label/description/invalid wiring, password toggle never submits |
| Unit | `components/feedback/feedback` | 9 | ConfirmDialog cancel/busy/success/**failure keeps it open**, states, banner roles, ErrorBoundary recovery |
| Unit | `components/tables/tables` | 10 | DataTable rows/sort/aria-sort/loading/empty, Pagination ranges/navigation/disabled/size/empty |
| Unit | `contexts/theme` (5), `contexts/toast` (3) | 8 | OS default, live OS change, explicit choice saved, restore, provider guard; toasts, correlation id, dismiss, max 4 |
| Integration | `integration/app.test.tsx` | 5 | real App: sections render, theme switch, sort + paging together, toast, contained crash |
| **Total Vitest** | 15 files | **102** | ✅ all passing · line coverage ≈ 91 % |
| E2E | `e2e/design-system.spec.ts`, `smoke.spec.ts` | 6 × 3 viewports = **18** | **axe WCAG 2.2 AA scan in light and dark**, no-flash theme with the bundle blocked, theme persists across reload, keyboard-only modal |

## 7. Verification

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ |
| `npm run lint` (src **and** tests) | ✅ 0 problems |
| `npm run format:check` | ✅ |
| `npm run test` | ✅ 102/102 |
| `npm run test:e2e` | ✅ 18/18 (desktop, tablet, mobile) |
| `npm run build` | ✅ JS 129 kB gzip (showcase imports every component; code splitting in Phase 5/16) |

## 8. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Hard-coded hex colours in components | Tokens → utilities; themes change in one file |
| Checking contrast of a colour "on white" only | Check every real pair (text on soft background, text with opacity) and automate it with axe |
| `<div onClick>` as a button | `<button type="button">`: focus, Enter/Space, role for free |
| Icon-only buttons without a name | `IconButton` requires `label` |
| Colour as the only signal (red = overdue) | Text + icon + colour (`StatusBadge`) |
| `autoFocus` in dialogs | Let the dialog manage focus (`initialFocusRef`) |
| Forgetting focus return after closing a modal | Restore focus to the opener; test it |
| One mega-component with 20 boolean props | Composition (`Card*`) and closed variant lists |
| Shared components that fetch data | Presentational components + feature hooks |

## 9. Interview questions
1. What are design tokens, and why use CSS variables for them instead of Tailwind's built-in palette directly?
2. How does Tailwind v4's `@theme inline` differ from `@theme`?
3. How do you prevent a "flash of the wrong theme" in a client-rendered app?
4. What is a headless UI library? When would you still use a native element instead?
5. Why must an icon-only button have an accessible name, and how do you give it one?
6. What does WCAG AA require for text contrast? Why can `opacity` break it?
7. What can an error boundary catch, and what can it not catch?
8. In React 19, why is `forwardRef` often unnecessary?
9. Why should a confirmation dialog stay open when its async action fails?
10. What is the difference between `role="alert"` and `role="status"`?

## 10. Practical exercises
1. Add a `size="lg"` variant to `IconButton` and a unit test for it.
2. Change `--primary` in `themes.css` to `#8b5cf6`, run `npm run test:e2e`, and read what axe reports. Then revert.
3. Add a `variant="outline"` Badge and show it on the design system page. Keep contrast ≥ 4.5:1 in both themes.
4. Keyboard only: open the "Task actions" menu, choose Delete, and describe each focus move you observe.
5. Explain why `StatusBadge` lives in `features/tasks` but `Badge` lives in `components/common`.
