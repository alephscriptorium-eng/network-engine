/**
 * TOP-style TUI renderer for player-ui-debug.
 */

import chalk from 'chalk';

function fmtMs(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60}m`;
  if (m > 0) return `${m}m${s % 60}s`;
  return `${s}s`;
}

function vuBar(intensidad, width = 20) {
  const v = Math.max(0, Math.min(1, Number(intensidad) || 0));
  const filled = Math.round(v * width);
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled)) + ` ${(v * 100).toFixed(0)}%`;
}

function deckRow(deckId, deck, resolveTiming) {
  if (!deck || deck.phase === 'empty') {
    return `  ${deckId}  ${chalk.gray('empty')}`.padEnd(72);
  }
  const nodo = deck.resolved?.nodo?.nodo?.id || deck.resolved?.nodo?.id || '—';
  const regs = deck.resolved?.registros?.total;
  const wt = deck.resolved?.wikitext?.cached;
  const wtStr = wt === true ? chalk.green('cached') : wt === false ? chalk.yellow('miss') : '—';
  const timing = resolveTiming?.ms != null ? `${resolveTiming.ms.toFixed(0)}ms` : '—';
  const phase = deck.phase === 'degraded' ? chalk.red(deck.phase) : chalk.cyan(deck.phase);
  return [
    `  ${chalk.bold(deckId)}`,
    phase.padEnd(12),
    (deck.serverName || '—').slice(0, 18).padEnd(18),
    String(nodo).padEnd(5),
    regs != null ? `reg=${regs}` : 'reg=—',
    `wt=${wtStr}`,
    `resolve=${timing}`
  ].join(' ');
}

/**
 * @param {{ config: object, clientState: object, restState: object, monitorUptime: number }} ctx
 */
export function renderFrame(ctx) {
  const { config, clientState, restState, monitorUptime } = ctx;
  const lines = [];

  const conn = clientState.connected ? chalk.green('● CONNECTED') : chalk.red('○ OFFLINE');
  const serverUptime = clientState.debugStats?.uptime;

  lines.push(chalk.bold.cyan('═'.repeat(72)));
  lines.push(
    chalk.bold(' player-ui-debug ') +
    conn +
    chalk.dim(` │ ${config.sessionUrl} │ monitor ${fmtMs(monitorUptime)}`) +
    (serverUptime != null ? chalk.dim(` srv:${fmtMs(serverUptime)}`) : '') +
    chalk.dim(` dbg:${config.debugServer ? 'on' : 'off'}`)
  );
  lines.push(chalk.bold.cyan('─'.repeat(72)));

  const session = clientState.session;
  if (session) {
    const play = session.playhead?.playing ? chalk.green('PLAY') : chalk.yellow('PAUSE');
    const sync = session.sync ? chalk.green('SYNC') : chalk.dim('FREE');
    lines.push(
      chalk.bold(' SESSION ') +
      `phase=${chalk.white(session.phase)}  year=${chalk.white.bold(session.playhead?.year)}  ${play}  ${sync}`
    );
  } else {
    lines.push(chalk.bold(' SESSION ') + chalk.gray('waiting for session:state…'));
  }

  lines.push(chalk.bold(' DECKS   ') + chalk.dim('id  phase        server             nodo  registros      wikitext  timing'));
  const decks = session?.decks || { A: null, B: null };
  for (const id of ['A', 'B']) {
    lines.push(deckRow(id, decks[id], clientState.lastResolveTiming[id]));
  }

  lines.push(chalk.bold.cyan('─'.repeat(72)));
  lines.push(chalk.bold(' REST    ') + chalk.dim(`poll ${restState.lastFetchAt ? new Date(restState.lastFetchAt).toISOString().slice(11, 19) : '—'}`));

  const healthOk = restState.health?.status === 'ok';
  lines.push(
    `  health   ${healthOk ? chalk.green('ok') : chalk.red(restState.health?.error || restState.lastError || 'down')}`
  );

  const servers = restState.servers;
  if (Array.isArray(servers)) {
    const up = servers.filter(s => s.isConnected !== false).length;
    lines.push(`  servers  ${up}/${servers.length} connected`);
    for (const s of servers.slice(0, 4)) {
      const mark = s.isConnected === false ? chalk.red('✗') : chalk.green('✓');
      lines.push(`           ${mark} ${s.name || s.id}`);
    }
  } else {
    lines.push(`  servers  ${chalk.gray('unavailable')}`);
  }

  const cache = restState.anchors?.cacheStats;
  if (cache && !cache.error) {
    lines.push(
      `  cache    registro=${cache.registro_count ?? '—'} cached_oldids=${cache.cached_oldids?.length ?? cache.cached_count ?? '—'}`
    );
    const grid = restState.anchors?.grid?.summary;
    if (grid) {
      lines.push(`           anchors cached=${grid.cached} stub=${grid.stub} missing=${grid.missing}`);
    }
  } else {
    lines.push(`  cache    ${chalk.gray(cache?.error || '—')}`);
  }

  const med = restState.medicion;
  if (med && !med.error) {
    const latest = med.latest;
    const id = latest?.id || latest?.key || '—';
    const inten = latest?.intensidad;
    lines.push(`  medicion caso=${med.caso_id || config.defaultCaso} latest=${id}`);
    if (inten != null) {
      lines.push(`           VU ${vuBar(inten)}`);
    }
  } else {
    lines.push(`  medicion ${chalk.gray(med?.error || '—')}`);
  }

  if (clientState.debugStats) {
    const ds = clientState.debugStats;
    lines.push(
      chalk.bold(' DEBUG   ') +
      chalk.dim(`resolves A=${ds.resolveCount?.A ?? 0} B=${ds.resolveCount?.B ?? 0}`) +
      (ds.lastResolveMs ? chalk.dim(` last A=${ds.lastResolveMs.A?.toFixed?.(0) ?? '—'}ms B=${ds.lastResolveMs.B?.toFixed?.(0) ?? '—'}ms`) : '')
    );
  }

  lines.push(chalk.bold.cyan('─'.repeat(72)));
  lines.push(chalk.bold(' EVENTS  ') + chalk.dim('q quit · r reconnect · p pause · 1-4 cue marks'));
  for (const ev of clientState.events.slice(0, config.tuiMaxEvents ?? 8)) {
    const ts = ev.ts?.slice(11, 19) ?? '—';
    lines.push(chalk.dim(`  ${ts} `) + chalk.white(ev.type) + (ev.detail ? chalk.gray(` ${ev.detail}`) : ''));
  }

  lines.push(chalk.bold.cyan('═'.repeat(72)));
  return lines.join('\n');
}
