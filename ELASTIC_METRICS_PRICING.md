# Elastic Serverless Metrics Pricing Guide

## Overview

Elastic Serverless Metrics uses a **volume-based pricing model** (per GB ingested and retained), not a per-metric pricing model. This fundamental difference means that high cardinality (many unique metric series) doesn't directly increase costs proportionally, unlike platforms that charge per metric.

## Pricing Structure

### Base Pricing

**$0.109/GB per month** (Top Volume Tier)
- **Ingest**: $0.09/GB ingested
- **Retention**: $0.019/GB retained per month
- **Tier**: Complete tier, top volume tier pricing (best price for high-volume customers)

> **Note**: There is no official Elastic metrics-only pricing. The pricing shown uses the Elastic Serverless Complete tier pricing as a reference point.

### How Pricing Works

Elastic charges based on **data volume (GB)**, not the number of metrics. This means:

1. **Metrics are converted to GB** based on bytes per datapoint
2. **Total cost = Monthly GB × $0.109/GB**
3. **Cardinality impact is indirect** - high cardinality only increases costs if it increases total data volume

## Metric Type Impact on Pricing

Different metric sources have different bytes per datapoint, which affects how many metrics fit into 1 GB:

| Metric Type | Bytes per Datapoint | Metrics per GB | Cost per 1M Datapoints |
|------------|---------------------|----------------|----------------------|
| **OpenTelemetry** | 488 bytes | ~2.1M metrics | ~$0.05 |
| **Prometheus** | 296 bytes | ~3.4M metrics | ~$0.03 |
| **Elastic Agent/Beats** | 200 bytes | ~5.0M metrics | ~$0.02 |
| **Mixed** | 320 bytes (avg) | ~3.1M metrics | ~$0.03 |

### Why the Difference?

- **OpenTelemetry (488B)**: Includes rich metadata, attributes, and structured data
- **Prometheus (296B)**: More compact format, but still includes labels
- **Elastic Agent/Beats (200B)**: Optimized format with efficient encoding

**Key Insight**: The same number of datapoints will cost more for OpenTelemetry than Prometheus because OTel metrics take up more storage space (488B vs 296B per datapoint).

## Calculation Example

### Scenario: 10,000 metrics/second

**Step 1: Calculate Monthly Metrics**
- 10,000 metrics/sec × 86,400 sec/day × 30 days = **25.92 billion metrics/month**

**Step 2: Convert to GB (using OpenTelemetry)**
- 25.92B metrics × 488 bytes/metric = 12.65 TB
- 12.65 TB ÷ 1,024 = **12.35 GB/month**

**Step 3: Calculate Cost**
- 12.35 GB × $0.109/GB = **$1.35/month**

### Same Scenario with Prometheus

**Step 2: Convert to GB (using Prometheus)**
- 25.92B metrics × 296 bytes/metric = 7.67 TB
- 7.67 TB ÷ 1,024 = **7.49 GB/month**

**Step 3: Calculate Cost**
- 7.49 GB × $0.109/GB = **$0.82/month**

**Result**: Prometheus costs ~40% less than OpenTelemetry for the same number of metrics because Prometheus metrics are more compact.

## Cardinality Impact

### How Elastic Differs from Per-Metric Platforms

**Per-Metric Platforms** (Datadog, Grafana Cloud, New Relic, etc.):
- Each unique metric series is counted separately
- Adding high-cardinality tags multiplies costs directly
- Example: 1 metric with 10 tag values = 10 billed metrics

**Elastic (Volume-Based)**:
- Only total data volume matters
- High cardinality only increases costs if it increases total GB
- Example: 1 metric with 10 tag values might increase data volume slightly, but not proportionally

### Cardinality Example

**Scenario**: 1,000 base metrics with 100 unique tag values

**Per-Metric Platform**:
- 1,000 metrics × 100 tag values = **100,000 billed metrics**
- Cost scales linearly with cardinality

**Elastic**:
- Total data volume depends on how the tags are encoded
- If tags add 20% more data: 1,000 metrics × 1.2 = **1,200 equivalent metrics worth of data**
- Cost scales with data volume, not metric count

**Key Advantage**: Elastic's volume-based model is more predictable and doesn't penalize high-cardinality use cases as severely as per-metric platforms.

## Network Egress Costs

### Standard Egress Pricing

- **Price**: $0.05/GB egress
- **Free Tier**: 50 GB/month free egress
- **Billable**: Data egressed beyond 50 GB/month

### Private Link Option

- **Price with Private Link**: $0.001/GB (near-zero)
- **Benefit**: Reduces egress costs by 98% for high-volume scenarios
- **Use Case**: When egressing large volumes of data from Elastic

### Egress Cost Example

**Scenario**: 100 GB/month egress

**Standard**:
- 100 GB - 50 GB (free tier) = 50 GB billable
- 50 GB × $0.05/GB = **$2.50/month**

**With Private Link**:
- 100 GB × $0.001/GB = **$0.10/month**

**Savings**: $2.40/month (96% reduction)

## Competitive Positioning

### Price Comparison (per 1M datapoints)

| Platform | Price per 1M Datapoints | vs Elastic |
|----------|------------------------|------------|
| **Observe Inc** | $0.008 | 6.25x cheaper |
| **New Relic** | $0.25 | 5x more expensive |
| **Grafana Cloud** | $0.30 (starting tier) | 6x more expensive |
| **Chronosphere** | $0.45 | 9x more expensive |
| **Splunk Observability** | $0.55 | 11x more expensive |
| **Dynatrace** | $0.60 | 12x more expensive |
| **Datadog** | $0.75 | 15x more expensive |
| **Elastic** | ~$0.03-0.05 (varies by metric type) | Baseline |

> **Note**: Elastic pricing shown is for OpenTelemetry (~$0.05 per 1M datapoints). Prometheus and Elastic Agent are even more cost-effective.

### Tier Considerations

**Elastic**:
- Pricing shown: **Top Volume Tier** (best price for high-volume customers)
- No volume discounts needed - already at best price

**Grafana Cloud**:
- Pricing shown: **Starting Tier** ($0.30 per 1M metrics)
- Enterprise tier can go "as low as" $3/GB (~$0.15 per 1M metrics at typical conversion)
- Contact Grafana for Enterprise tier pricing based on volume

**Key Insight**: The comparison uses Elastic's best price vs. Grafana's starting price. For accurate comparison, consider tier differences.

## Value Proposition

### Why Volume-Based Pricing?

1. **Predictable Costs**: Costs scale with data volume, not metric count
2. **Cardinality-Friendly**: High-cardinality metrics don't cause exponential cost growth
3. **Unified Platform**: Metrics, logs, traces, and security in one solution
4. **No Per-Metric Limits**: No artificial limits on metric count
5. **Flexible Ingestion**: Support for multiple metric formats (Prometheus, OTel, StatsD, etc.)

### What's Included

- **Ingestion**: All metric types supported
- **Storage**: Time-series optimized storage
- **Retention**: Configurable retention periods
- **Querying**: Full Elasticsearch query capabilities
- **Visualization**: Kibana dashboards and visualizations
- **Alerting**: Built-in alerting and notification
- **AI/ML**: Elastic AI Assistant and anomaly detection

## Calculator Usage

### How the Calculator Works

1. **Input**: Metrics per second (with optional tags and tag values)
2. **Calculate Volume**: 
   - Base metrics × tag combinations = total metrics
   - Total metrics × bytes per datapoint = total bytes
   - Total bytes ÷ 1,073,741,824 = GB/month
3. **Calculate Cost**:
   - GB/month × $0.109/GB = base cost
   - Add egress costs if enabled
4. **Output**: Monthly and annual costs

### Selecting Metric Type

The calculator allows you to select your primary metric type:
- **OpenTelemetry**: For OTel-native applications
- **Prometheus**: For Prometheus exporters
- **Elastic Agent/Beats**: For Elastic's native agents
- **Mixed**: Weighted average (320 bytes/datapoint)

**Important**: Select the metric type that best matches your primary ingestion method for accurate cost estimates.

## Summary

### Key Takeaways

1. **Volume-Based Model**: Elastic charges per GB, not per metric
2. **Metric Type Matters**: Different metric types have different bytes per datapoint
3. **Cardinality-Friendly**: High cardinality doesn't cause exponential cost growth
4. **Competitive Pricing**: $0.03-0.05 per 1M datapoints (depending on metric type)
5. **Top Volume Tier**: Pricing shown is already at best price tier
6. **Egress Optional**: Network egress costs can be minimized with Private Link

### Best Use Cases

- **High-Cardinality Metrics**: Volume-based model is more cost-effective
- **Multiple Metric Types**: Unified pricing regardless of source
- **Large Volumes**: Top volume tier pricing benefits high-volume customers
- **Unified Observability**: Metrics, logs, traces, and security in one platform

### Questions?

For specific pricing questions or custom volume estimates, contact Elastic sales or use the [Elastic Serverless pricing calculator](https://www.elastic.co/pricing/serverless-observability).

---

**Last Updated**: January 2025  
**Pricing Source**: Elastic Serverless Complete tier (top volume tier)  
**Note**: No official Elastic metrics-only pricing exists; using Complete tier pricing as reference.
