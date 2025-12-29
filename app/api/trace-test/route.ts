import { NextResponse } from 'next/server';
import { trace, context } from '@opentelemetry/api';

// This endpoint creates explicit spans to test tracing
export async function GET() {
  const tracer = trace.getTracer('metrics-compare-api', '1.0.0');
  
  // Use startActiveSpan to ensure proper context propagation
  return tracer.startActiveSpan('trace-test', {
    attributes: {
      'http.method': 'GET',
      'http.route': '/api/trace-test',
      'service.name': 'metrics-compare',
      'test.endpoint': true,
    }
  }, async (span) => {
    try {
      // Create a child span
      const childSpan = tracer.startSpan('trace-test-child', {
        attributes: {
          'child.operation': 'test-calculation',
        }
      }, context.active());
      
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
      childSpan.end();
      
      const spanContext = span.spanContext();
      const traceId = spanContext.traceId;
      const spanId = spanContext.spanId;
      const isSampled = (spanContext.traceFlags & 1) === 1;
      
      span.setAttribute('http.status_code', 200);
      span.setAttribute('trace.id', traceId);
      span.setAttribute('span.id', spanId);
      span.setAttribute('sampled', isSampled);
      span.end();
      
      return NextResponse.json({ 
        status: 'ok', 
        service: 'metrics-compare',
        message: 'Trace test endpoint - check Elastic for traces',
        timestamp: new Date().toISOString(),
        traceId: traceId,
        spanId: spanId,
        isSampled: isSampled,
        traceFlags: spanContext.traceFlags.toString(),
        note: traceId === '00000000000000000000000000000000' 
          ? 'WARNING: Tracing not initialized - check environment variables in Vercel' 
          : isSampled 
            ? 'Tracing is working and sampled - should appear in Elastic'
            : 'WARNING: Trace created but not sampled - may not appear in Elastic'
      });
    } catch (error) {
      span.recordException(error as Error);
      span.setAttribute('http.status_code', 500);
      span.end();
      throw error;
    }
  });
}

