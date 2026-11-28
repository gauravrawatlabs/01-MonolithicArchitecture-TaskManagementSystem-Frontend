# syntax=docker/dockerfile:1
# Task Management System — frontend image: a static build served by nginx (non-root, port 8080).
# ONE image for every environment: the API address is set when the container STARTS (API_BASE_URL),
# not when it is built. See docs/17-Phase17-Deployment-and-GitHub.md.

# ---- build ----------------------------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Only a default: the container overrides it at start-up through config.js.
ARG VITE_API_BASE_URL=http://localhost:5075
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npx vite build \
 && node scripts/host-configs.mjs nginx > /app/security-headers.conf.template

# ---- runtime --------------------------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.30-alpine
USER root
ARG VITE_API_BASE_URL=http://localhost:5075
# Used when API_BASE_URL is not given at start-up (the same URL the build defaulted to).
ENV DEFAULT_API_BASE_URL=${VITE_API_BASE_URL} \
    API_BASE_URL="" \
    APP_NAME=""
COPY --from=build /app/dist /usr/share/nginx/html
# Read-only input (part of the image) …
COPY --from=build /app/security-headers.conf.template /etc/nginx/tms-templates/security-headers.conf.template
# … and the folder the start-up script writes to (non-root user; a tmpfs in read-only deployments).
RUN mkdir -p /etc/nginx/tms && chown 101:101 /etc/nginx/tms
COPY deploy/docker/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 deploy/docker/40-tms-runtime-config.sh /docker-entrypoint.d/40-tms-runtime-config.sh
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
