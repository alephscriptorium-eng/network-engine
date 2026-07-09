/**
 * Context recipes that map firehose volume state to firehose-view-ui deep links.
 */

import { browseVolume } from './browse-core.mjs';
import { resolveVolume } from './volumes.mjs';
import { toFirehoseLinkItem, buildFirehoseDeepLink } from './firehose-paths.mjs';

/**
 * @param {object} opts
 * @param {object} opts.firehoseEntry — UI mesh entry for firehose (:3016)
 * @param {Array<{ id: string, label?: string, files?: number }>} [opts.corpora]
 * @param {{ corpus?: string, path?: string, selectedFilePath?: string }} [opts.deckContext]
 */
export async function buildFirehoseLinkItems({ firehoseEntry, corpora, deckContext = {} }) {
  const items = [];
  const corpusList =
    corpora ||
    resolveVolume('firehose').corpora.map((c) => ({
      id: c.id,
      label: c.label || c.id,
      files: c.files ?? 0
    }));

  if (deckContext.selectedFilePath && deckContext.corpus) {
    items.push(
      toFirehoseLinkItem({
        id: 'firehose-selection',
        label: 'Abrir selección en Explorer',
        corpus: deckContext.corpus,
        path: deckContext.selectedFilePath,
        mode: 'preview',
        kind: 'selection',
        title: deckContext.selectedFilePath,
        firehoseEntry
      })
    );
  }

  items.push({
    id: 'firehose-explorer',
    label: 'Firehose Explorer',
    href: buildFirehoseDeepLink({
      firehoseEntry,
      corpus: deckContext.corpus,
      path: deckContext.path,
      mode: deckContext.corpus ? 'preview' : undefined
    }),
    kind: 'home',
    title: 'Abrir explorador DISK_01/FIREHOSE'
  });

  for (const corpus of corpusList) {
    const empty = (corpus.files ?? 0) === 0;
    items.push(
      toFirehoseLinkItem({
        id: `corpus-${corpus.id}`,
        label: corpus.label || corpus.id,
        corpus: corpus.id,
        mode: empty ? undefined : 'preview',
        kind: 'corpus',
        disabled: empty,
        title: empty ? 'Corpus vacío' : `${corpus.files} archivos`,
        firehoseEntry
      })
    );
  }

  try {
    const rootBrowse = await browseVolume('firehose', 'candidate', { limit: 10, offset: 0 });
    const batches = rootBrowse.entries
      .filter((e) => e.type === 'dir')
      .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))
      .slice(0, 3);

    for (const batch of batches) {
      items.push(
        toFirehoseLinkItem({
          id: `candidate-batch-${batch.name}`,
          label: `Candidatos · batch ${batch.name}`,
          corpus: 'candidate',
          path: batch.name,
          mode: 'preview',
          kind: 'batch',
          firehoseEntry
        })
      );
    }
  } catch {
    // volume unavailable — corpus shortcuts still returned
  }

  return items;
}

/**
 * Full API payload for player GET /api/aleph/firehose-links.
 * @param {object} opts
 * @param {object} opts.firehoseEntry
 * @param {object} [opts.triage]
 * @param {{ corpus?: string, path?: string, selectedFilePath?: string }} [opts.deckContext]
 */
export async function buildFirehoseLinksResponse({
  firehoseEntry,
  triage = null,
  deckContext = {}
}) {
  const volume = resolveVolume('firehose');
  const corpora = volume.corpora.map((c) => ({
    id: c.id,
    label: c.label || c.id,
    files: c.files ?? 0,
    empty: (c.files ?? 0) === 0
  }));
  const items = await buildFirehoseLinkItems({ firehoseEntry, corpora, deckContext });

  return {
    volumeId: volume.id,
    corpora,
    items,
    triage: triage
      ? {
          timestamp: triage.timestamp ?? null,
          source: triage.source ?? null,
          results: triage.results ?? null
        }
      : null
  };
}
