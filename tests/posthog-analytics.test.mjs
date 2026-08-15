import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("shared layout installs the immediate PostHog bootstrap", () => {
  const layout = read("src/layouts/BaseLayout.astro");
  const client = read("src/scripts/posthog-analytics.ts");

  assert.match(layout, /getPublicPosthogConfig/);
  assert.match(layout, /data-posthog-config/);
  assert.match(layout, /Analytics consent UI is intentionally disabled/);
  assert.match(layout, /posthog-analytics\.ts/);
  assert.match(client, /capture_pageview:\s*true/);
  assert.match(client, /capture_pageleave:\s*true/);
  assert.match(client, /autocapture:\s*true/);
  assert.match(client, /Analytics consent is intentionally disabled/);
  assert.match(client, /if \(config\.enabled && projectApiKey\) \{\s*\/\/ Analytics consent is intentionally disabled[\s\S]*?void initializePosthog\(\);/);
  assert.doesNotMatch(client, /phc_[a-z0-9]+/i);
  assert.doesNotMatch(layout, /phx_[a-z0-9]+/i);
});

test("template manifest declares PostHog runtime values without an analytics file", () => {
  const manifest = JSON.parse(read("template.manifest.json"));
  assert.equal(Object.hasOwn(manifest, "analytics"), false);
  for (const key of ["POSTHOG_PROJECT_API_KEY", "POSTHOG_HOST", "POSTHOG_PROJECT_ID"]) {
    assert.equal(manifest.secrets.generatedSiteRuntimeConfig.includes(key), true, `${key} must sync to generated sites`);
    assert.equal(manifest.secrets.providerCredentials.includes(key), true, `${key} must be declared as a provider value`);
  }
});

test("public PostHog config reads runtime values without exposing the personal key", async () => {
  const source = read("src/server/aggregator/integrations/posthog.ts");
  assert.match(source, /POSTHOG_PROJECT_API_KEY/);
  assert.match(source, /POSTHOG_HOST/);
  assert.doesNotMatch(source, /POSTHOG_PERSONAL_API_KEY/);

  const { getPublicPosthogConfig } = await import("../src/server/aggregator/integrations/posthog.ts");
  const config = await getPublicPosthogConfig({
    ASTROPAGES_PROJECT_ID: "posthog-test-project",
    ASTROPAGES_SITE_ENVIRONMENT: "preview",
    DB: {
      prepare: () => ({
        bind: () => undefined,
        all: async () => ({
          results: [
            { key: "POSTHOG_PROJECT_API_KEY", value: "project-token" },
            { key: "POSTHOG_HOST", value: "us.i.posthog.com/ignored-path" },
            { key: "POSTHOG_PERSONAL_API_KEY", value: "must-not-be-read" },
          ],
        }),
      }),
    },
  });

  assert.deepEqual(config, {
    enabled: true,
    projectApiKey: "project-token",
    host: "https://us.i.posthog.com",
  });
});
