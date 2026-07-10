import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  loadZeusEnv,
  resetZeusEnvLoader,
  resetVolumesCache,
  resolveMedidorCasosPath,
  MEDIDOR_ETIQUETADOS_REL
} from '../src/index.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-env-medidor-'));

try {
  fs.mkdirSync(path.join(tempRoot, 'VOLUMES', 'DISK_02', 'LINEAS', 'espana', 'etiquetados'), {
    recursive: true
  });
  fs.writeFileSync(
    path.join(tempRoot, 'VOLUMES', 'volumes.json'),
    JSON.stringify({
      root: '.',
      volumes: {
        lineas: {
          disk: 'DISK_02',
          path: 'DISK_02/LINEAS',
          readonly: true,
          label: 'Lineas de poder'
        }
      }
    }),
    'utf8'
  );

  const prevVolumesRoot = process.env.ZEUS_VOLUMES_ROOT;
  process.env.ZEUS_VOLUMES_ROOT = path.join(tempRoot, 'VOLUMES');

  resetZeusEnvLoader();
  resetVolumesCache();
  loadZeusEnv(tempRoot);

  assert.equal(MEDIDOR_ETIQUETADOS_REL, 'espana/etiquetados');

  const casosPath = resolveMedidorCasosPath('espana');
  const expected = path.join(tempRoot, 'VOLUMES', 'DISK_02', 'LINEAS', 'espana', 'etiquetados');
  assert.equal(casosPath, path.resolve(expected));

  if (prevVolumesRoot == null) delete process.env.ZEUS_VOLUMES_ROOT;
  else process.env.ZEUS_VOLUMES_ROOT = prevVolumesRoot;

  resetZeusEnvLoader();
  resetVolumesCache();

  console.log('env-medidor-path: OK');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
