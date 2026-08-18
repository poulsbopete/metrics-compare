/**
 * Grafana Cloud Metrics — Pro list (grafana.com/pricing).
 *
 * Grafana does **not** bill per million datapoints. Usage is billable series:
 *   billable series = max(active series, total DPM / included DPM)
 * Pro includes 1 DPM per series (60s scrape). Faster scrapes increase billable series.
 *
 * Invoice formula: grafana.com/docs/grafana-cloud/.../metrics-invoice
 */

export const GRAFANA_CLOUD_PRICING_URL = "https://grafana.com/pricing";
export const GRAFANA_CLOUD_METRICS_INVOICE_URL =
  "https://grafana.com/docs/grafana-cloud/cost-management-and-billing/understand-your-invoice/metrics-invoice/";

/** Pro platform fee includes 10k active series and 13-month retention. */
export const GRAFANA_CLOUD_PRO_PLATFORM_FEE_USD = 19;
export const GRAFANA_CLOUD_PRO_INCLUDED_SERIES = 10_000;
/** Pro default included resolution (1 datapoint/minute/series). */
export const GRAFANA_CLOUD_INCLUDED_DPM = 1;

export interface GrafanaSeriesTier {
  min: number;
  max?: number;
  pricePerThousand: number;
}

/** Volume discounts on billable series above the included 10k (Pro self-serve). */
export const GRAFANA_CLOUD_PRO_SERIES_TIERS: GrafanaSeriesTier[] = [
  { min: 10_000, max: 100_000, pricePerThousand: 6.5 },
  { min: 100_000, max: 200_000, pricePerThousand: 5.9 },
  { min: 200_000, pricePerThousand: 5.5 },
];

export interface GrafanaCloudMetricsBreakdown {
  samplesPerSecond: number;
  totalDpm: number;
  includedDpm: number;
  billableSeries: number;
  includedSeries: number;
  paidSeries: number;
  platformFee: number;
  seriesCost: number;
  monthlyCost: number;
  effectiveUsdPerThousand: number;
}

/** Samples/sec → total DPM. Billable series use Pro included DPM (default 1). */
export function samplesPerSecondToBillableSeries(
  samplesPerSecond: number,
  includedDpm: number = GRAFANA_CLOUD_INCLUDED_DPM
): number {
  if (samplesPerSecond <= 0) return 0;
  const dpm = Math.max(includedDpm, 1);
  return (samplesPerSecond * 60) / dpm;
}

function tieredSeriesCost(billableSeries: number): number {
  const paid = Math.max(0, billableSeries - GRAFANA_CLOUD_PRO_INCLUDED_SERIES);
  if (paid <= 0) return 0;

  const sorted = [...GRAFANA_CLOUD_PRO_SERIES_TIERS].sort((a, b) => a.min - b.min);
  let remaining = paid;
  let cost = 0;
  let cursor = GRAFANA_CLOUD_PRO_INCLUDED_SERIES;

  for (const tier of sorted) {
    if (remaining <= 0) break;
    if (cursor < tier.min) cursor = tier.min;
    const tierEnd = tier.max ?? Infinity;
    const width = Math.max(0, tierEnd - cursor);
    const billable = Math.min(remaining, width);
    if (billable > 0) {
      cost += (billable / 1_000) * tier.pricePerThousand;
      remaining -= billable;
      cursor += billable;
    }
  }

  return cost;
}

export function calculateGrafanaCloudMetricsCost(
  samplesPerSecond: number
): GrafanaCloudMetricsBreakdown {
  const sps = Math.max(0, samplesPerSecond);
  const totalDpm = sps * 60;
  const billableSeries = samplesPerSecondToBillableSeries(sps);
  const includedSeries = GRAFANA_CLOUD_PRO_INCLUDED_SERIES;
  const paidSeries = Math.max(0, billableSeries - includedSeries);
  const platformFee = GRAFANA_CLOUD_PRO_PLATFORM_FEE_USD;
  const seriesCost = tieredSeriesCost(billableSeries);
  const monthlyCost = platformFee + seriesCost;
  const effectiveUsdPerThousand =
    billableSeries > 0 ? (monthlyCost / billableSeries) * 1_000 : 0;

  return {
    samplesPerSecond: sps,
    totalDpm,
    includedDpm: GRAFANA_CLOUD_INCLUDED_DPM,
    billableSeries,
    includedSeries,
    paidSeries,
    platformFee,
    seriesCost,
    monthlyCost,
    effectiveUsdPerThousand,
  };
}
