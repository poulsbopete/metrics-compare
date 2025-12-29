import { NextResponse } from 'next/server';
import { trace } from '@opentelemetry/api';

// Explicitly create traces for this endpoint
export async function GET() {
  const tracer = trace.getTracer('metrics-compare-api', '1.0.0');
  
  return tracer.startActiveSpan('health-check', {
    attributes: {
      'http.method': 'GET',
      'http.route': '/api/health',
      'service.name': 'metrics-compare',
      'endpoint.type': 'health',
    }
  }, async (span) => {
    try {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 5));
      
      span.setAttribute('http.status_code', 200);
      span.setAttribute('response.status', 'ok');
      
      const spanContext = span.spanContext();
      span.end();
      
      return NextResponse.json({ 
        status: 'ok', 
        service: 'metrics-compare',
        timestamp: new Date().toISOString(),
        message: 'Service is healthy and sending traces to Elastic',
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      });
    } catch (error) {
      span.recordException(error as Error);
      span.setAttribute('http.status_code', 500);
      span.end();
      throw error;
    }
  });
}

