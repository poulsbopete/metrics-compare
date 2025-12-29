# Vercel Environment Variables Setup

To configure OpenTelemetry to send data to Elastic, set the following environment variables in your Vercel project:

## Required Environment Variables

Go to your Vercel project → Settings → Environment Variables and add:

### 1. OTEL_API_KEY (REQUIRED)
- **Key:** `OTEL_API_KEY`
- **Value:** Your Elastic API key (get from Elastic Cloud dashboard)
- **Environments:** Production, Preview, Development
- **Sensitive:** ✅ Yes (required)
- **Note:** This is required - OpenTelemetry will not initialize without it

### 2. OTEL_EXPORTER_OTLP_ENDPOINT (REQUIRED)
- **Key:** `OTEL_EXPORTER_OTLP_ENDPOINT`
- **Value:** Your Elastic OTLP endpoint (e.g., `https://your-deployment-id.ingest.region.aws.elastic.cloud:443`)
- **Environments:** Production, Preview, Development
- **Sensitive:** ❌ No
- **Note:** This is required - OpenTelemetry will not initialize without it

## Optional Environment Variables

These have defaults but can be customized:

### 3. OTEL_SERVICE_NAME
- **Key:** `OTEL_SERVICE_NAME`
- **Value:** `metrics-compare` (or your custom service name)
- **Environments:** Production, Preview, Development
- **Sensitive:** ❌ No

### 4. OTEL_SERVICE_VERSION
- **Key:** `OTEL_SERVICE_VERSION`
- **Value:** `0.1.0` (or your app version)
- **Environments:** Production, Preview, Development
- **Sensitive:** ❌ No

### 5. OTEL_DEPLOYMENT_ENVIRONMENT
- **Key:** `OTEL_DEPLOYMENT_ENVIRONMENT`
- **Value:** `production` (or `preview`, `development`)
- **Environments:** Production, Preview, Development (set different values per environment)
- **Sensitive:** ❌ No

## Quick Setup

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Create new**
4. Add each variable above
5. For `OTEL_DEPLOYMENT_ENVIRONMENT`, set:
   - `production` for Production environment
   - `preview` for Preview environment
   - `development` for Development environment
6. Click **Save**
7. Redeploy your application for changes to take effect

## Verification

After deployment, check your application logs for:
```
OpenTelemetry instrumentation initialized
```

You should then see traces and metrics appearing in your Elastic Observability dashboard.

