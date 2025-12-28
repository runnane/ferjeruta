export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(url, request);
    }

    // Let static assets handle everything else
    return env.ASSETS.fetch(request);
  },
};

async function handleApiRequest(url, request) {
  // Placeholder API route
  if (url.pathname === '/api/health') {
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  // 404 for unknown API routes
  return Response.json(
    { error: 'Not found' },
    { status: 404 }
  );
}
