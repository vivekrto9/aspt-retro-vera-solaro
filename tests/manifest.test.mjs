import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync(new URL("../template.manifest.json", import.meta.url), "utf8"));
const leadsManifest = JSON.parse(readFileSync(new URL("../astropages/leads.manifest.json", import.meta.url), "utf8"));

const routePaths = (items) => new Set(items.map((item) => item.path));

test("template manifest keeps base starter identity", () => {
  assert.equal(manifest.templateKey, "astropages-base-template");
  assert.equal(manifest.displayName, "AstroPages Base Template");
  assert.equal(Object.hasOwn(manifest, "version"), false);
  assert.equal(Object.hasOwn(manifest, "registryVersionId"), false);
  assert.equal(Object.hasOwn(manifest, "analytics"), false);
  assert.equal(manifest.leads.required, true);
  assert.equal(manifest.leads.path, "astropages/leads.manifest.json");
});

test("manifest declares reusable generated-site APIs and neutral visitor routes", () => {
  const visitorRoutes = routePaths(manifest.routes.visitorRoutes);
  for (const path of ["/", "/login", "/signup", "/forgot-password", "/reset-password"]) {
    assert.equal(visitorRoutes.has(path), true, `${path} visitor route must be declared`);
  }

  const apiRoutes = routePaths(manifest.routes.generatedSiteApis);
  for (const path of [
    "/api/astropages/generated-site/health",
    "/api/astropages/generated-site/edit-readiness",
    "/api/astropages/generated-site/emdash/bootstrap",
    "/api/astropages/generated-site/content-release/status",
    "/api/astropages/generated-site/content-release/export",
    "/api/astropages/generated-site/content-release/import",
    "/api/astropages/generated-site/runtime-config/sync",
    "/api/astropages/generated-site/sso/exchange",
    "/api/astropages/generated-site/editor/content-field",
    "/api/astropages/generated-site/editor/provision-mcp-token",
    "/api/astropages/generated-site/email-templates",
    "/api/astropages/generated-site/email-templates/render",
    "/api/astropages/generated-site/email-templates/test-send",
    "/api/astropages/generated-site/email-templates/publish",
  ]) {
    assert.equal(apiRoutes.has(path), true, `${path} generated-site API must be declared`);
  }

  for (const path of ["/consultations", "/reports", "/puja-services", "/shop"]) {
    assert.equal(visitorRoutes.has(path), false, `${path} is Pandit-specific and must not be in base`);
  }
});

test("manifest distinguishes template deploy secrets from generated-site deploy secrets", () => {
  assert.equal(manifest.secrets.requiredForTemplateDeployment.includes("BUILDER_MCP_TOKEN"), true);
  assert.equal(manifest.secrets.requiredForTemplateDeployment.includes("BUILDER_MCP_PROVISION_SECRET"), true);

  assert.equal(manifest.secrets.requiredForGeneratedSiteDeployment.includes("EMDASH_ENCRYPTION_KEY"), true);
  assert.equal(
    manifest.secrets.requiredForGeneratedSiteDeployment.includes("ASTROPAGES_CONTROL_PLANE_CALLBACK_TOKEN"),
    true,
  );
  assert.equal(manifest.secrets.requiredForGeneratedSiteDeployment.includes("BUILDER_MCP_TOKEN"), false);
  assert.equal(manifest.secrets.requiredForGeneratedSiteDeployment.includes("BUILDER_MCP_PROVISION_SECRET"), false);
  assert.deepEqual(manifest.secrets.deploymentMapping.generatedSiteWorkerSecrets, [
    "EMDASH_ENCRYPTION_KEY",
    "ASTROPAGES_CONTROL_PLANE_CALLBACK_TOKEN",
  ]);
});

test("manifest declares reusable runtime persistence tables", () => {
  for (const table of [
    "ap_runtime_config",
    "ap_admin_sessions",
    "ap_admin_sso_exchanges",
    "ap_content_revision_log",
    "ap_content_environment_state",
    "ap_emdash_bootstrap_state",
    "ap_customer_accounts",
    "ap_business_events",
    "ap_leads",
    "ap_email_templates",
    "ap_email_events",
    "ap_email_variable_mappings",
  ]) {
    assert.equal(manifest.runtimePersistence.tables.includes(table), true, `${table} must be declared`);
  }
  for (const table of ["ap_report_orders", "ap_puja_orders", "ap_shop_products", "ap_consultation_bookings"]) {
    assert.equal(manifest.runtimePersistence.tables.includes(table), false, `${table} is not part of base`);
  }
});

test("leads manifest exposes the canonical reusable sources", () => {
  assert.equal(leadsManifest.semanticModel, "leads.v1");
  assert.equal(leadsManifest.table, "ap_leads");
  assert.deepEqual(Object.keys(leadsManifest.sources), [
    "consultation_booking",
    "product_order",
    "puja_order",
    "report_order",
    "newsletter",
    "support",
  ]);
});
