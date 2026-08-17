import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const manifestPath = join(process.cwd(), "astropages/secrets.manifest.json");
const raw = readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(raw);

assert.equal(manifest.version, 1, "Secrets manifest version must be 1");
assert.ok(Array.isArray(manifest.integrations), "integrations must be an array");

console.log("Secrets contract is valid.");
