/**
 * MCP server discovery with composable sources.
 *
 * Sources:
 * - staticList: explicit config, passed through without probing
 * - urls: candidate base urls, probed via GET `${base}${probePath}`
 * - portRange: {host?, from, to} expanded to http://host:port candidates, probed
 *
 * Probing uses the edge-mcp health contract: GET /mcp/health must answer HTTP 200.
 */

function nameFromUrl(url) {
  try {
    const u = new URL(url);
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return url;
  }
}

async function probe(url, probePath, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}${probePath}`, {
      method: 'GET',
      signal: controller.signal
    });

    if (response.status !== 200) {
      return null;
    }

    let name = null;
    try {
      const body = await response.json();
      name = body?.server || body?.name || null;
      if (typeof name !== 'string') name = null;
    } catch {
      // Non-JSON health body: fall back to host:port naming
    }

    return { name: name || nameFromUrl(url), url, transport: 'http' };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverServers(options = {}) {
  const {
    urls = [],
    portRange = null,
    staticList = [],
    timeoutMs = 2000,
    probePath = '/mcp/health'
  } = options;

  const results = [];
  const seenUrls = new Set();

  // Explicit config passes through without probing
  for (const entry of staticList) {
    if (!entry || !entry.url) continue;
    if (seenUrls.has(entry.url)) continue;
    seenUrls.add(entry.url);
    results.push({
      name: entry.name || nameFromUrl(entry.url),
      url: entry.url,
      transport: entry.transport || 'http'
    });
  }

  // Build probe candidates from urls + portRange
  const candidates = [];
  for (const url of urls) {
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      candidates.push(url);
    }
  }

  if (portRange && Number.isInteger(portRange.from) && Number.isInteger(portRange.to)) {
    const host = portRange.host || 'localhost';
    for (let port = portRange.from; port <= portRange.to; port++) {
      const url = `http://${host}:${port}`;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        candidates.push(url);
      }
    }
  }

  const probed = await Promise.all(
    candidates.map(url => probe(url, probePath, timeoutMs))
  );

  for (const found of probed) {
    if (found) results.push(found);
  }

  return results;
}
