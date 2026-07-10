import { createAppConfig } from '@zeus/app-shell';
import path from 'node:path';

const shell = createAppConfig({
  appId: 'view',
  defaultPort: 3015,
  importMetaUrl: import.meta.url
});

export const {
  packageDir,
  getAppConfig,
  getConfig,
  setTheme,
  resolveBasePath,
  getViewersConfig
} = shell;

export function resolveDataDir(config = getConfig()) {
  return path.resolve(packageDir, '../../data');
}
