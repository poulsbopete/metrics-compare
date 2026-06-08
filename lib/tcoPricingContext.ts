import type { ElasticServerlessPricingOptions } from "./elasticServerlessPricing";
import {
  DEFAULT_DATADOG_HOST_PRICING,
  type DatadogHostPricingOptions,
} from "./datadogPricing";
import { DEFAULT_ELASTIC_PRICING_OPTIONS } from "./elasticServerlessPricing";

export interface TcoPricingContext {
  elastic: ElasticServerlessPricingOptions;
  datadog: DatadogHostPricingOptions;
}

export const DEFAULT_TCO_PRICING_CONTEXT: TcoPricingContext = {
  elastic: DEFAULT_ELASTIC_PRICING_OPTIONS,
  datadog: DEFAULT_DATADOG_HOST_PRICING,
};
