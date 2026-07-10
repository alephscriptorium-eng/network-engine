import {
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

const SNAPSHOT = {
  "generatedAt": "2026-07-10T10:21:09.219Z",
  "packages": [
    {
      "dir": "app-shell",
      "name": "@zeus/app-shell",
      "role": "lib",
      "ports": "",
      "zeusDeps": [
        "@zeus/presets-sdk",
        "@zeus/ui-kit"
      ],
      "actions": null
    },
    {
      "dir": "editor-ui",
      "name": "@zeus/editor-ui",
      "role": "app",
      "ports": "3012",
      "zeusDeps": [
        "@zeus/app-shell",
        "@zeus/presets-sdk",
        "@zeus/ui-kit"
      ],
      "actions": {
        "startLabel": "Start ▸ editor-ui",
        "stopLabel": "Stop ■ editor-ui",
        "startCommand": "npm run start:editor",
        "stopCommand": "npm run stop:ports -- \"editor-ui stopped\" 3012"
      }
    },
    {
      "dir": "firehose-view-ui",
      "name": "@zeus/firehose-view-ui",
      "role": "app",
      "ports": "3016",
      "zeusDeps": [
        "@zeus/app-shell",
        "@zeus/linea-firehose",
        "@zeus/presets-sdk",
        "@zeus/ui-kit"
      ],
      "actions": {
        "startLabel": "Start ▸ firehose-view-ui",
        "stopLabel": "Stop ■ firehose-view-ui",
        "startCommand": "npm run start:firehose",
        "stopCommand": "npm run stop:ports -- \"firehose-view-ui stopped\" 3016"
      }
    },
    {
      "dir": "linea-firehose",
      "name": "@zeus/linea-firehose",
      "role": "mcp",
      "ports": "3008",
      "zeusDeps": [
        "@zeus/presets-sdk"
      ],
      "actions": {
        "startLabel": "Start ▸ firehose-mcp",
        "stopLabel": "Stop ■ firehose-mcp",
        "startCommand": "npm run start:firehose-mcp",
        "stopCommand": "npm run stop:ports -- \"firehose-mcp stopped\" 3008"
      }
    },
    {
      "dir": "linea-system",
      "name": "@zeus/linea-system",
      "role": "mcp",
      "ports": "4111, 4112",
      "zeusDeps": [
        "@zeus/presets-sdk"
      ],
      "actions": {
        "startLabel": "Start ▸ lineas",
        "stopLabel": "Stop ■ lineas",
        "startCommand": "npm run start:lineas",
        "stopCommand": "npm run stop:ports -- \"lineas stopped\" 4111 4112"
      }
    },
    {
      "dir": "player-ui",
      "name": "@zeus/player-ui",
      "role": "app",
      "ports": "3013",
      "zeusDeps": [
        "@zeus/app-shell",
        "@zeus/linea-firehose",
        "@zeus/presets-sdk",
        "@zeus/ui-kit"
      ],
      "actions": {
        "startLabel": "Start ▸ player-ui (DJ)",
        "stopLabel": "Stop ■ player-ui (DJ)",
        "startCommand": "npm run start:player",
        "stopCommand": "npm run stop:ports -- \"player-ui (DJ) stopped\" 3013"
      }
    },
    {
      "dir": "player-ui-debug",
      "name": "@zeus/player-ui-debug",
      "role": "mcp",
      "ports": "3014",
      "zeusDeps": [
        "@zeus/app-shell",
        "@zeus/presets-sdk"
      ],
      "actions": {
        "startLabel": "Start ▸ player-ui-debug",
        "stopLabel": "Stop ■ player-ui-debug",
        "startCommand": "npm run start:player-debug",
        "stopCommand": "npm run stop:ports -- \"player-ui-debug stopped\" 3014"
      }
    },
    {
      "dir": "presets-sdk",
      "name": "@zeus/presets-sdk",
      "role": "lib",
      "ports": "",
      "zeusDeps": [],
      "actions": null
    },
    {
      "dir": "solar-system",
      "name": "@zeus/solar-system",
      "role": "mcp",
      "ports": "4101-4103",
      "zeusDeps": [
        "@zeus/presets-sdk"
      ],
      "actions": {
        "startLabel": "Start ▸ solar-system",
        "stopLabel": "Stop ■ solar-system",
        "startCommand": "npm run start:solar",
        "stopCommand": "npm run stop:ports -- \"solar-system stopped\" 4101 4102 4103"
      }
    },
    {
      "dir": "test-utils",
      "name": "@zeus/test-utils",
      "role": "lib",
      "ports": "",
      "zeusDeps": [],
      "actions": null
    },
    {
      "dir": "ui-kit",
      "name": "@zeus/ui-kit",
      "role": "lib",
      "ports": "",
      "zeusDeps": [],
      "actions": null
    },
    {
      "dir": "view-ui",
      "name": "@zeus/view-ui",
      "role": "app",
      "ports": "3015",
      "zeusDeps": [
        "@zeus/app-shell",
        "@zeus/linea-system",
        "@zeus/presets-sdk",
        "@zeus/ui-kit"
      ],
      "actions": {
        "startLabel": "Start ▸ view-ui",
        "stopLabel": "Stop ■ view-ui",
        "startCommand": "npm run start:view",
        "stopCommand": "npm run stop:ports -- \"view-ui stopped\" 3015"
      }
    }
  ],
  "shortcuts": {
    "ui": [
      {
        "id": "editor",
        "label": "Editor",
        "url": "http://localhost:3012/"
      },
      {
        "id": "player",
        "label": "Tablero",
        "url": "http://localhost:3013/"
      },
      {
        "id": "view",
        "label": "Cache",
        "url": "http://localhost:3015/"
      },
      {
        "id": "firehose",
        "label": "Firehose",
        "url": "http://localhost:3016/"
      },
      {
        "id": "session",
        "label": "Sesión",
        "url": "http://localhost:3013/session"
      }
    ],
    "bundles": [
      {
        "label": "Start ▸ ALL",
        "kind": "bundle",
        "taskLabels": [
          "Start ▸ lineas",
          "Start ▸ editor-ui",
          "Start ▸ player-ui (DJ)",
          "Start ▸ view-ui",
          "Start ▸ firehose-mcp",
          "Start ▸ firehose-view-ui",
          "Start ▸ player-ui-debug"
        ]
      },
      {
        "label": "Start ▸ Cache Explorer",
        "kind": "bundle",
        "taskLabels": [
          "Start ▸ lineas",
          "Start ▸ view-ui"
        ]
      },
      {
        "label": "Start ▸ Firehose Explorer",
        "kind": "bundle",
        "taskLabels": [
          "Start ▸ firehose-mcp",
          "Start ▸ firehose-view-ui"
        ]
      },
      {
        "label": "Start ▸ Tablero ALEPH",
        "kind": "sequence",
        "steps": [
          "Seed ▸ aleph presets",
          "Start ▸ Tablero servidores"
        ]
      },
      {
        "label": "Start ▸ Tablero servidores",
        "kind": "bundle",
        "taskLabels": [
          "Start ▸ lineas",
          "Start ▸ player-ui (DJ)",
          "Start ▸ player-ui-debug"
        ]
      },
      {
        "label": "Stop ■ ALL (kill all ports)",
        "kind": "stopAll",
        "stopCommand": "npm run stop:ports -- \"all stopped\" 3008 3012 3013 3014 3015 3016 4101 4102 4103 4111 4112"
      }
    ],
    "mcp": [
      {
        "id": "linea-firehose",
        "label": "firehose-mcp",
        "ports": "3008",
        "startLabel": "Start ▸ firehose-mcp",
        "stopLabel": "Stop ■ firehose-mcp"
      },
      {
        "id": "linea-system",
        "label": "lineas",
        "ports": "4111, 4112",
        "startLabel": "Start ▸ lineas",
        "stopLabel": "Stop ■ lineas"
      },
      {
        "id": "player-ui-debug",
        "label": "player-ui-debug",
        "ports": "3014",
        "startLabel": "Start ▸ player-ui-debug",
        "stopLabel": "Stop ■ player-ui-debug"
      },
      {
        "id": "solar-system",
        "label": "solar-system",
        "ports": "4101-4103",
        "startLabel": "Start ▸ solar-system",
        "stopLabel": "Stop ■ solar-system"
      }
    ]
  },
  "tips": {
    "dev": [],
    "ops": [
      {
        "kind": "openFile",
        "label": "Edit Environment Variables",
        "path": ".env",
        "detail": ".env"
      },
      {
        "kind": "command",
        "label": "Canvas regenerate",
        "command": "npm run canvas:generate",
        "detail": "scripts/generate-sprint0-canvas.mjs"
      },
      {
        "label": "Seed ▸ aleph presets",
        "command": "npm run seed:aleph",
        "kind": "command"
      },
      {
        "label": "Test ✓ smoke solar-system",
        "command": "npm run test:solar",
        "kind": "command"
      },
      {
        "label": "Test ✓ smoke lineas",
        "command": "npm run test:lineas",
        "kind": "command"
      },
      {
        "label": "Test ✓ smoke firehose-mcp",
        "command": "npm run test:firehose-mcp",
        "kind": "command"
      },
      {
        "label": "Test ✓ player-ui-debug smoke",
        "command": "npm run test:player-debug",
        "kind": "command"
      },
      {
        "label": "Test ✓ e2e catalog demo",
        "command": "npm run e2e",
        "kind": "command"
      },
      {
        "label": "Test ✓ e2e deck demo",
        "command": "npm run e2e:deck",
        "kind": "command"
      },
      {
        "label": "Test ✓ e2e tablero aleph",
        "command": "npm run e2e:tablero",
        "kind": "command"
      },
      {
        "label": "Test ✓ e2e view-ui",
        "command": "npm run e2e:view",
        "kind": "command"
      },
      {
        "label": "Test ✓ e2e firehose",
        "command": "npm run e2e:firehose",
        "kind": "command"
      },
      {
        "label": "Test ✓ e2e firehose-links",
        "command": "npm run e2e:firehose-links",
        "kind": "command"
      },
      {
        "label": "lint:env",
        "command": "npm run lint:env",
        "kind": "command"
      },
      {
        "label": "env:sync-mcp",
        "command": "npm run env:sync-mcp",
        "kind": "command"
      }
    ]
  },
  "envFile": ".env"
};

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
