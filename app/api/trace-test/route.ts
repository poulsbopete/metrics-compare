import { NextResponse } from 'next/server';
import { trace } from '@opentelemetry/api';

// This endpoint creates explicit spans to test tracing
export async function GET() {
  const tracer = trace.getTracer('metrics-compare-api');
  
  return tracer.startActiveSpan('trace-test', async (span) => {
    try {
      span.setAttribute('http.method', 'GET');
      span.setAttribute('http.route', '/api/trace-test');
      span.setAttribute('service.name', 'metrics-compare');
      span.setAttribute('test.endpoint', true);
      
      // Create a child span
      const childSpan = tracer.startSpan('trace-test-child');
      childSpan.setAttribute('child.operation', 'test-calculation');
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
      childSpan.end();
      
      const response = NextResponse.json({ 
        status: 'ok', 
        service: 'metrics-compare',
        message: 'Trace test endpoint - check Elastic for traces',
        timestamp: new Date().toISOString(),
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId
      });
      
      span.setAttribute('http.status_code', 200);
      span.end();
      
      return response;
    } catch (error) {
      span.recordException(error as Error);
      span.setAttribute('http.status_code', 500);
      span.end();
      throw error;
    }
  });
}

