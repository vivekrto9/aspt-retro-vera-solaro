import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { loadWranglerConfig, validateCloudflareRuntimeConfig } from "../scripts/cloudflare-runtime-contract.mjs";
import { schemaContract } from "../scripts/d1-schema-contract.mjs";
import { deploymentWorkflowPaths } from "./cloudflare/workflow-mode.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const readJson = (path) => JSON.parse(read(path));

const baseTables = new Set([
  "ap_runtime_config",
  "ap_business_settings",
  "ap_asset_records",
  "ap_asset_revisions",
  "ap_asset_aliases",
  "ap_asset_events",
  "ap_asset_release_state",
  "ap_admin_sessions",
  "ap_admin_sso_exchanges",
  "ap_content_revision_log",
  "ap_content_environment_state",
  "ap_emdash_bootstrap_state",
  "ap_customer_accounts",
  "ap_customer_sessions",
  "ap_customer_password_resets",
  "ap_business_events",
  "ap_leads",
  "ap_email_templates",
  "ap_email_events",
  "ap_email_variable_mappings",
]);

test("template manifest declares core platform metadata without generated-site admin", () => {
  const manifest = readJson("template.manifest.json");
  const serialized = JSON.stringify(manifest);

  assert.equal(Object.hasOwn(manifest, "analytics"), false);
  assert.equal(manifest.cloudflare.runtimeContractStatus, "defined");
  assert.equal(manifest.workflows.generatedSite.previewSeed, ".astropages/generated-site-workflows/deploy-preview.yml");
  assert.equal(manifest.workflows.generatedSite.productionSeed, ".astropages/generated-site-workflows/deploy-production.yml");
  assert.equal(manifest.secrets.valuesAllowedInSource, false);
  assert.equal(manifest.localization.requiredDefaultLocale, "en");
  assert.deepEqual(manifest.localization.availableLocaleCatalog, ["en", "hi", "ta", "te", "bn", "mr"]);
  assert.deepEqual(manifest.runtimePersistence.tables, [...baseTables]);
  assert.equal(Object.hasOwn(manifest.runtime, "generatedSiteAdminPath"), false);
  assert.doesNotMatch(serialized, /\/astropages\/admin/);

  for (const name of [
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_DEV_WORKERS_SUBDOMAIN",
    "EMDASH_ENCRYPTION_KEY",
    "ASTROPAGES_CONTROL_PLANE_CALLBACK_TOKEN",
    "ASTROPAGES_CONTROL_PLANE_CALLBACK_BASE_URL",
    "ASTROPAGES_SSO_PUBLIC_JWK",
  ]) {
    assert.equal(manifest.secrets.requiredForGeneratedSiteDeployment.includes(name), true, `${name} must be declared`);
  }
  assert.equal(manifest.secrets.requiredForGeneratedSiteDeployment.includes("BUILDER_MCP_TOKEN"), false);
  assert.equal(manifest.secrets.requiredForGeneratedSiteDeployment.includes("BUILDER_MCP_PROVISION_SECRET"), false);
});

test("SSO default target is EmDash content studio and source does not declare generated-site admin", () => {
  const adminSso = read("src/server/aggregator/admin-sso.ts");
  assert.match(adminSso, /url\.searchParams\.get\("next"\)\s*\?\?\s*"\/_emdash\/admin"/);
  assert.doesNotMatch(adminSso, /\/astropages\/admin/);

  assert.doesNotMatch(read("template.manifest.json"), /\/astropages\/admin/);
  for (const path of deploymentWorkflowPaths(root)) {
    assert.doesNotMatch(read(path), /\/astropages\/admin/, `${path} must not reference generated-site admin`);
  }
});

test("generated-site admin dashboard implementation files are absent", () => {
  for (const path of [
    "src/pages/astropages/admin.astro",
    "src/pages/astropages/admin/index.astro",
    "src/pages/astropages/admin/overview.astro",
    "src/server/aggregator/admin-auth.ts",
    "src/server/aggregator/admin-store.ts",
  ]) {
    assert.equal(existsSync(new URL(path, root)), false, `${path} must not exist`);
  }
});

test("Cloudflare runtime contract validates local, preview, and production bindings", () => {
  const failures = validateCloudflareRuntimeConfig(loadWranglerConfig(root.pathname));
  assert.deepEqual(failures, []);
});

test("Vite build warning policy is scoped to known generated-site noise", () => {
  const config = read("astro.config.mjs");

  assert.match(config, /chunkSizeWarningLimit:\s*3000/);
  assert.match(config, /UNUSED_EXTERNAL_IMPORT/);
  assert.match(config, /node:module/);
  assert.match(config, /createRequire/);
  assert.match(config, /node_modules\/emdash/);
  assert.match(config, /onLog\(level,\s*log,\s*handler\)/);
  assert.match(config, /handler\(level,\s*log\)/);
  assert.match(config, /warn\(warning\)/);
});

test("D1 schema contract is limited to base runtime and auth infrastructure", () => {
  assert.deepEqual(Object.keys(schemaContract.requiredTables), [...baseTables]);
  for (const forbidden of [
    "ap_report_orders",
    "ap_puja_orders",
    "ap_product_orders",
    "ap_consultation_bookings",
    "ap_admin_audit_events",
  ]) {
    assert.equal(schemaContract.forbiddenTables.includes(forbidden), true, `${forbidden} must stay forbidden`);
  }
});

test("deployment workflows keep required command order and smoke only core routes", () => {
  const orderedMarkers = [
    "pnpm install --frozen-lockfile",
    "pnpm run test",
    "pnpm run scan:safety",
    "pnpm run d1:schema:check",
    "pnpm run typecheck",
    "pnpm run build",
    "node scripts/ensure-cloudflare-resources.mjs",
    "node scripts/render-wrangler-config.mjs",
    "node scripts/write-worker-secrets-file.mjs",
    "wrangler d1 migrations apply",
    "wrangler deploy",
    "node scripts/prepare-deployed-emdash.mjs",
    'smoke "/api/astropages/generated-site/health"',
    'smoke "/api/astropages/generated-site/edit-readiness"',
  ];

  for (const workflow of deploymentWorkflowPaths(root)) {
    const text = read(workflow);
    let previous = -1;
    for (const marker of orderedMarkers) {
      const index = text.indexOf(marker);
      assert.notEqual(index, -1, `${workflow} must include ${marker}`);
      assert.equal(index > previous, true, `${workflow} must order ${marker} after prior deployment stages`);
      previous = index;
    }
    assert.doesNotMatch(text, /\/astropages\/admin/);
    assert.doesNotMatch(text, /\/consultations|\/puja-services|\/reports|\/shop/);
  }
});

test("localization manifest and localization contract stay aligned", () => {
  const manifest = readJson("template.manifest.json");
  const contract = read("src/data/localization-contract.ts");
  const catalogCodes = [...contract.matchAll(/code:\s*"([^"]+)"/g)].map((match) => match[1]);
  const activeMatch = /activeLocaleCodes\s*=\s*\[([^\]]+)\]/.exec(contract);
  const activeCodes = activeMatch?.[1].match(/"([^"]+)"/g)?.map((value) => value.replaceAll('"', "")) ?? [];

  assert.deepEqual(manifest.localization.availableLocaleCatalog, catalogCodes);
  assert.deepEqual(manifest.localization.activeLocales, activeCodes);
  assert.equal(manifest.localization.requiredDefaultLocale, "en");
  assert.equal(manifest.localization.rtlSupported, false);
  assert.equal(/rtlSupported\s*=\s*false/.test(contract), true);
});

test("core environment examples document deployment and SSO names", () => {
  const examples = [".env.example", ".dev.vars.example"].map(read).join("\n");
  for (const name of [
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_DEV_WORKERS_SUBDOMAIN",
    "EMDASH_ENCRYPTION_KEY",
    "BUILDER_MCP_TOKEN",
    "BUILDER_MCP_PROVISION_SECRET",
    "ASTROPAGES_CONTROL_PLANE_CALLBACK_TOKEN",
    "ASTROPAGES_CONTROL_PLANE_CALLBACK_BASE_URL",
    "ASTROPAGES_SSO_PUBLIC_JWK",
    "CLOUDFLARE_SECRETS_STORE_ID",
    "GH_REPOSITORY_VARIABLES_TOKEN",
    "PREVIEW_SITE_D1_DATABASE_ID",
    "PREVIEW_SITE_SESSION_KV_NAMESPACE_ID",
    "PREVIEW_SITE_URL",
    "PRODUCTION_SITE_D1_DATABASE_ID",
    "PRODUCTION_SITE_SESSION_KV_NAMESPACE_ID",
    "PRODUCTION_SITE_URL",
  ]) {
    assert.match(examples, new RegExp(`\\b${name}\\b`), `${name} must be documented`);
  }
});
