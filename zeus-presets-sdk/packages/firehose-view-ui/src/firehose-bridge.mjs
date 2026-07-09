/**
 * Firehose browse bridge — delegates to @zeus/linea-firehose.
 */

import {
  listCorpora,
  browseCorpus,
  listPosts,
  getFirehoseStats,
  loadTriageManifest,
  loadPostFile,
  getCorpusConfig
} from '@zeus/linea-firehose';
import { readVolumeFile, corpusRelPath } from '@zeus/presets-sdk';

export {
  listCorpora,
  browseCorpus,
  listPosts,
  getFirehoseStats,
  loadTriageManifest,
  loadPostFile
};

/**
 * @param {string} corpusId
 * @param {string} filePath — relative to corpus root
 */
export async function readCorpusFile(corpusId, filePath) {
  const { corpus } = getCorpusConfig(corpusId);
  const volumePath = corpusRelPath(corpus.path, filePath);
  const result = await readVolumeFile('firehose', volumePath);
  const ext = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')) : '';

  let data = result.content;
  let kind = 'text';
  if (ext === '.json') {
    try {
      data = JSON.parse(result.content);
      kind = 'json';
    } catch (err) {
      return { error: `invalid JSON: ${err.message}`, path: filePath };
    }
  }

  return {
    corpus: corpusId,
    path: filePath,
    volumePath: result.path,
    absPath: result.absPath,
    name: filePath.split('/').pop(),
    ext,
    kind,
    size: result.size,
    data,
    content: result.content
  };
}
