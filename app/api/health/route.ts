import { NextResponse } from 'next/server';

// This route will be automatically traced by OpenTelemetry auto-instrumentations
// The HTTP instrumentation will capture this request automatically
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'metrics-compare',
    timestamp: new Date().toISOString(),
    message: 'Service is healthy and sending traces to Elastic'
  });
}

