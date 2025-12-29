import { NextResponse } from 'next/server';
import { trace, context } from '@opentelemetry/api';

// This endpoint creates explicit spans to test tracing
export async function GET() {
  // Check if tracing is actually initialized
  const api = trace.getActiveSpan();
  const isTracingActive = api !== undefined;
  
  const tracer = trace.getTracer('metrics-compare-api', '1.0.0');
  
  // Force create a new trace if none exists
  const span = tracer.startSpan('trace-test', {
    attributes: {
      'http.method': 'GET',
      'http.route': '/api/trace-test',
      'service.name': 'metrics-compare',
      'test.endpoint': true,
    }
  });
  
  try {
    // Create a child span
    const childSpan = tracer.startSpan('trace-test-child', {
      attributes: {
        'child.operation': 'test-calculation',
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
    childSpan.end();
    
    const spanContext = span.spanContext();
    const traceId = spanContext.traceId;
    const spanId = spanContext.spanId;
    
    span.setAttribute('http.status_code', 200);
    span.setAttribute('trace.id', traceId);
    span.setAttribute('span.id', spanId);
    span.end();
    
    return NextResponse.json({ 
      status: 'ok', 
      service: 'metrics-compare',
      message: 'Trace test endpoint - check Elastic for traces',
      timestamp: new Date().toISOString(),
      traceId: traceId,
      spanId: spanId,
      isTracingActive: isTracingActive,
      traceFlags: spanContext.traceFlags.toString(),
      note: traceId === '00000000000000000000000000000000' 
        ? 'WARNING: Tracing not initialized - check environment variables in Vercel' 
        : 'Tracing appears to be working'
    });
  } catch (error) {
    span.recordException(error as Error);
    span.setAttribute('http.status_code', 500);
    span.end();
    throw error;
  }
}

