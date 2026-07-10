#!/usr/bin/env node
/**
 * Regenerate canvases/SPRINT0.canvas.tsx from @zeus/presets-sdk/zeus-registry.
 */

import { loadZeusEnv } from '@zeus/presets-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCanvasSnapshot } from '../packages/presets-sdk/src/zeus-registry.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadZeusEnv(REPO_ROOT);
const CANVAS_NAME = process.env.ZEUS_CANVAS_NAME || 'SPRINT0.canvas.tsx';

const OUTPUT_PATHS = process.env.ZEUS_CANVAS_PATH
  ? [path.resolve(process.env.ZEUS_CANVAS_PATH)]
  : [
      path.join(REPO_ROOT, 'canvases', CANVAS_NAME),
      path.resolve(
        process.env.ZEUS_CURSOR_CANVAS_PATH ||
          `C:/Users/aleph/.cursor/projects/c-Users-aleph-OASIS-SCRIPTORIUM-V0-network-engine-zeus-presets-sdk/canvases/${CANVAS_NAME}`
      )
    ];

function renderCanvas(snapshot) {
  return `import {
  Button,
  CollapsibleSection,
  Grid,
  H1,
  Link,
  Row,
  Stack,
  Table,
  Text,
  useCanvasAction
} from 'cursor/canvas';

const SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};

export default function Sprint0DevMap() {
  const dispatch = useCanvasAction();

  const runTask = (label) => {
    dispatch({ type: 'newComposerChat', userPrompt: 'Run VS Code task: ' + label });
  };

  const runCommand = (command) => {
    dispatch({ type: 'newComposerChat', userPrompt: 'Run in terminal: ' + command });
  };

  const rows = SNAPSHOT.packages.map((p) => [
    p.name,
    p.role,
    p.ports || '—',
    p.zeusDeps.join(', ') || '—',
    p.actions ? (
      <Row gap={4} key={p.dir}>
        <Button onClick={() => runTask(p.actions.startLabel)}>Start</Button>
        <Button variant="ghost" onClick={() => runTask(p.actions.stopLabel)}>Stop</Button>
      </Row>
    ) : (
      '—'
    )
  ]);

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <H1>Zeus — Dev team</H1>
        <Text tone="tertiary">
          {SNAPSHOT.packages.length} packages · {SNAPSHOT.generatedAt}
        </Text>
      </Stack>

      <Table
        headers={['Package', 'Role', 'Ports', '@zeus deps', 'Actions']}
        rows={rows}
        striped
      />

      <CollapsibleSection title="Shortcuts" defaultOpen>
        <Stack gap={16}>
          <Stack gap={8}>
            <Text weight="medium">Open UI</Text>
            <Row gap={8} wrap>
              {SNAPSHOT.shortcuts.ui.map((l) => (
                <Link key={l.id} href={l.url}>
                  <Button>{l.label}</Button>
                </Link>
              ))}
            </Row>
          </Stack>

          <Stack gap={8}>
            <Text weight="medium">Bundles</Text>
            <Row gap={8} wrap>
              {SNAPSHOT.shortcuts.bundles.map((b) => (
                <Button key={b.label} onClick={() => runTask(b.label)}>
                  {b.label}
                </Button>
              ))}
            </Row>
          </Stack>

          {SNAPSHOT.shortcuts.mcp.length > 0 ? (
            <Stack gap={8}>
              <Text weight="medium">MCP</Text>
              <Grid columns={2} gap={12}>
                {SNAPSHOT.shortcuts.mcp.map((m) => (
                  <Stack key={m.id} gap={4}>
                    <Row gap={4}>
                      <Button onClick={() => runTask(m.startLabel)}>Start {m.label}</Button>
                      <Button variant="ghost" onClick={() => runTask(m.stopLabel)}>Stop</Button>
                    </Row>
                    <Text size="small" tone="tertiary">ports {m.ports}</Text>
                  </Stack>
                ))}
              </Grid>
            </Stack>
          ) : null}

          {SNAPSHOT.tips.ops.length > 0 ? (
            <Stack gap={8}>
              <Text weight="medium">Ops</Text>
              <Grid columns={3} gap={12}>
                {SNAPSHOT.tips.ops.map((tip) => (
                  <Stack key={tip.label} gap={4}>
                    <Button
                      onClick={() =>
                        tip.kind === 'openFile'
                          ? dispatch({ type: 'openFile', path: tip.path })
                          : tip.label.startsWith('Test ') || tip.label.startsWith('Seed ')
                            ? runTask(tip.label)
                            : runCommand(tip.command)
                      }
                    >
                      {tip.label}
                    </Button>
                    <Text size="small" tone="tertiary">
                      {tip.detail || tip.command || tip.path}
                    </Text>
                  </Stack>
                ))}
              </Grid>
            </Stack>
          ) : null}
        </Stack>
      </CollapsibleSection>
    </Stack>
  );
}
`;
}

const snapshot = buildCanvasSnapshot(REPO_ROOT);
const source = renderCanvas(snapshot);

for (const dest of OUTPUT_PATHS) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, source, 'utf8');
  console.log(`Canvas written: ${dest}`);
}
console.log(`Packages: ${snapshot.packages.length}`);
console.log(`Runnable: ${snapshot.packages.filter((p) => p.actions).length}`);
