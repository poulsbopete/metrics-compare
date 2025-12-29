import { NextResponse } from 'next/server';
import { trace, context } from '@opentelemetry/api';

// Simple endpoint that creates a trace every time it's called
export async function GET() {
  const tracer = trace.getTracer('metrics-compare-ping', '1.0.0');
  
  return tracer.startActiveSpan('trace-ping', {
    attributes: {
      'http.method': 'GET',
      'http.route': '/api/trace-ping',
      'service.name': 'metrics-compare',
      'endpoint.type': 'ping',
      'timestamp': new Date().toISOString(),
    }
  }, async (span) => {
    try {
      // Create multiple child spans to ensure we have a proper trace
      const child1 = tracer.startSpan('ping-operation-1', {}, context.active());
      await new Promise(resolve => setTimeout(resolve, 10));
      child1.setAttribute('operation', 'delay-1');
      child1.end();
      
      const child2 = tracer.startSpan('ping-operation-2', {}, context.active());
      await new Promise(resolve => setTimeout(resolve, 10));
      child2.setAttribute('operation', 'delay-2');
      child2.end();
      
      span.setAttribute('http.status_code', 200);
      span.setAttribute('child.spans', 2);
      
      const spanContext = span.spanContext();
      const isSampled = (spanContext.traceFlags & 1) === 1;
      
      span.end();
      
      return NextResponse.json({ 
        status: 'ok', 
        service: 'metrics-compare',
        message: 'Ping trace created',
        timestamp: new Date().toISOString(),
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        isSampled: isSampled,
        note: isSampled 
          ? 'Trace is sampled and should appear in Elastic within 10-30 seconds'
          : 'WARNING: Trace is NOT sampled - will not appear in Elastic'
      });
    } catch (error) {
      span.recordException(error as Error);
      span.setAttribute('http.status_code', 500);
      span.end();
      throw error;
    }
  });
}

