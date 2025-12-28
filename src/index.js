import { XMLParser } from 'fast-xml-parser';

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
    return handleScheduleRequest(request, env);
  }

  // 404 for unknown API routes
  return Response.json(
    { error: 'Not found' },
    { status: 404 }
  );
}

async function handleScheduleRequest(request, env) {
  try {
    // Fetch the schedule.xml from static assets
    const xmlResponse = await env.ASSETS.fetch(new Request(new URL('/schedule.xml', request.url)));
    
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
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (name) => ['route', 'departurepoint', 'weekday', 'departure'].includes(name),
  });

  const parsed = parser.parse(xmlText);
  const routesData = parsed.routes;

  // Transform to cleaner JSON structure
  const routes = (routesData.route || []).map((route) => ({
    name: route.name,
    location1: route.location1,
    location2: route.location2,
    validfrom: route.validfrom,
    validto: route.validto,
    serial: route.serial,
    time: route.time,
    ticketzone: route.ticketzone,
    operator: route.operator,
    routeid: route.routeid,
    url: route.url,
    areaCode: route.areaCode,
    lines: parseLines(route),
    departurepoints: parseDeparturePoints(route),
  }));

  return {
    serial: routesData.serial,
    routes,
  };
}

function parseLines(route) {
  // Handle both <lines><line/></lines> and <rutes><rute/></rutes>
  let linesData = route.lines?.line || route.rutes?.rute || [];
  
  // Ensure it's always an array
  if (!Array.isArray(linesData)) {
    linesData = [linesData];
  }
  
  return linesData.map((line) => ({
    id: line.id,
    name: line.name,
    phonenumber: line.phonenumber,
    type: line.type,
    flags: line.flags || null,
    comments: line.comments || null,
    color: line.color || null,
  }));
}

function parseDeparturePoints(route) {
  const departurePoints = route.departurepoint || [];
  
  return departurePoints.map((dp) => ({
    location: dp.location,
    weekdays: (dp.weekday || []).map((wd) => ({
      days: wd.day,
      description: wd.desc,
      departures: (wd.departure || []).map((dep) => {
        const departure = { time: dep.time };
        if (dep.line) departure.line = dep.line;
        if (dep.comments) departure.comments = dep.comments;
        return departure;
      }),
    })),
  }));
}