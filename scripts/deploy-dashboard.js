#!/usr/bin/env node
/**
 * Deploy the metrics-compare observability dashboard to Kibana using the
 * Dashboards API (POST /api/dashboards, Elastic-Api-Version: 1).
 *
 * Requires: KIBANA_URL, and one of KIBANA_API_KEY or (KIBANA_USERNAME + KIBANA_PASSWORD)
 *
 * Usage:
 *   node scripts/deploy-dashboard.js
 *   KIBANA_URL=https://your-deployment.kb.region.aws.elastic.cloud KIBANA_API_KEY=... node scripts/deploy-dashboard.js
 */

const fs = require("fs");
const path = require("path");

const KIBANA_URL = process.env.KIBANA_URL?.replace(/\/$/, "");
const KIBANA_API_KEY = process.env.KIBANA_API_KEY;
const KIBANA_USERNAME = process.env.KIBANA_USERNAME;
const KIBANA_PASSWORD = process.env.KIBANA_PASSWORD;

if (!KIBANA_URL) {
  console.error("Missing KIBANA_URL. Example: https://otel-demo-a5630c.kb.us-east-1.aws.elastic.cloud");
  process.exit(1);
}

const auth =
  KIBANA_API_KEY
    ? { Authorization: `ApiKey ${KIBANA_API_KEY}` }
    : KIBANA_USERNAME && KIBANA_PASSWORD
      ? { Authorization: "Basic " + Buffer.from(`${KIBANA_USERNAME}:${KIBANA_PASSWORD}`).toString("base64") }
      : null;

if (!auth) {
  console.error("Set KIBANA_API_KEY or (KIBANA_USERNAME + KIBANA_PASSWORD)");
  process.exit(1);
}

const dashboardPath = path.join(__dirname, "..", "dashboards", "metrics-compare-observability.json");
const raw = fs.readFileSync(dashboardPath, "utf-8");
const definition = JSON.parse(raw);

// New Dashboards API expects flat body: title, panels, time_range (description optional)
const body = {
  title: definition.title,
  panels: definition.panels,
  time_range: definition.time_range || { from: "now-90d", to: "now" },
};
if (definition.description) body.description = definition.description;

async function main() {
  const res = await fetch(`${KIBANA_URL}/api/dashboards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Elastic-Api-Version": "1",
      ...auth,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Dashboard API error:", res.status, res.statusText);
    console.error(text);
    process.exit(1);
  }

  const data = await res.json();
  const id = data.id ?? data.data?.id;
  console.log("Dashboard created successfully.");
  console.log("URL:", `${KIBANA_URL}/app/dashboards#/view/${id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
