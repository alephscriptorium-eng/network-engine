import { createAppConfig } from '@zeus/app-shell';
import path from 'node:path';

const shell = createAppConfig({
  appId: 'firehose',
  defaultPort: 3016,
  importMetaUrl: import.meta.url
});

export const {
  packageDir,
  getAppConfig,
  getConfig,
  setTheme
} = shell;

export function resolveDataDir(config = getConfig()) {
  return path.resolve(packageDir, '../../data');
}
