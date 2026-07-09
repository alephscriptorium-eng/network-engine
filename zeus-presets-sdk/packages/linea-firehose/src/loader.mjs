/**
 * Load triage manifest and single post files from the firehose volume.
 */

import { readVolumeFile, TRIAGE_MANIFEST_PATH } from '@zeus/presets-sdk';
import { normalizeFirehosePost } from './schema.mjs';

/**
 * @returns {Promise<object>}
 */
export async function loadTriageManifest() {
  const result = await readVolumeFile('firehose', TRIAGE_MANIFEST_PATH);
  return JSON.parse(result.content);
}

/**
 * @param {string} relativePath — path within firehose volume (e.g. candidate/batch/file.json)
 */
export async function loadPostFile(relativePath) {
  const result = await readVolumeFile('firehose', relativePath);
  const raw = JSON.parse(result.content);
  return {
    path: result.path,
    absPath: result.absPath,
    size: result.size,
    post: normalizeFirehosePost(raw),
    raw
  };
}
