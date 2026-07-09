import type { ElasticServerlessPricingOptions } from "./elasticServerlessPricing";
import {
  DEFAULT_DATADOG_HOST_PRICING,
  type DatadogHostPricingOptions,
} from "./datadogPricing";
import {
  DEFAULT_DYNATRACE_APPSEC_PRICING,
  type DynatraceAppSecPricingOptions,
} from "./dynatracePricing";
import { DEFAULT_ELASTIC_PRICING_OPTIONS } from "./elasticServerlessPricing";
import {
  DEFAULT_ELASTIC_STREAMS_TCO,
  type ElasticStreamsTcoPolicy,
} from "./elasticStreamsTco";

export interface TcoPricingContext {
  elastic: ElasticServerlessPricingOptions;
  datadog: DatadogHostPricingOptions;
  dynatrace: DynatraceAppSecPricingOptions;
  streams: ElasticStreamsTcoPolicy;
}

export const DEFAULT_TCO_PRICING_CONTEXT: TcoPricingContext = {
  elastic: DEFAULT_ELASTIC_PRICING_OPTIONS,
  datadog: DEFAULT_DATADOG_HOST_PRICING,
  dynatrace: DEFAULT_DYNATRACE_APPSEC_PRICING,
  streams: DEFAULT_ELASTIC_STREAMS_TCO,
};
