import assert from "node:assert/strict";
import test from "node:test";

import { maybeHandleAnalyticsMcpToolCall } from "../src/server/aggregator/analytics-mcp.ts";

const db = {
  prepare(sql) {
    return {
      bind() {
        return {
          async all() {
            return { results: [] };
          },
          async first() {
            return sql.includes("_emdash_api_tokens")
              ? { id: "test-token", scopes: "analytics:read", expires_at: null }
              : null;
          },
        };
      },
    };
  },
};

test("routes authenticated Sales MCP calls through the template adapter", async () => {
  const response = await maybeHandleAnalyticsMcpToolCall(new Request("https://example.com/_emdash/api/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "sales_schema", arguments: {} },
    }),
  }), { DB: db });

  assert.ok(response);
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.result.structuredContent.contract, "sales-mcp.v1");
  assert.equal(payload.result.structuredContent.semanticModel, "commerce.v1");
});
