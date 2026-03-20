# Dashboards

## metrics-compare — App Observability

Dashboard definition: **`metrics-compare-observability.json`**

Uses the **Kibana Dashboards API** (Kibana 9.4+) with **ES|QL** for all panels:

- **Traces:** request count, avg duration, requests over time, duration over time
- **Logs:** total events, errors, log rate over time, errors-by-type table
- **Metrics:** Node.js event loop delay over time

Data is filtered to `resource.attributes.service.name == "metrics-compare"` where applicable.

### Deploy to Kibana

**Option 1 — Deploy script (recommended)**

```bash
export KIBANA_URL="https://otel-demo-a5630c.kb.us-east-1.aws.elastic.cloud"
export KIBANA_API_KEY="<your Kibana API key>"
node scripts/deploy-dashboard.js
```

**Option 2 — Skill script**

From repo root, using the kibana-dashboards skill script:

```bash
export KIBANA_URL="https://otel-demo-a5630c.kb.us-east-1.aws.elastic.cloud"
export KIBANA_API_KEY="<your Kibana API key>"
node .agents/skills/kibana-dashboards/scripts/kibana-dashboards.js dashboard create dashboards/metrics-compare-observability.json
```

**Option 3 — cURL**

```bash
curl -s -X POST "${KIBANA_URL}/api/dashboards" \
  -H "Content-Type: application/json" \
  -H "Elastic-Api-Version: 1" \
  -H "Authorization: ApiKey ${KIBANA_API_KEY}" \
  -d @dashboards/metrics-compare-observability.json
```

(If the JSON has a top-level `description`, strip it or ensure your Kibana version accepts it; the API expects `title`, `panels`, and optionally `time_range`.)

### Requirements

- **Kibana 9.4+** for the Dashboards API and ES|QL Lens panels.
- **API key** with access to the `traces-apm*`, `logs-generic.otel-default`, and `metrics-generic.otel-default` data streams.
