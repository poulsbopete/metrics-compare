export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');
    const { Resource } = await import('@opentelemetry/resources');
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
    const { MeterProvider, PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');

    // Get configuration from environment variables (required in Vercel)
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const apiKey = process.env.OTEL_API_KEY;
    
    // Skip initialization if required environment variables are not set
    if (!endpoint || !apiKey) {
      console.warn('OpenTelemetry: OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_API_KEY must be set. Skipping instrumentation.');
      return;
    }
    
    // Determine environment from Vercel or default
    const deploymentEnv = process.env.OTEL_DEPLOYMENT_ENVIRONMENT || 
                          process.env.VERCEL_ENV || 
                          'production';

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'metrics-compare',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || '0.1.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: deploymentEnv,
    });

    // Set up metrics
    const metricExporter = new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
      headers: {
        Authorization: `ApiKey ${apiKey}`,
      },
    });

    const meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 10000, // Export every 10 seconds
        }),
      ],
    });

    // Set the global meter provider
    const { metrics } = await import('@opentelemetry/api');
    metrics.setGlobalMeterProvider(meterProvider);

    // Set up traces
    const sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
        headers: {
          Authorization: `ApiKey ${apiKey}`,
        },
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    console.log('OpenTelemetry instrumentation initialized');
  }
}

