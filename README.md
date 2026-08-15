# AstroPages Base Template

`base-template` is the neutral runnable starter for new AstroPages templates. It is not a vertical site and it is not a library-only package. New template repos should fork or copy this repo, then add their own routes, copy, data, integrations, analytics, and screenshots. AstroPages Admin owns the semantic version, release notes, and changelog for every released template commit.

## Release Metadata

Template source identifies an immutable technical commit, but never gates a release on a source-controlled template version. After a production workflow succeeds, use AstroPages Admin to verify that commit and select its semantic version, release notes, and changelog. Do not add `version`, `registryVersionId`, or a template registry-version lock to a derived template manifest.

Included reusable core:

- Astro 6 on Cloudflare Workers with D1, R2, KV, Images, assets, and worker-loader bindings.
- EmDash as the canonical content system for builder-managed public copy and SEO.
- Explicit generated-site EmDash bootstrap before smoke checks, with fast edit-readiness on later deploys.
- Read-only public and `?preview=1` rendering; page loads must not create schema, entries, drafts, or release revisions.
- Content Studio and MCP editing through EmDash mutation handlers.
- Content release state, deterministic snapshots, import/export APIs, and content hash versus snapshot hash semantics.
- Generated-site SSO sessions, roles, CSRF support, and bounded browser-safe SSO exchange failures.
- Runtime config sync and D1 cache.
- Customer auth starter pages and APIs.
- Canonical `leads.v1` D1 storage and reusable form/order linking helpers.
- A finished product-interest demo showing an accessible modal form, validated public endpoint, consent, attribution, deduplication, and D1 lead storage.
- Read-only analytics manifest for reusable runtime tables.
- Current generated-site workflow seeds in `.astropages/generated-site-workflows`.

Not included:

- No marketplace operations UI, booking, order, payment, report, puja, shop, or provider-status flows.
- No generic endpoint accepting arbitrary leads. The included endpoint is deliberately scoped to the product-interest demo.
- No generated-site `/astropages/admin` console.
- No catalog registration as a selectable template unless AstroPages explicitly promotes a derived template.

## EmDash Contract

Generated sites must materialize editable content explicitly through:

```text
POST /api/astropages/generated-site/emdash/bootstrap
```

Public render paths only read:

```text
GET /
GET /?preview=1
```

Mutation paths are explicit:

- Content Studio editor APIs.
- EmDash MCP.
- EmDash REST/admin handlers.
- Service-authenticated content release import.

Content release endpoints:

```text
GET  /api/astropages/generated-site/content-release/status
POST /api/astropages/generated-site/content-release/export
POST /api/astropages/generated-site/content-release/import
```

Generated-site Worker deploys use only:

- `EMDASH_ENCRYPTION_KEY`
- `ASTROPAGES_CONTROL_PLANE_CALLBACK_TOKEN`

Template-source preview/production workflows may still use Builder MCP template secrets for template release bootstrapping.

## Commands

```sh
pnpm install
pnpm run test
pnpm run scan:safety
pnpm run d1:schema:check
pnpm run cloudflare:contract
pnpm run typecheck
pnpm run build
```

Run `pnpm run cloudflare:resources:print` to inspect local preview/production resource names.

See [`docs/product-lead-generation.md`](docs/product-lead-generation.md) for the complete product demo flow, local D1 verification, and the exact files to adapt in a derived template.

## Extending

When creating a new vertical template:

1. Add new public routes and components.
2. Extend `src/data/public-copy.ts` and `src/builder/registry.ts`.
3. Add explicit D1 migrations for runtime data.
4. Update `astropages/analytics.manifest.json`.
5. Update `template.manifest.json` and `capability-lock.json`.
6. Add product-specific tests and docs.
7. Keep generated-site repo variables generic: `PREVIEW_SITE_*` and `PRODUCTION_SITE_*`.
8. Read `LEADS.md` and connect each qualifying form or order flow to the canonical lead helpers.

## Release Checklist

Template CI and deployments are generated centrally by the signed AstroPages
Control Plane extension. This repository intentionally has no checked-in
`.woodpecker.yml` and no GitHub deployment workflows.

- Pull requests and `develop` run only in DEV Woodpecker. A successful current
  `develop` push may be explicitly deployed to the DEV Cloudflare account with
  target `preview`.
- `main` runs only in PROD Woodpecker. A successful current `main` push may be
  explicitly deployed to the PROD Cloudflare account with target `production`.
- Environment credentials are encrypted repository secrets in the respective
  Woodpecker system. Values are never stored here or copied between environments.
- `.github/workflows/ci.yml` remains secretless safety CI only.

1. Commit and push the reviewed template change to `develop`.
2. Require DEV `template_ci`, then explicitly deploy to `preview`.
3. Promote `develop` to `main` through an approved pull request.
4. Require PROD `template_ci`, then explicitly deploy to `production`.
5. Verify the exact release SHA and Admin-managed semantic version in AstroPages Admin.
