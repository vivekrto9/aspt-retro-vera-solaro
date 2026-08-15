import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const readJson = (path) => JSON.parse(read(path));

test("base template exposes a minimal generic manifest", () => {
  const manifest = readJson("template.manifest.json");
  assert.equal(manifest.templateKey, "astropages-base-template");
  assert.equal(manifest.displayName, "AstroPages Base Template");
  assert.deepEqual(manifest.supportedCapabilities, [
    "capability-content-seo-localization@0.3.0",
    "capability-generated-site-operations@0.3.0",
    "capability-customer-auth@0.1.0",
    "capability-transactional-notifications@0.3.0",
  ]);
  assert.deepEqual(manifest.routes.visitorRoutes.map((route) => route.path), [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ]);
});

test("domain-specific pages and folders are not present", () => {
  for (const path of [
    "src/pages/reports.astro",
    "src/pages/puja-services.astro",
    "src/pages/shop.astro",
    "src/pages/horoscope.astro",
    "src/pages/free-tools.astro",
    "src/lib/astrology",
  ]) {
    assert.equal(existsSync(new URL(path, root)), false, `${path} should not be in the base template`);
  }
});

test("runtime schema is reduced to generic starter tables", () => {
  const migration = read("migrations/0001_base_runtime.sql");
  const authMigration = read("migrations/0002_customer_auth.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS ap_runtime_config/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS ap_admin_sessions/);
  assert.doesNotMatch(migration, /ap_report_orders|ap_puja_orders|ap_product_orders|ap_consultation_bookings/);
  assert.match(authMigration, /CREATE TABLE IF NOT EXISTS ap_customer_accounts/);
  assert.match(authMigration, /CREATE TABLE IF NOT EXISTS ap_customer_sessions/);
  assert.match(authMigration, /CREATE TABLE IF NOT EXISTS ap_customer_password_resets/);
  const leadsMigration = read("migrations/0005_leads.sql");
  assert.match(leadsMigration, /CREATE TABLE IF NOT EXISTS ap_business_events/);
  assert.match(leadsMigration, /CREATE TABLE IF NOT EXISTS ap_leads/);
});

test("analytics MCP hook is present without project-specific analytics tables", () => {
  assert.equal(existsSync(new URL("src/server/aggregator/analytics-mcp.ts", root)), true);
  assert.equal(existsSync(new URL("src/server/aggregator/analytics-query.ts", root)), true);

  const worker = read("src/worker.ts");
  const query = read("src/server/aggregator/analytics-query.ts");
  assert.match(worker, /maybeHandleAnalyticsMcpToolCall/);
  assert.match(query, /no project-specific analytics adapters/i);
  assert.doesNotMatch(query, /ap_report_orders|ap_puja_orders|ap_product_orders|ap_consultation_bookings|ap_bookings/);
});

test("customer auth pages and APIs are present", () => {
  for (const path of [
    "src/pages/login.astro",
    "src/pages/signup.astro",
    "src/pages/forgot-password.astro",
    "src/pages/reset-password.astro",
    "src/pages/api/astropages/generated-site/customer-auth/login.ts",
    "src/pages/api/astropages/generated-site/customer-auth/signup.ts",
    "src/pages/api/astropages/generated-site/customer-auth/request-password-reset.ts",
    "src/pages/api/astropages/generated-site/customer-auth/reset-password.ts",
    "src/pages/api/astropages/generated-site/customer-auth/logout.ts",
    "src/pages/api/astropages/generated-site/customer-auth/me.ts",
    "src/server/aggregator/customer-auth.ts",
  ]) {
    assert.equal(existsSync(new URL(path, root)), true, `${path} should be in the base template`);
  }
});
