# FantasyStocks Deployment Playbook

This project is split into a Vercel-hosted Vite frontend and a Dockerized FastAPI backend. The backend deployment path is:

```text
Local code -> GitHub -> GitHub Actions -> Docker Hub -> VPS/container host
```

## What changed

- Added a production-oriented `backend/Dockerfile` with a builder stage, wheel caching, slim runtime image, non-root user, explicit port handling, and Docker `HEALTHCHECK`.
- Added `backend/.dockerignore` so secrets, caches, tests, and local-only files do not enter the image build context.
- Added `/health` to the FastAPI app so orchestration platforms can probe the service without touching database or third-party APIs.
- Moved CORS origins behind the `CORS_ORIGINS` environment variable while preserving local Vite defaults.
- Normalized `backend/requirements.txt` from UTF-16 to UTF-8 so Linux CI runners and Docker builds can install dependencies reliably.
- Added backend smoke tests for `/` and `/health`.
- Added `backend/requirements-dev.txt` for CI-only tooling: `pytest`, `httpx`, and `ruff`.
- Added `.github/workflows/deploy.yml` to run frontend lint/build, backend lint/tests, Docker image build, Docker Hub publishing, and an optional deploy webhook.

## Required GitHub secrets

Add these in GitHub under `Settings -> Secrets and variables -> Actions`.

| Secret | Required | Purpose |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Yes for publishing | Docker Hub namespace used for the backend image. |
| `DOCKERHUB_TOKEN` | Yes for publishing | Docker Hub access token used by GitHub Actions. |
| `DEPLOY_WEBHOOK_URL` | Optional | VPS/host webhook that pulls the new image and restarts the backend. |
| `DEPLOY_WEBHOOK_TOKEN` | Optional | Bearer token sent to the deploy webhook. |

If Docker Hub secrets are missing, pull requests and local CI-style checks still build the image, but `main` cannot publish it.

## Backend runtime environment

Set these on the VPS/container host:

```bash
ALPACA_API_KEY=...
ALPACA_API_SECRET=...
TIME_CHUNK_SIZE=30
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
PORT=8000
```

## Vercel frontend environment

Set these in Vercel under `Project -> Settings -> Environment Variables`, then redeploy the frontend:

```bash
VITE_API_BASE_URL=https://api.ayaan-faisal.com
VITE_WS_BASE_URL=wss://api.ayaan-faisal.com
```

The webhook secrets are separate from frontend connectivity. They only automate VPS redeploys after a new Docker image is pushed.

## Local backend container test

From the repository root:

```bash
docker build -t fantasystocks-api:local ./backend
docker run --rm -p 8000:8000 --env-file backend/.env.back fantasystocks-api:local
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok","service":"fantasystocks-api","timestamp":"..."}
```

## VPS deployment sketch

One simple VPS setup is Docker plus a small webhook service. The webhook should:

1. Validate `DEPLOY_WEBHOOK_TOKEN`.
2. Run `docker pull DOCKERHUB_USERNAME/fantasystocks-api:<commit-sha>`.
3. Stop the old container.
4. Start the new image with the production environment variables.
5. Confirm `GET /health` returns `status=ok`.

Example container command:

```bash
docker run -d \
  --name fantasystocks-api \
  --restart unless-stopped \
  -p 8000:8000 \
  --env-file /opt/fantasystocks/backend.env \
  DOCKERHUB_USERNAME/fantasystocks-api:latest
```

Put Nginx or Caddy in front of the container for HTTPS and route the frontend's API URL to that domain.

## Resume and interview talking points

- Built a CI/CD pipeline that gates merges with frontend lint/build, backend lint/tests, and container image validation.
- Containerized a FastAPI service with a multi-stage Docker build, non-root runtime, slim base image, and health checks.
- Published immutable backend images tagged by Git commit SHA, enabling rollback and traceable deployments.
- Separated production configuration from code using environment variables for CORS, API credentials, Supabase, and port binding.
- Designed the deployment flow around standard platform primitives: GitHub Actions, Docker Hub, VPS/container runtime, and webhook-triggered rollouts.
- Added operational readiness endpoints so the backend can be monitored by Docker, load balancers, or uptime checks.

Good resume phrasing:

> Containerized and deployed a FastAPI backend with GitHub Actions CI/CD, Docker Hub image publishing, health-checked runtime containers, and environment-driven production configuration for a React fantasy stock trading app.

Stronger infrastructure-oriented version:

> Built a production-style deployment pipeline for a full-stack fantasy stock platform: GitHub Actions quality gates, multi-stage Docker builds, immutable image tags, Docker Hub publishing, and webhook-triggered VPS rollouts with health checks and rollback-friendly release artifacts.
