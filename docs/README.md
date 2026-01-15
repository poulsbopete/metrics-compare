# Metrics Cost Comparison Tool

A Next.js application that helps you compare the costs of different observability platforms based on metric volume and tag cardinality.

## Features

- **Interactive Metric Volume Slider**: Adjust base metrics per second
- **Tag Management**: Add tags to see how cardinality explosion affects metric volume
- **Cost Comparison**: Compare monthly and annual costs across multiple platforms:
  - **Cloud/SaaS Platforms:**
    - Elastic Serverless
    - Datadog
    - New Relic
    - Splunk Observability
    - Dynatrace
    - Grafana Cloud
    - Chronosphere
  - **Self-Hosted Solutions:**
    - Elastic (Self-hosted)
    - Prometheus (Self-hosted)
    - Thanos (Self-hosted)
    - VictoriaMetrics (Self-hosted)
    - Cortex (Self-hosted)
- **Real-time Calculations**: See cost impacts instantly as you adjust parameters

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

**Required for OpenTelemetry:**

Create a `.env.local` file in the root directory with the following variables:

```bash
# OpenTelemetry Configuration (REQUIRED)
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-deployment-id.ingest.region.aws.elastic.cloud:443
OTEL_API_KEY=your-elastic-api-key-here

# Optional OpenTelemetry Configuration
OTEL_SERVICE_NAME=metrics-compare
OTEL_SERVICE_VERSION=0.1.0
OTEL_DEPLOYMENT_ENVIRONMENT=production
```

**Note:** `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_API_KEY` are **required**. OpenTelemetry will not initialize without them. Get these values from your Elastic Cloud dashboard.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Deployment to Vercel

1. Push your code to a Git repository
2. Import the project in Vercel
3. Vercel will automatically detect Next.js and configure the build settings
4. **Set environment variables in Vercel Dashboard:**
   - Go to your project settings → Environment Variables
   - See `VERCEL_ENV_SETUP.md` for detailed instructions
   - **Required:** `OTEL_API_KEY` (mark as sensitive)
   - **Optional:** `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_SERVICE_VERSION`, `OTEL_DEPLOYMENT_ENVIRONMENT`
   - The app will automatically use `VERCEL_ENV` if `OTEL_DEPLOYMENT_ENVIRONMENT` is not set

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## How It Works

The tool calculates metric volume by:
1. Starting with a base volume (metrics per second)
2. Multiplying by the number of unique tag values for each tag added
3. Converting to monthly volume
4. Calculating costs based on each platform's pricing model

This demonstrates how adding tags with high cardinality can dramatically increase metric volume and costs.

## OpenTelemetry Integration

The app includes OpenTelemetry instrumentation that automatically sends traces and metrics to Elastic Observability. The instrumentation:

- Automatically instruments Node.js and Next.js operations
- Sends traces and metrics to the configured Elastic endpoint
- Includes service metadata (name, version, environment)
- Works in both development and production environments

To configure OpenTelemetry, set the environment variables in `.env.local` or in your Vercel project settings.

## License

MIT

