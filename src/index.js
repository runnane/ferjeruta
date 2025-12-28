export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(url, request, env);
    }

    // Let static assets handle everything else
    return env.ASSETS.fetch(request);
  },
};

async function handleApiRequest(url, request, env) {
  // Placeholder API route
  if (url.pathname === '/api/health') {
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  // Schedule as JSON
  if (url.pathname === '/api/schedule') {
    return handleScheduleRequest(env);
  }

  // 404 for unknown API routes
  return Response.json(
    { error: 'Not found' },
    { status: 404 }
  );
}

async function handleScheduleRequest(env) {
  try {
    // Fetch the schedule.xml from static assets
    const xmlResponse = await env.ASSETS.fetch(new Request('https://dummy/schedule.xml'));
    
    if (!xmlResponse.ok) {
      return Response.json(
        { error: 'Failed to fetch schedule.xml' },
        { status: 500 }
      );
    }

    const xmlText = await xmlResponse.text();
    const schedule = parseScheduleXml(xmlText);

    return Response.json(schedule, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to parse schedule', message: error.message },
      { status: 500 }
    );
  }
}

function parseScheduleXml(xmlText) {
  // Simple XML parser for the schedule format
  const routes = [];
  
  // Extract serial from routes element
  const routesSerialMatch = xmlText.match(/<routes\s+serial="([^"]+)"/);
  const serial = routesSerialMatch ? routesSerialMatch[1] : null;

  // Match all route elements
  const routeRegex = /<route\s+([^>]+)>([\s\S]*?)<\/route>/g;
  let routeMatch;

  while ((routeMatch = routeRegex.exec(xmlText)) !== null) {
    const routeAttrs = routeMatch[1];
    const routeContent = routeMatch[2];

    const route = {
      name: extractAttr(routeAttrs, 'name'),
      location1: extractAttr(routeAttrs, 'location1'),
      location2: extractAttr(routeAttrs, 'location2'),
      validfrom: extractAttr(routeAttrs, 'validfrom'),
      validto: extractAttr(routeAttrs, 'validto'),
      serial: extractAttr(routeAttrs, 'serial'),
      time: extractAttr(routeAttrs, 'time'),
      ticketzone: extractAttr(routeAttrs, 'ticketzone'),
      operator: extractAttr(routeAttrs, 'operator'),
      routeid: extractAttr(routeAttrs, 'routeid'),
      url: extractAttr(routeAttrs, 'url'),
      areaCode: extractAttr(routeAttrs, 'areaCode'),
      lines: parseLines(routeContent),
      departurepoints: parseDeparturePoints(routeContent),
    };

    routes.push(route);
  }

  return {
    serial,
    routes,
  };
}

function extractAttr(attrString, attrName) {
  const regex = new RegExp(`${attrName}="([^"]*)"`);
  const match = attrString.match(regex);
  return match ? match[1] : null;
}

function parseLines(content) {
  const lines = [];
  
  // Check for both <lines> and <rutes> elements
  const linesMatch = content.match(/<lines>([\s\S]*?)<\/lines>/) || 
                     content.match(/<rutes>([\s\S]*?)<\/rutes>/);
  
  if (linesMatch) {
    const lineRegex = /<(?:line|rute)\s+([^>\/]+)\/?>/g;
    let lineMatch;

    while ((lineMatch = lineRegex.exec(linesMatch[1])) !== null) {
      const lineAttrs = lineMatch[1];
      lines.push({
        id: extractAttr(lineAttrs, 'id'),
        name: extractAttr(lineAttrs, 'name'),
        phonenumber: extractAttr(lineAttrs, 'phonenumber'),
        type: extractAttr(lineAttrs, 'type'),
        flags: extractAttr(lineAttrs, 'flags'),
        comments: extractAttr(lineAttrs, 'comments'),
        color: extractAttr(lineAttrs, 'color'),
      });
    }
  }

  return lines;
}

function parseDeparturePoints(content) {
  const departurePoints = [];
  const dpRegex = /<departurepoint\s+location="([^"]+)">([\s\S]*?)<\/departurepoint>/g;
  let dpMatch;

  while ((dpMatch = dpRegex.exec(content)) !== null) {
    const location = dpMatch[1];
    const dpContent = dpMatch[2];
    
    const weekdays = [];
    const weekdayRegex = /<weekday\s+day="([^"]+)"\s+desc="([^"]+)">([\s\S]*?)<\/weekday>/g;
    let wdMatch;

    while ((wdMatch = weekdayRegex.exec(dpContent)) !== null) {
      const departures = [];
      const depRegex = /<departure\s+time="([^"]+)"(?:\s+comments="([^"]*)")?(?:\s+line="([^"]*)")?\s*\/>/g;
      let depMatch;

      while ((depMatch = depRegex.exec(wdMatch[3])) !== null) {
        const departure = { time: depMatch[1] };
        if (depMatch[2]) departure.comments = depMatch[2];
        if (depMatch[3]) departure.line = depMatch[3];
        departures.push(departure);
      }

      weekdays.push({
        days: wdMatch[1],
        description: wdMatch[2],
        departures,
      });
    }

    departurePoints.push({
      location,
      weekdays,
    });
  }

  return departurePoints;
}
