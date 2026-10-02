# Deployment

Production runs entirely on free tiers. This replaced the earlier self-hosted
K3s + Argo CD setup on a Hetzner VPS (see [History](#history-k3s--argo-cd-on-a-vps)).

## Architecture

```
Browser
  │
  ├── https://app.trlab.dev ──► Vercel (Next.js frontend)
  │
  └── https://api.trlab.dev ──► Render web service (Docker image, Frankfurt)
                                    │
                                    └── TLS ──► Aiven PostgreSQL (free plan, Amsterdam)

DNS for trlab.dev is managed in Cloudflare.
```

| Component | Platform | Plan | Notes |
|-----------|----------|------|-------|
| Frontend | Vercel | Hobby (free) | `app.trlab.dev` |
| Backend API | Render | Free web service | `api.trlab.dev`, image `rahmantz/family-tree-backend:latest` |
| Database | Aiven PostgreSQL | Free | SSL required |
| DNS | Cloudflare | Free | All records are **DNS only** (not proxied) |
| Container registry | Docker Hub | Free | Image is built and pushed by CI |

## Free-tier behaviour

- **Render spins the backend down after 15 minutes without traffic.** The next
  request wakes it, which takes about a minute. The frontend stays up on Vercel
  during this, so the first API call after an idle period is just slow.
- **Render free usage** is 750 instance hours per month. A sleeping service uses
  none, and one service running all month stays within the limit.
- **Aiven's free database can be powered off.** If the API returns 503 from
  `/health/ready`, check the service in the Aiven console and power it on.
  Render wakes up by itself; the database does not.

## Backend service (Render)

| Setting | Value |
|---------|-------|
| Source | Existing image: `docker.io/rahmantz/family-tree-backend:latest` |
| Region | Frankfurt (closest to the Aiven database) |
| Instance type | Free |
| Health check path | `/health` |
| Custom domain | `api.trlab.dev` (CNAME to the service's `*.onrender.com` hostname) |

### Environment variables

Values live only in the Render dashboard. Never commit them; use
`backend/.env.production.example` as the template.

| Variable | Secret | Purpose |
|----------|--------|---------|
| `PORT` | no | `3001`, matches the Dockerfile `EXPOSE` |
| `NODE_ENV` | no | `production` |
| `DATABASE_URL` | **yes** | Aiven service URI |
| `DATABASE_SSL` | no | `true` for Aiven |
| `FRONTEND_URL` | no | Comma-separated CORS origins (the frontend domains) |

The service also has the authentication variables (`JWT_*`, `OAUTH_STATE_SECRET`,
`GOOGLE_OAUTH_*`, `APP_URL`, `COOKIE_DOMAIN`) set in advance, for when the
authentication work is merged into `main`.

### Health checks

```bash
curl https://api.trlab.dev/health        # process is up
curl https://api.trlab.dev/health/ready  # database connection is working
```

## Deploying a new version

1. Merge to `main`. CI (`.github/workflows/ci.yml`) runs the checks, then builds
   the backend image and pushes it to Docker Hub as `:<commit-sha>` and `:latest`.
2. In the Render dashboard, open the service and choose
   **Manual Deploy → Deploy latest reference**. Render pulls `:latest`.

To roll back, deploy an earlier image from the service's **Events** page, or point
the image URL at a specific `:<commit-sha>` tag.

Planned: add a CI step that calls the Render deploy hook after the image push,
stored as a GitHub Actions secret, so deploys happen automatically.

## DNS (Cloudflare)

| Name | Type | Target | Proxy |
|------|------|--------|-------|
| `app` | CNAME | Vercel | DNS only |
| `api` | CNAME | Render service hostname | DNS only |

Keep `api` set to **DNS only** so Render can issue and renew its TLS certificate.

## History: K3s + Argo CD on a VPS

Until October 2026 the backend ran on a single Hetzner VPS (CX23, 2 vCPU, 4 GB RAM)
with K3s, Rancher, Argo CD, cert-manager and Traefik. CI committed the new image
tag to `helm/family-tree/values.yaml`, and Argo CD synced it to the cluster.

It was shut down because the cluster's own components used almost all of the
4 GB RAM, while a monthly bill kept arriving for a hobby project with little
traffic. The VPS, its IPs and its DNS record have been deleted.

`helm/`, `k8s/` and the `update-image-tag` CI job are kept as a learning
reference and are not used by the current deployment. Argo CD needs a Kubernetes
cluster, so it has no role on Render.
