import { createAppConfig } from '@zeus/app-shell';

export const {
  packageDir,
  getAppConfig,
  getConfig,
  setTheme,
  resolveDataDir
} = createAppConfig({
  appId: 'player',
  defaultPort: 3013,
  importMetaUrl: import.meta.url
});
