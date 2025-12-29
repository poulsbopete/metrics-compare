// Client-side tracing utilities
// Note: Client-side tracing requires browser instrumentation which is more complex
// For now, we'll rely on server-side tracing from API routes and page loads

export function trackUserInteraction(action: string, details?: Record<string, string | number>) {
  // This is a placeholder for future client-side tracing
  // Currently, server-side auto-instrumentation will capture HTTP requests
  if (typeof window !== 'undefined') {
    console.log('User interaction:', action, details);
    // In the future, we could send custom events to Elastic via API
  }
}

