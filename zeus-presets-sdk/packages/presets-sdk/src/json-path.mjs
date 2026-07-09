/**
 * Dot-path navigation for session/snapshot JSON trees.
 * Convention: "session" = root; "decks.B.resolved.items.2" = nested path.
 */

/**
 * @param {string|undefined|null} path
 * @returns {string[]}
 */
export function parsePath(path) {
  if (path == null || path === '' || path === 'session') return [];
  return String(path).split('.').filter(Boolean);
}

/**
 * @param {string[]} segments
 * @returns {string}
 */
export function formatPath(segments) {
  if (!segments || segments.length === 0) return 'session';
  return segments.join('.');
}

/**
 * @param {unknown} root
 * @param {string|string[]} path
 * @returns {unknown}
 */
export function getAtPath(root, path) {
  const segments = Array.isArray(path) ? path : parsePath(path);
  let current = root;
  for (const seg of segments) {
    if (current == null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
    } else {
      current = /** @type {Record<string, unknown>} */ (current)[seg];
    }
  }
  return current;
}

/**
 * @param {string|string[]} path
 * @returns {string}
 */
export function getParentPath(path) {
  const segments = Array.isArray(path) ? [...path] : parsePath(path);
  if (segments.length === 0) return 'session';
  segments.pop();
  return formatPath(segments);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function typeOfValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * @param {unknown} value
 * @param {number} [maxLen]
 * @returns {string}
 */
export function previewValue(value, maxLen = 80) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const s = value.length > maxLen ? `${value.slice(0, maxLen)}…` : value;
    return JSON.stringify(s);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    const head = keys.slice(0, 3).join(', ');
    return `{${head}${keys.length > 3 ? ', …' : ''}}`;
  }
  return String(value);
}

/**
 * @param {unknown} value
 * @param {string} path
 * @param {{ maxArray?: number }} [opts]
 * @returns {Array<{ key: string, type: string, preview: string, childPath: string|null, index?: number }>}
 */
export function listChildren(value, path, opts = {}) {
  const maxArray = opts.maxArray ?? 50;
  const segments = parsePath(path);
  /** @type {ReturnType<typeof listChildren>} */
  const children = [];

  if (value === null || value === undefined) return children;

  if (Array.isArray(value)) {
    const limit = Math.min(value.length, maxArray);
    for (let i = 0; i < limit; i++) {
      const child = value[i];
      children.push({
        key: String(i),
        type: typeOfValue(child),
        preview: previewValue(child),
        childPath: formatPath([...segments, String(i)]),
        index: i
      });
    }
    if (value.length > maxArray) {
      children.push({
        key: '…',
        type: 'meta',
        preview: `${value.length - maxArray} more items`,
        childPath: null
      });
    }
    return children;
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const child = /** @type {Record<string, unknown>} */ (value)[key];
      children.push({
        key,
        type: typeOfValue(child),
        preview: previewValue(child),
        childPath: formatPath([...segments, key])
      });
    }
  }
  return children;
}

/**
 * @param {string} path
 * @param {unknown} root
 * @returns {{ prev: string|null, next: string|null }}
 */
export function getSiblingPaths(path, root) {
  const segments = parsePath(path);
  if (segments.length === 0) return { prev: null, next: null };

  const parentSegments = segments.slice(0, -1);
  const lastSeg = segments[segments.length - 1];
  const parent = parentSegments.length === 0 ? root : getAtPath(root, parentSegments);

  if (Array.isArray(parent)) {
    const idx = Number(lastSeg);
    if (!Number.isInteger(idx)) return { prev: null, next: null };
    return {
      prev: idx > 0 ? formatPath([...parentSegments, String(idx - 1)]) : null,
      next: idx < parent.length - 1 ? formatPath([...parentSegments, String(idx + 1)]) : null
    };
  }

  if (parent && typeof parent === 'object' && !Array.isArray(parent)) {
    const keys = Object.keys(parent);
    const keyIdx = keys.indexOf(lastSeg);
    if (keyIdx === -1) return { prev: null, next: null };
    return {
      prev: keyIdx > 0 ? formatPath([...parentSegments, keys[keyIdx - 1]]) : null,
      next: keyIdx < keys.length - 1 ? formatPath([...parentSegments, keys[keyIdx + 1]]) : null
    };
  }

  return { prev: null, next: null };
}

/**
 * Resolve path metadata for MCP REST / browser explorer.
 * @param {unknown} root
 * @param {string} [path]
 */
export function inspectAtPath(root, path = 'session') {
  const normalized = path == null || path === '' ? 'session' : path;
  const segments = parsePath(normalized);
  const value = segments.length === 0 ? root : getAtPath(root, normalized);
  return {
    path: normalized,
    value,
    parent: getParentPath(normalized),
    siblings: getSiblingPaths(normalized, root),
    children: listChildren(value, normalized)
  };
}

/**
 * Export packet for AI / clipboard — focus value + navigation context.
 * @param {unknown} root
 * @param {string} [path]
 * @param {{ rootLabel?: string, maxValueChars?: number }} [opts]
 */
export function buildFocusExport(root, path = 'session', opts = {}) {
  const rootLabel = opts.rootLabel ?? 'session';
  const maxValueChars = opts.maxValueChars ?? 50000;
  const normalized = path == null || path === '' || path === rootLabel ? rootLabel : String(path);
  const inspectPath = normalized === rootLabel ? 'session' : normalized;
  const inspected = inspectAtPath(root, inspectPath);
  let value = inspected.value;
  const t = typeOfValue(value);
  /** @type {{ truncated: boolean, originalLength?: number, type: string }} */
  let valueMeta = { truncated: false, type: t };

  if (typeof value === 'string' && value.length > maxValueChars) {
    valueMeta = { truncated: true, originalLength: value.length, type: 'string' };
    value = value.slice(0, maxValueChars) + '…';
  }

  const segments = parsePath(inspectPath);
  const atRoot = segments.length === 0;
  const childSummaries = inspected.children
    .filter((c) => c.childPath != null)
    .map((c) => ({
      key: c.key,
      type: c.type,
      path: c.childPath,
      preview: c.preview
    }));

  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    rootLabel,
    focus: {
      path: normalized,
      type: t,
      value,
      valueMeta,
      parent: atRoot ? null : inspected.parent,
      navigation: {
        up: atRoot ? null : inspected.parent,
        prev: inspected.siblings.prev,
        next: inspected.siblings.next
      },
      breadcrumb: atRoot ? [rootLabel] : [rootLabel, ...segments],
      children: childSummaries
    }
  };
}
