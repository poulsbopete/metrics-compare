#!/usr/bin/env node
/**
 * Test Elasticsearch connection.
 *
 * Uses ELASTICSEARCH_URL + ELASTICSEARCH_API_KEY, or derives ES URL from
 * KIBANA_URL / OTEL_EXPORTER_OTLP_ENDPOINT and uses ELASTICSEARCH_API_KEY or OTEL_API_KEY.
 * Loads .env.local from repo root if present.
 *
 * Usage:
 *   node scripts/test-elasticsearch-connection.js
 *   ELASTICSEARCH_URL=https://... ELASTICSEARCH_API_KEY=... node scripts/test-elasticsearch-connection.js
 */

const path = require("path");
const fs = require("fs");
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  });
}

function getEsUrl() {
  const url = process.env.ELASTICSEARCH_URL;
  if (url) return url.replace(/\/$/, "");
  const kibana = process.env.KIBANA_URL || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (kibana) {
    const base = kibana.replace(/\/$/, "").replace(/^https?:\/\//, "");
    if (base.includes(".apm.")) return "https://" + base.replace(".apm.", ".es.");
    if (base.includes(".kb.")) return "https://" + base.replace(".kb.", ".es.");
  }
  return null;
}

const ES_URL = getEsUrl();
const ES_API_KEY = process.env.ELASTICSEARCH_API_KEY || process.env.OTEL_API_KEY;

if (!ES_URL) {
  console.error("Set ELASTICSEARCH_URL or KIBANA_URL (or OTEL_EXPORTER_OTLP_ENDPOINT)");
  process.exit(1);
}

if (!ES_API_KEY) {
  console.error("Set ELASTICSEARCH_API_KEY or OTEL_API_KEY");
  process.exit(1);
}

async function main() {
  console.log("Testing Elasticsearch connection...");
  console.log("URL:", ES_URL);

  const res = await fetch(`${ES_URL}/`, {
    method: "GET",
    headers: {
      Authorization: `ApiKey ${ES_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Connection failed:", res.status, res.statusText);
    console.error(text);
    process.exit(1);
  }

  const info = await res.json();
  const version = info.version?.number ?? info.version;
  const clusterName = info.cluster_name;
  console.log("OK — Connected to Elasticsearch");
  if (version) console.log("Version:", version);
  if (clusterName) console.log("Cluster:", clusterName);

  const healthRes = await fetch(`${ES_URL}/_cluster/health?pretty`, {
    headers: { Authorization: `ApiKey ${ES_API_KEY}` },
  });
  if (healthRes.ok) {
    const health = await healthRes.json();
    console.log("Cluster health:", health.status);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
