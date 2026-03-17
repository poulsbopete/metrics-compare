export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { OTLPMetricExporter } = await import(
      "@opentelemetry/exporter-metrics-otlp-http"
    );
    const { OTLPLogExporter } = await import(
      "@opentelemetry/exporter-logs-otlp-http"
    );
    const { Resource } = await import("@opentelemetry/resources");
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } =
      await import("@opentelemetry/semantic-conventions");
    const { getNodeAutoInstrumentations } = await import(
      "@opentelemetry/auto-instrumentations-node"
    );
    const { MeterProvider, PeriodicExportingMetricReader } = await import(
      "@opentelemetry/sdk-metrics"
    );
    const { LoggerProvider, SimpleLogRecordProcessor } = await import(
      "@opentelemetry/sdk-logs"
    );
    const { SimpleSpanProcessor } = await import("@opentelemetry/sdk-trace-base");
    const { logs } = await import("@opentelemetry/api-logs");

    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
    const apiKey = process.env.OTEL_API_KEY?.trim();

    if (!endpoint || !apiKey) {
      console.warn(
        "[OTel] Missing OTEL_EXPORTER_OTLP_ENDPOINT or OTEL_API_KEY — skipping instrumentation."
      );
      return;
    }

    const base = endpoint.replace(/\/$/, "");
    const authHeaders = { Authorization: `ApiKey ${apiKey}` };

    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]:
        process.env.OTEL_SERVICE_NAME || "metrics-compare",
      [SEMRESATTRS_SERVICE_VERSION]: "1.0.0",
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]:
        process.env.OTEL_DEPLOYMENT_ENVIRONMENT || "production",
    });

    // ── Traces ──────────────────────────────────────────────────────────────
    const traceExporter = new OTLPTraceExporter({
      url: `${base}/v1/traces`,
      headers: authHeaders,
    });

    // ── Metrics ─────────────────────────────────────────────────────────────
    const metricExporter = new OTLPMetricExporter({
      url: `${base}/v1/metrics`,
      headers: authHeaders,
    });

    const meterProvider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 5_000,
        }),
      ],
    });

    const { metrics } = await import("@opentelemetry/api");
    metrics.setGlobalMeterProvider(meterProvider);

    // ── Logs ─────────────────────────────────────────────────────────────────
    const logExporter = new OTLPLogExporter({
      url: `${base}/v1/logs`,
      headers: authHeaders,
    });

    const loggerProvider = new LoggerProvider({ resource });
    loggerProvider.addLogRecordProcessor(
      new SimpleLogRecordProcessor(logExporter)
    );
    logs.setGlobalLoggerProvider(loggerProvider);

    // ── SDK (traces + auto-instrumentation) ─────────────────────────────────
    // Use SimpleSpanProcessor so each span is exported synchronously before
    // the Vercel function exits (BatchSpanProcessor loses data in serverless).
    const sdk = new NodeSDK({
      resource,
      spanProcessors: [new SimpleSpanProcessor(traceExporter)],
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-winston": { enabled: false },
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });

    try {
      sdk.start();

      const serviceName = process.env.OTEL_SERVICE_NAME || "metrics-compare";
      console.log(`[OTel] Initialized — service: ${serviceName}`);
      console.log(`[OTel]   traces  → ${base}/v1/traces`);
      console.log(`[OTel]   metrics → ${base}/v1/metrics`);
      console.log(`[OTel]   logs    → ${base}/v1/logs`);

      // Emit a startup log record to Elastic
      const logger = logs.getLogger("metrics-compare", "1.0.0");
      logger.emit({
        severityText: "INFO",
        body: `[metrics-compare] OTel instrumentation started — service: ${serviceName}`,
        attributes: { "init.timestamp": new Date().toISOString() },
      });

      // Send a startup trace so you can verify connectivity immediately
      const { trace } = await import("@opentelemetry/api");
      const tracer = trace.getTracer("metrics-compare", "1.0.0");
      const span = tracer.startSpan("startup");
      span.setAttribute("service.name", serviceName);
      span.end();
    } catch (err) {
      console.error("[OTel] Failed to start SDK:", err);
    }
  }
}
