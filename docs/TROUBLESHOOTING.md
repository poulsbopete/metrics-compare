# Troubleshooting OpenTelemetry Traces in Elastic

If you're not seeing traces in Elastic, follow these steps:

## 1. Check Vercel Environment Variables

**Critical:** Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

- `OTEL_EXPORTER_OTLP_ENDPOINT` - Your Elastic OTLP endpoint
- `OTEL_API_KEY` - Your Elastic API key

**Verify they're set:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure both variables are present and have correct values
3. Make sure they're enabled for the correct environments (Production, Preview, Development)

## 2. Check Vercel Build Logs

After deployment, check the build logs for:

```
============================================================
OpenTelemetry instrumentation initialized
Service Name: metrics-compare
Environment: production
Traces Endpoint: https://your-endpoint/v1/traces
Metrics Endpoint: https://your-endpoint/v1/metrics
API Key configured: Yes (***xxxx)
============================================================
Test span created and sent
```

**If you see this warning instead:**
```
OpenTelemetry: OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_API_KEY must be set. Skipping instrumentation.
```

**This means environment variables are NOT set correctly in Vercel.**

## 3. Check Vercel Runtime Logs

After deployment, visit your app and check the Function Logs in Vercel:

1. Go to Vercel Dashboard → Your Project → Functions
2. Look for logs showing the initialization message
3. Check for any errors related to OpenTelemetry

## 4. Test the Trace Endpoint

Visit these URLs to generate traces:

- `https://your-app.vercel.app/api/health` - Simple health check
- `https://your-app.vercel.app/api/trace-test` - Explicit trace test with span details

The `/api/trace-test` endpoint will return a response with trace ID and span ID if tracing is working.

## 5. Verify Elastic Endpoint Format

Your `OTEL_EXPORTER_OTLP_ENDPOINT` should be in this format:

```
https://your-deployment-id.ingest.region.aws.elastic.cloud:443
```

**Common issues:**
- ❌ Missing `:443` port
- ❌ Missing `https://` protocol
- ❌ Trailing slash (should NOT have `/` at the end)
- ❌ Wrong region or deployment ID

## 6. Verify API Key Format

Your Elastic API key should be a base64-encoded string. You can generate one in:
- Elastic Cloud Dashboard → Management → API Keys

## 7. Check Elastic Service Inventory

1. Go to Elastic Observability → Applications → Service inventory
2. Look for service name: `metrics-compare` (or your custom `OTEL_SERVICE_NAME`)
3. Make sure the time range includes recent activity
4. Try refreshing the page

## 8. Enable Debug Logging

Add this environment variable in Vercel to get more detailed logs:

```
OTEL_LOG_LEVEL=debug
```

This will show detailed OpenTelemetry logs in your Vercel function logs.

## 9. Common Issues

### Issue: "Skipping instrumentation" warning
**Solution:** Environment variables are not set. Add them in Vercel Dashboard.

### Issue: Traces appear but service name is wrong
**Solution:** Set `OTEL_SERVICE_NAME` environment variable in Vercel.

### Issue: No traces after several minutes
**Solution:** 
- Check that the endpoint URL is correct
- Verify the API key has proper permissions
- Check Vercel function logs for export errors

### Issue: Traces appear in wrong environment
**Solution:** Set `OTEL_DEPLOYMENT_ENVIRONMENT` to match your Vercel environment (production, preview, development).

## 10. Still Not Working?

1. **Check Vercel Function Logs** - Look for any errors or warnings
2. **Verify Endpoint Connectivity** - Try accessing the endpoint directly (may require authentication)
3. **Check Elastic API Key Permissions** - Ensure it has permissions to write traces
4. **Review Elastic Documentation** - https://www.elastic.co/guide/en/observability/current/opentelemetry.html

## Quick Test

After setting environment variables and redeploying:

1. Visit: `https://your-app.vercel.app/api/trace-test`
2. Check the response - it should include `traceId` and `spanId`
3. Wait 1-2 minutes
4. Check Elastic Service inventory for `metrics-compare`

If the trace-test endpoint returns trace IDs, tracing is working and data should appear in Elastic within a few minutes.

