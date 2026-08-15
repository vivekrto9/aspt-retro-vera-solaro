import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const readJson = (path) => JSON.parse(read(path));

const docs = {
  readme: read("README.md"),
  agents: read("AGENTS.md"),
  cloudflare: read("docs/cloudflare-runtime.md"),
  openhands: read("docs/openhands-playbook.md"),
  leads: read("LEADS.md"),
  productLeads: read("docs/product-lead-generation.md"),
};

test("repository docs describe AstroPages Base Template without stale single-page or legacy catalog guidance", () => {
  const publicDocs = Object.values(docs).join("\n");
  const d1Schema = read("database/d1/001_initial_site_schema.sql");

  assert.match(docs.readme, /# AstroPages Base Template/);
  assert.match(docs.readme, /neutral runnable starter/);
  assert.doesNotMatch(publicDocs, /single-page AstroPages template/i);
  assert.doesNotMatch(publicDocs, /only the home page/i);
  assert.doesNotMatch(d1Schema, /single-page/i);
  assert.doesNotMatch(publicDocs, /templates\/astropages-base-template\/0\.1\.0\//);
  assert.doesNotMatch(publicDocs, /\b(?:PREVIEW_ASTRAGURU|PROD_ASTRAGURU|ASTROCONNECT)\b/);
  assert.match(docs.readme, /AstroPages Admin owns the semantic version, release notes, and changelog/i);
});

test("lead documentation is an agent-ready integration reference", () => {
  assert.match(docs.agents, /LEADS\.md/);
  assert.match(docs.leads, /leads\.v1/);
  assert.match(docs.leads, /linkBusinessLead/);
  assert.match(docs.leads, /markLeadConvertedBySourceReference/);
  assert.match(docs.leads, /wrangler d1 execute astropages-base-template-site --local/);
  assert.match(docs.productLeads, /POST \/api\/astropages\/generated-site\/leads\/product-interest/);
  assert.match(docs.productLeads, /pnpm wrangler dev --local --port 4321/);
});

test("docs keep template and generated-site secret contracts separate", () => {
  assert.match(
    docs.cloudflare,
    /Generated-site Worker runtime secrets are:\s*\n\s*-\s*`EMDASH_ENCRYPTION_KEY`\s*\n\s*-\s*`ASTROPAGES_CONTROL_PLANE_CALLBACK_TOKEN`/m,
  );
  assert.match(docs.agents, /Generated-site Worker deploys must not require `BUILDER_MCP_TOKEN` or `BUILDER_MCP_PROVISION_SECRET`/);
  assert.doesNotMatch(
    `${docs.cloudflare}\n${docs.agents}\n${docs.openhands}`,
    /Generated-site deployments require:[\s\S]*BUILDER_MCP_(?:TOKEN|PROVISION_SECRET)/,
  );
});

test("template release version metadata is owned by AstroPages Admin", () => {
  const manifest = readJson("template.manifest.json");
  const capabilityLock = readJson("capability-lock.json");
  const packageJson = readJson("package.json");
  const bootstrapSource = read("src/server/generated-site/emdash-bootstrap.ts");

  assert.equal(Object.hasOwn(manifest, "version"), false);
  assert.equal(Object.hasOwn(manifest, "registryVersionId"), false);
  assert.equal(Object.hasOwn(capabilityLock, "templateRegistryVersionId"), false);
  assert.equal(Object.hasOwn(packageJson, "version"), false);
  assert.doesNotMatch(bootstrapSource, /bootstrapTemplateVersion/);
});

test("AGENTS.md is a generated-customer-site runbook aligned with base runtime contracts", () => {
  const agents = docs.agents;
  const designLinkages = agents.match(
    /Before every user-facing layout, component, typography, color, styling, imagery, responsive, or interaction change[^\n]+DESIGN_PHILOSOPHY\.md[^\n]+DESIGN\.md/gi,
  ) ?? [];

  assert.equal(designLinkages.length, 1);
  assert.match(agents, /this site|current project/i);
  assert.doesNotMatch(agents, /\bthis (?:repo|repository|template)\b/i);
  assert.doesNotMatch(agents, /template-source mode|future (?:project|site)s?/i);

  assert.match(agents, /work package[^\n]+target branch[^\n]+protected paths[^\n]+mandatory/i);
  assert.match(agents, /exact test command[^\n]+work package/i);
  assert.match(agents, /explicitly selected skills are mandatory/i);
  assert.match(agents, /automatic mode[^\n]+genuinely relevant pinned skills/i);

  assert.match(
    agents,
    /`content_get` → minimal `content_update` with `_rev` → `content_publish` → `content_get`/,
  );
  assert.match(agents, /`content_publish`[^\n]+preview[^\n]+never[^\n]+production/i);
  assert.match(agents, /revision conflict[^\n]+re-?read[^\n]+concurrent changes/i);
  assert.match(agents, /single active query-parameter locale[^\n]+`en`/i);
  assert.match(agents, /`site_pages\/home`/);
  assert.match(agents, /`site_pages\/not_found_page`/);
  assert.match(agents, /`site_chrome\/main`/);

  for (const tool of [
    "asset_list", "asset_get", "asset_create", "asset_import_url",
    "asset_update", "asset_replace", "asset_delete", "asset_restore",
  ]) {
    assert.match(agents, new RegExp(`\\b${tool}\\b`));
  }
  assert.match(agents, /expectedRevisionId/);
  assert.match(agents, /returned `sitePath`/);
  assert.match(agents, /stable asset identity/i);
  assert.match(agents, /never[^\n]+raw R2[^\n]+signed URLs/i);

  assert.match(agents, /no dynamic article collection/i);
  assert.match(agents, /must not invent[^\n]+`posts`/i);
  assert.match(agents, /`ap_leads`/);
  assert.match(agents, /`ap_customer_accounts`/);
  assert.match(agents, /public render[^\n]+read-only/i);
  assert.match(agents, /email_template_render_sample/);
  assert.match(agents, /production promotion[^\n]+control plane/i);

  assert.match(agents, /content-only[^\n]+Git unchanged/i);
  assert.match(agents, /never deploy or publish production/i);
  assert.match(agents, /customer-facing summary/i);
  assert.doesNotMatch(agents, /^pnpm run build$/m);
});
