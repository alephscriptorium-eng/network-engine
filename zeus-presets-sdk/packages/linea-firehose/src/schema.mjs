/**
 * Jetstream / Bluesky firehose post normalization.
 */

/**
 * @param {object|null|undefined} raw
 * @returns {{
 *   id: string|null,
 *   handle: string|null,
 *   text: string,
 *   isReply: boolean,
 *   uri: string|null,
 *   createdAt: string|null,
 *   kind: string|null,
 *   did: string|null,
 *   raw: object|null
 * }}
 */
export function normalizeFirehosePost(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: null,
      handle: null,
      text: '',
      isReply: false,
      uri: null,
      createdAt: null,
      kind: null,
      did: null,
      raw: null
    };
  }

  const record = raw.commit?.record || raw.record || null;
  const text = record?.text || '';
  const handle = raw.handle || null;
  const uri = raw.uri || null;
  const createdAt = record?.createdAt || null;
  const isReply = Boolean(record?.reply);
  const id = uri || raw.commit?.rkey || raw.commit?.cid || null;

  return {
    id,
    handle,
    text,
    isReply,
    uri,
    createdAt,
    kind: raw.kind || null,
    did: raw.did || null,
    raw
  };
}

/**
 * @param {object} raw
 */
export function isJetstreamPost(raw) {
  const collection = raw?.commit?.collection;
  return collection === 'app.bsky.feed.post' || Boolean(raw?.commit?.record?.text != null);
}
