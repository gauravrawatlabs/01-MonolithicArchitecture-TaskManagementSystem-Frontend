# Phase 17 — Deployment and GitHub

> Status: **✅ Verified — approved 2026-11-28; CI green on GitHub**. Builds on [Phase 16 — Performance and security review](16-Phase16-Performance-and-Security-Review.md).
> The hosting target isn't decided yet, so **every common option is prepared**, each in its own commit. Pick one
> when you deploy; the others stay ready.

## 1. Which option for which server?

| You will run it on… | Use | Section |
|---|---|---|
| Docker anywhere: a VM, AWS EC2, Azure Web App for Containers, AWS ECS / App Runner, Kubernetes | **Docker image** | §4 |
| A Linux VM / EC2 with nginx, no Docker | **nginx site** | §5 |
| Windows Server IIS, Azure App Service (Windows) | **web.config** | §6 |
| Azure Static Web Apps, Netlify, Cloudflare Pages, Vercel | **static-host files** | §7 |
| GitHub Pages (free, from this repo) | **Pages workflow** | §8 |

What every option needs from the **backend** (ASP.NET Core API), in `appsettings.Production.json` or environment
variables:

| Setting | Value | Environment variable |
|---|---|---|
| `Cors:AllowedOrigins` | the frontend's origin, e.g. `https://app.example.com` | `Cors__AllowedOrigins__0=https://app.example.com` |
| `Email:ClientAppBaseUrl` | the frontend's URL (links in emails), incl. a sub-path if any | `Email__ClientAppBaseUrl=https://app.example.com` |

**The frontend's API address** is set in one of two ways:
- **At build time:** `VITE_API_BASE_URL=https://api.example.com npm run build`. The production build refuses to
  run without it.
- **At start-up (no rebuild):** `config.js` (§3). This is what the Docker image uses.

## 2. Commits of this phase

| Commit | What |
|---|---|
| 17.1 Runtime configuration | `public/config.js` loaded before the app; overrides the build-time API URL / app name |
| 17.2 CI | `.github/workflows/ci.yml`: type-check, lint, format, tests + coverage, build, UI end-to-end |
| 17.3 Docker | `Dockerfile`, `deploy/docker/*`, `.github/workflows/docker.yml` (GHCR) |
| 17.4 nginx on a VM / EC2 | `deploy/nginx/tms.conf` |
| 17.5 IIS + static hosts | `npm run build:static` → `web.config`, `staticwebapp.config.json`, `_headers`, `_redirects`, `vercel.json` |
| 17.6 GitHub Pages + sub-path support | `VITE_BASE_PATH`, router `basename`, `.github/workflows/pages.yml` |
| 17.7 Docs | this guide, README, tracker |

**One source for the security headers:** `deploy/security-headers.json` (Phase 16). `scripts/host-configs.mjs`
generates each host's format from it (nginx, IIS, Azure SWA, Netlify, Vercel), and unit tests prove every format
has every header, the SPA fallback and the cache rules. They can't drift apart.

## 3. Runtime configuration (`config.js`)
```js
window.__APP_CONFIG__ = { apiBaseUrl: 'https://api.example.com', appName: 'Task Management System' };
```
- Loaded **before** the app. Non-empty values override the build-time `VITE_*` values, and they are still
  validated at start-up (a typo fails with a clear message).
- Serve it with `Cache-Control: no-store` (every option here does), so a change takes effect immediately.
- **CSP:** the policy's `connect-src` must list the same API origin. Docker does this automatically. For other hosts,
  build with `VITE_API_BASE_URL` (or regenerate the host files) when you change the API address.

## 4. Docker (recommended for VMs, EC2 and container platforms)
```bash
docker build -t tms-frontend .
docker run -d -p 80:8080 -e API_BASE_URL=https://api.example.com -e APP_NAME="Task Management System" tms-frontend
```
- **One image for every environment:** at start-up, `API_BASE_URL` writes `config.js` **and** the CSP `connect-src`.
- nginx 1.30, **non-root** (user 101, port 8080), SPA fallback, gzip, hashed assets cached for a year,
  `/healthz` + `HEALTHCHECK`, all security headers in every location.
- **Read-only root filesystem supported:** see `deploy/docker/docker-compose.example.yml` (tmpfs for the few
  writable folders).
- A wrong `API_BASE_URL` (no http/https) stops the container with a clear message instead of serving a broken app.
- **Registry:** `.github/workflows/docker.yml` builds on every push to `main` and **publishes** to GitHub Container
  Registry (`ghcr.io/<owner>/<repo>`) only for tags `v*` or a manual run. Example: `git tag v1.0.0 && git push --tags`.
- **HTTPS:** put a TLS terminator in front (a cloud load balancer, Caddy, Traefik, or nginx with certbot).

**Verified here:**
- image built (92.7 MB);
- non-root user and health check `healthy`;
- every header present on pages **and** assets, with the CSP following `API_BASE_URL`;
- deep links work, and a missing asset returns 404;
- `config.js` is escaped correctly (quotes and backslashes tested);
- a bad URL is rejected;
- the read-only Compose setup runs;
- in a real browser: sign-in, reload, runtime app name in the title, API calls to the runtime URL, **no CSP
  violations**.

## 5. nginx on a VM / EC2 (no Docker)
```bash
npm ci && VITE_API_BASE_URL=https://api.example.com npm run build        # on your machine or CI
rsync -a --delete dist/ user@server:/var/www/tms/                       # copy the build
node scripts/host-configs.mjs nginx --api-origin https://api.example.com > tms-security-headers.conf
scp tms-security-headers.conf user@server:/tmp/ && ssh user@server \
  'sudo mv /tmp/tms-security-headers.conf /etc/nginx/snippets/'
# copy deploy/nginx/tms.conf to /etc/nginx/sites-available/tms (set server_name), enable it, then:
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.example.com                                 # HTTPS
```
**Verified here** with the official nginx 1.30 image and these exact files: `nginx -t` OK, deep links, headers,
uncached `config.js`.

## 6. IIS / Azure App Service (Windows)
```bash
VITE_API_BASE_URL=https://api.example.com npm run build:static
```
Deploy the contents of `dist/`. It includes `web.config` with the SPA rewrite, every security header, removal of
`X-Powered-By`, and cache rules. IIS needs the **URL Rewrite** module (Azure App Service has it).

## 7. Azure Static Web Apps, Netlify, Cloudflare Pages, Vercel
Build once with `npm run build:static` (as in §6). `dist/` then contains each host's file:

| Host | File in `dist/` | Deploy |
|---|---|---|
| Azure Static Web Apps | `staticwebapp.config.json` | app location `dist` (SWA GitHub Action or `swa deploy dist`) |
| Netlify, Cloudflare Pages | `_headers`, `_redirects` | publish directory `dist` |
| Vercel | `vercel.json` | deploy the `dist` folder (`cd dist && vercel --prod`) |

**Not verified on the real services:** no accounts were available, and running emulators wasn't possible here.
The generated files are covered by unit tests (structure, every header, fallback, caching, escaping) and are valid
JSON/XML. **The first deployment should be checked once:** a deep link, a reload, and the response headers in
the browser.

## 8. GitHub Pages
1. Settings → Pages → **Source: GitHub Actions**.
2. Settings → Secrets and variables → Actions → **Variables**: `VITE_API_BASE_URL`.
3. Backend: allow `https://<owner>.github.io` (CORS) and set `Email:ClientAppBaseUrl` to
   `https://<owner>.github.io/<repo>`.
4. Actions → **GitHub Pages** → Run workflow (manual only: a push never publishes).

The workflow builds for the repository's sub-path (`VITE_BASE_PATH=/<repo>/`) and copies `index.html` to `404.html`
for deep links.

**Pages limitations:** no custom headers (no CSP header, no clickjacking protection), and deep links answer with status
404 (the app still loads). Prefer another option for production.

**Sub-path support** (new, useful anywhere): `VITE_BASE_PATH=/tasks-app/` builds the app for
`https://host/tasks-app/`. **Verified** in a browser: a signed-out deep link goes to sign-in with its return
address, the return works, in-app links and reloads stay under the sub-path, and there are no console errors.
On Windows Git Bash, set `MSYS_NO_PATHCONV=1` too, because Git Bash rewrites `/…` values into Windows paths.

## 9. Continuous integration
`.github/workflows/ci.yml` runs on every push to `main`, every pull request, or by hand:
- **quality:** `npm ci`, type-check, lint, format check, unit + integration tests with coverage, production build
  (with `VITE_API_BASE_URL` from a repository variable or a placeholder). The `dist` and `coverage` artifacts are
  kept 7 days.
- **e2e:** Playwright UI tests on desktop, tablet and phone, plus the security-header check. The report is uploaded
  on failure.

The real-API tests stay local (they need the API and SQL Server).

**First run on GitHub (Linux):** the Docker workflow and the quality job passed, but the e2e job failed before any
test ran. Vite 8 refuses a second `vite preview` in the same project, and in CI both e2e servers are previews
(:3000 and :4173). Locally this was hidden, because the dev server on :3000 was reused. Fixed with `--bypass-lock`
(safe: each preview serves its own folder), reproduced and verified locally, then pushed. **Second run: all
green**: quality ✅, e2e 144 passed / 2 skipped ✅, Docker image ✅.

## 10. Common mistakes
| Mistake | Avoid it by |
|---|---|
| Changing the API URL in `config.js` but not the CSP | Docker does both; elsewhere rebuild with `VITE_API_BASE_URL` |
| Forgetting the backend's CORS / email URL | §1 table, for every option |
| `add_header` in an nginx `location` dropping the security headers | the include in every location (both nginx configs do this) |
| Caching `index.html` / `config.js` for long | `no-cache` / `no-store` (all configs) |
| Shell scripts with Windows line endings in a Linux image | `.gitattributes` forces LF for `*.sh` |
| Running the container as root | the image uses nginx-unprivileged (user 101) |

## 11. Interview questions
1. What's the difference between build-time and runtime configuration in a SPA, and why does a Docker image need the latter?
2. Why must every client-side route fall back to `index.html`, and why must `/assets/*` not?
3. Why can a single nginx `add_header` silently remove your security headers?
4. Why run the container as a non-root user with a read-only filesystem?
5. Why publish images only for tags rather than on every push?
6. What does a CSP `connect-src` have to do with your API's address?
