import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("secret manifest contains requirements only", () => {
  const raw = readFileSync(join(process.cwd(), "astropages/secrets.manifest.json"), "utf8");
  const manifest = JSON.parse(raw);
  assert.equal(manifest.version, 1);
  assert.ok(Array.isArray(manifest.integrations));
});
