import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveRuntimeConfig } from '../src/create-app-config.mjs';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-shell-runtime-'));
const configPath = path.join(tempDir, 'config.json');

fs.writeFileSync(
  configPath,
  JSON.stringify(
    {
      theme: { current: 'Black-White-MCP' },
      server: { port: 3012, host: 'localhost' },
      discovery: { urls: ['http://localhost:4101'], timeoutMs: 2000 },
      presets: { dataDir: '../../data' }
    },
    null,
    2
  )
);

const prevPort = process.env.ZEUS_PORT_EDITOR;
process.env.ZEUS_PORT_EDITOR = '4012';

try {
  const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const runtime = resolveRuntimeConfig(fileConfig, {
    appId: 'editor',
    packageDir: tempDir,
    appBase: { port: 3012, presets: { dataDir: '../../data' } },
    defaultPort: 3012
  });

  assert.equal(runtime.server.port, 4012, '.env port overrides stale config.json');
  assert.ok(runtime.discovery.urls.length > 1, 'discovery URLs derived from env defaults');
  assert.ok(!runtime.discovery.urls.every((u) => u === 'http://localhost:4101'), 'stale discovery.urls replaced');

  console.log('runtime-config: OK');
} finally {
  if (prevPort == null) delete process.env.ZEUS_PORT_EDITOR;
  else process.env.ZEUS_PORT_EDITOR = prevPort;
  fs.rmSync(tempDir, { recursive: true, force: true });
}
