import assert from "node:assert/strict";
import test from "node:test";

import { databaseNameForEnvironment } from "../../scripts/wrangler-deploy-target.mjs";

const config = {
  d1_databases: [
    { binding: "DB", database_name: "astropages-base-template-site" },
  ],
  env: {
    preview: {
      d1_databases: [
        { binding: "DB", database_name: "astropages-base-template-preview-site" },
      ],
    },
    production: {
      d1_databases: [
        { binding: "DB", database_name: "astropages-base-template-production-site" },
      ],
    },
  },
};

test("selects the D1 database from the requested deployment environment", () => {
  assert.equal(
    databaseNameForEnvironment(config, "preview"),
    "astropages-base-template-preview-site",
  );
  assert.equal(
    databaseNameForEnvironment(config, "production"),
    "astropages-base-template-production-site",
  );
});

test("does not fall back to the local top-level D1 database", () => {
  assert.throws(
    () => databaseNameForEnvironment(config, "missing"),
    /missing environment/i,
  );
});
